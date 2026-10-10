import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import {
  REFRESH_TOKEN_TTL_SECONDS,
} from '../common/constants/auth-cookies.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { OAuthProvider } from '../generated/prisma/client.js';
import type { AuthUser } from '../common/types/auth-user.js';
import type { User } from '../generated/prisma/client.js';
import { MailService } from '../payments/mail.service.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { VerifyRegisterDto } from './dto/register.dto.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

/** Both halves ride to the client as httpOnly cookies (Set-Cookie on the
 * auth endpoints) — the response body only carries the profile. */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;
/** Claim challenges (M-3): how long the mailed code stays valid and how
 * many wrong entries it tolerates before it is dead (re-register to get
 * a fresh one). 6 digits × 5 attempts × 15 min makes online guessing
 * pointless; the verify endpoint additionally rate-limits per IP. */
const CLAIM_TTL_MS = 15 * 60_000;
const MAX_CLAIM_ATTEMPTS = 5;
/** Uniform failure message for every verify outcome — the endpoint must
 * not distinguish wrong code / expired / exhausted / unknown email. */
const VERIFY_FAILED = 'Код недействителен или истёк';

/** The single email normalization of the auth system (trim + lowercase).
 * OAuth resolution reuses it — no dots/plus-suffix stripping, that is not
 * guaranteed by any provider. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Only the hash is persisted, so a DB leak cannot mint sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isUniqueViolation(cause: unknown): boolean {
  return (
    cause instanceof Prisma.PrismaClientKnownRequestError &&
    cause.code === 'P2002'
  );
}

@Injectable()
export class AuthService {
  /** Resolved once so login against a missing user costs the same bcrypt time. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<AuthResult | { verificationRequired: true }> {
    const email = normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      // A passwordless account was auto-created by guest checkout —
      // registering with the same email CLAIMS it (purchases follow).
      // Claim requires a code sent to the mailbox (M-3): knowing the
      // email must not hand over the account and its attached orders.
      if (existing.passwordHash === null) {
        return this.createClaimChallenge(existing, dto);
      }
      throw new ConflictException({
        message: 'Email is already registered',
        errors: { email: ['Email is already registered'] },
      });
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email,
      passwordHash,
      name: dto.name ?? null,
    });
    return this.issueSession(user);
  }

  /** Second step of the claim: the mailed code proves the mailbox. The
   * password stays untouched until this succeeds — the atomic sequence
   * is consume-challenge-then-set-password inside one transaction. */
  async verifyRegister(dto: VerifyRegisterDto): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const user = await this.usersService.findByEmail(email);
    if (!user || user.passwordHash !== null) {
      throw new BadRequestException(VERIFY_FAILED);
    }
    const challenge = await this.prisma.registerChallenge.findFirst({
      where: { userId: user.id, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw new BadRequestException(VERIFY_FAILED);
    }
    await this.prisma.$transaction(async (tx) => {
      // Gate + burn one attempt in ONE statement: a 6th wrong entry, an
      // expired or an already-consumed challenge all fail the same way.
      const gate = await tx.registerChallenge.updateMany({
        where: {
          id: challenge.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_CLAIM_ATTEMPTS },
        },
        data: { attempts: { increment: 1 } },
      });
      if (gate.count === 0) {
        throw new BadRequestException(VERIFY_FAILED);
      }
      if (challenge.codeHash !== hashToken(dto.code)) {
        // Wrong code: the attempt burned above stands, the challenge
        // itself survives until attempts run out or it expires.
        throw new BadRequestException(VERIFY_FAILED);
      }
      // Single-statement consume: of two concurrent correct codes
      // exactly one sees count 1 — the loser rolls the whole
      // transaction back (no password, no session).
      const consumed = await tx.registerChallenge.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count === 0) {
        throw new BadRequestException(VERIFY_FAILED);
      }
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash: challenge.passwordHash,
          name: challenge.name ?? user.name,
        },
      });
    });
    return this.issueSession(user);
  }

  /** Challenge creation for a passwordless claim: replaces any previous
   * unconsumed challenge, mails the fresh code, issues NOTHING — the
   * password chosen at register time is held in the challenge row only. */
  private async createClaimChallenge(
    user: User,
    dto: RegisterDto,
  ): Promise<{ verificationRequired: true }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.$transaction(async (tx) => {
      await tx.registerChallenge.deleteMany({ where: { userId: user.id } });
      await tx.registerChallenge.create({
        data: {
          userId: user.id,
          email: user.email,
          codeHash: hashToken(code),
          passwordHash,
          name: dto.name ?? user.name,
          expiresAt: new Date(Date.now() + CLAIM_TTL_MS),
        },
      });
    });
    await this.mail.queue({
      to: user.email,
      subject: 'GPort — код подтверждения регистрации',
      body:
        `Код подтверждения: ${code}\n\n` +
        'Действителен 15 минут. Если вы не регистрировались в GPort — просто игнорируйте это письмо.',
    });
    return { verificationRequired: true };
  }

  /** OAuth login resolution (M-OAUTH-2). The canonical identity is the
   * (provider, providerUserId) pair — email matching happens ONLY when
   * no identity exists, and an email match NEVER attaches an identity:
   * v1 policy defers existing-account linking to M-OAUTH-4's mailbox
   * verification, for password and passwordless accounts alike. */
  async oauthLogin(
    provider: OAuthProvider,
    providerUserId: string,
    rawEmail: string | null,
  ): Promise<AuthResult | { verificationRequired: true; linkChallengeId?: string }> {
    const identity = await this.prisma.oAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      include: { user: true },
    });
    if (identity) {
      // Case A: the identity is canonical — a changed provider email
      // changes nothing here.
      return this.issueSession(identity.user);
    }
    const email = rawEmail ? normalizeEmail(rawEmail) : null;
    if (!email) {
      throw new BadRequestException(
        'Провайдер не передал email — войдите по паролю или укажите email',
      );
    }
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      // Case D: a GPort user with this email already exists (password or
      // passwordless guest) — no auto-link, no session. The mailbox code
      // (M-OAUTH-4) is the only way to attach the identity.
      const { linkChallengeId } = await this.createLinkChallenge(
        existing,
        provider,
        providerUserId,
        email,
      );
      return { verificationRequired: true, linkChallengeId };
    }
    try {
      // Case C: brand-new buyer — User and identity in one transaction
      // (a half-created OAuth account must not exist).
      return this.issueSession(
        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email, passwordHash: null },
          });
          await tx.oAuthIdentity.create({
            data: {
              userId: user.id,
              provider,
              providerUserId,
              emailAtLink: email,
            },
          });
          return user;
        }),
      );
    } catch (cause) {
      if (!isUniqueViolation(cause)) {
        throw cause;
      }
      // Concurrent callback (or a password registration) won the race:
      // re-read and continue as that user — never a second User row.
      const winner = await this.prisma.oAuthIdentity.findUnique({
        where: { provider_providerUserId: { provider, providerUserId } },
        include: { user: true },
      });
      if (winner) {
        return this.issueSession(winner.user);
      }
      // The email row won instead: attaching the identity to it is
      // auto-link — forbidden in v1.
      return { verificationRequired: true };
    }
  }

  /** Link challenge (M-OAUTH-4): the four-way binding comes from the
   * verified OAuth callback, never from the frontend. Re-requesting the
   * same provider replaces the previous challenge — the old code dies. */
  private async createLinkChallenge(
    user: User,
    provider: OAuthProvider,
    providerUserId: string,
    email: string,
  ): Promise<{ linkChallengeId: string }> {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const challenge = await this.prisma.$transaction(async (tx) => {
      await tx.oAuthLinkChallenge.deleteMany({
        where: { userId: user.id, provider },
      });
      return tx.oAuthLinkChallenge.create({
        data: {
          userId: user.id,
          provider,
          providerUserId,
          email,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + CLAIM_TTL_MS),
        },
      });
    });
    await this.mail.queue({
      to: user.email,
      subject: 'GPort — код подтверждения входа',
      body:
        `Код подтверждения: ${code}\n\n` +
        `Действителен 15 минут. Подтверждает привязку способа входа к аккаунту ${user.email}. ` +
        'Если вы не входили в GPort — просто игнорируйте это письмо.',
    });
    return { linkChallengeId: challenge.id };
  }

  /** Completes the link: the mailed code proves the mailbox. The identity
   * is created with the CHALLENGE's bindings — the request may only carry
   * the opaque challenge id and the code. Atomic: consume + create in one
   * transaction; of two concurrent correct codes exactly one wins. */
  async verifyLink(challengeId: string, code: string): Promise<AuthResult> {
    const challenge = await this.prisma.oAuthLinkChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new BadRequestException(VERIFY_FAILED);
    }
    const user = await this.usersService.findById(challenge.userId);
    if (!user) {
      throw new BadRequestException(VERIFY_FAILED);
    }
    // Identity collision BEFORE consuming: a (provider, providerUserId)
    // already bound to ANOTHER user must never be re-linked — and the
    // failed attempt must not even burn a challenge attempt.
    const identity = await this.prisma.oAuthIdentity.findUnique({
      where: {
        provider_providerUserId: {
          provider: challenge.provider,
          providerUserId: challenge.providerUserId,
        },
      },
    });
    if (identity && identity.userId !== challenge.userId) {
      throw new BadRequestException('Этот способ входа уже привязан');
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        // Gate + burn one attempt in ONE statement: expired, consumed or
        // attempt-exhausted challenges all fail the same way.
        const gate = await tx.oAuthLinkChallenge.updateMany({
          where: {
            id: challenge.id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: MAX_CLAIM_ATTEMPTS },
          },
          data: { attempts: { increment: 1 } },
        });
        if (gate.count === 0) {
          throw new BadRequestException(VERIFY_FAILED);
        }
        if (challenge.codeHash !== hashToken(code)) {
          throw new BadRequestException(VERIFY_FAILED);
        }
        // Single-statement consume: of two concurrent correct codes
        // exactly one wins — the loser rolls everything back.
        const consumed = await tx.oAuthLinkChallenge.updateMany({
          where: { id: challenge.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });
        if (consumed.count === 0) {
          throw new BadRequestException(VERIFY_FAILED);
        }
        if (!identity) {
          await tx.oAuthIdentity.create({
            data: {
              userId: challenge.userId,
              provider: challenge.provider,
              providerUserId: challenge.providerUserId,
              emailAtLink: challenge.email,
            },
          });
        }
      });
    } catch (cause) {
      if (!isUniqueViolation(cause)) {
        throw cause;
      }
      // A concurrent verify won the identity create: same user → the
      // link already exists (idempotent success); another user must
      // never happen through here — reject.
      const winner = await this.prisma.oAuthIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: challenge.provider,
            providerUserId: challenge.providerUserId,
          },
        },
      });
      if (!winner || winner.userId !== challenge.userId) {
        throw new BadRequestException('Этот способ входа уже привязан');
      }
    }
    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(normalizeEmail(dto.email));
    const passwordHash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    await this.purgeExpiredTokens();
    return this.issueSession(user);
  }

  /** Rotate-on-use within a token family: the presented token is revoked
   * and a fresh pair (same familyId) is issued. Presenting a REVOKED token
   * is the signature of a stolen cookie — the whole family is revoked so
   * the thief and the legitimate holder are both forced to re-login. */
  async refreshSession(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing session token');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (stored?.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Session expired or revoked');
    }
    if (!stored || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(stored.user, stored.familyId);
  }

  async revokeSession(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= bcrypt.hash('timing-equalizer', BCRYPT_ROUNDS);
    return this.dummyHash;
  }

  /** Opportunistic TTL hygiene (runs on login): rows past their expiry
   * are dead weight — no session can ever resume them. */
  private purgeExpiredTokens(): Promise<unknown> {
    return this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  private async issueSession(
    user: User,
    familyId?: string,
  ): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        familyId: familyId ?? randomUUID(),
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      permissions: user.permissions as AuthUser['permissions'],
    };
    return { accessToken, refreshToken, user: authUser };
  }

  /** Self-service profile fields (name, avatar). Returns the fresh view.
   * Empty strings clear the field; undefined leaves it unchanged. */
  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name === '' ? null : dto.name,
        avatarUrl: dto.avatarUrl === '' ? null : dto.avatarUrl,
      },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      permissions: user.permissions as AuthUser['permissions'],
    };
  }

  /** Verifies the current password, replaces the hash and revokes every
   * other session (the calling one stays alive — no re-login needed). */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentRefreshToken: string | undefined,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user || user.passwordHash === null) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentRefreshToken
          ? { tokenHash: { not: hashToken(currentRefreshToken) } }
          : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
}
