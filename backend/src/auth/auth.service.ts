import { createHash, randomBytes } from 'node:crypto';
import {
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
import type { AuthUser } from '../common/types/auth-user.js';
import type { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Only the hash is persisted, so a DB leak cannot mint sessions. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  /** Resolved once so login against a missing user costs the same bcrypt time. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
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

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(normalizeEmail(dto.email));
    const passwordHash = user?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.issueSession(user);
  }

  /** Rotate-on-use: the presented token is revoked and a fresh pair is
   * issued, so a stolen refresh token stops working after the first replay
   * and every refresh bounds the access-token lifetime. */
  async refreshSession(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing session token');
    }
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueSession(stored.user);
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

  private async issueSession(user: User): Promise<AuthResult> {
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
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions as AuthUser['permissions'],
    };
    return { accessToken, refreshToken, user: authUser };
  }
}
