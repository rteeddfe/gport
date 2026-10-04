import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, type User } from '../generated/prisma/client.js';
import type { AdminPermission } from '../common/constants/admin-permissions.js';
import { PrismaService } from '../database/prisma.service.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  name?: string | null;
  role?: Role;
}

/** User row as admin API returns it — passwordHash never leaves the DB. */
export interface AdminUserView {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  permissions: AdminPermission[];
  createdAt: Date;
  updatedAt: Date;
}

/** Active session = a stored refresh token that is neither revoked nor
 * expired (revocation happens on logout/rotation/admin reset). */
export interface AdminUserSessionView {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface AdminUserDetailView extends AdminUserView {
  sessions: AdminUserSessionView[];
}

export interface PaginatedUsers {
  items: AdminUserView[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function toView(user: User): AdminUserView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions as AdminPermission[],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name ?? null,
        role: input.role,
      },
    });
  }

  async findMany(page = 1, limit = 20): Promise<PaginatedUsers> {
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return {
      items: items.map(toView),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findDetail(id: string): Promise<AdminUserDetailView> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        refreshTokens: {
          where: { revokedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          select: { id: true, createdAt: true, expiresAt: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { ...toView(user), sessions: user.refreshTokens };
  }

  /** SUPER_ADMIN-only PATCH: role (USER|ADMIN) and/or the permission set
   * (replaces the whole list). Permissions are stored even for USERs but
   * only take effect once the role is ADMIN again. */
  async updateAccess(
    id: string,
    dto: { role?: Role; permissions?: AdminPermission[] },
    actorId: string,
  ): Promise<AdminUserView> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('SUPER_ADMIN accounts cannot be modified');
    }
    if (dto.role !== undefined && id === actorId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, permissions: dto.permissions },
    });
    return toView(updated);
  }

  async remove(id: string, actorId: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('SUPER_ADMIN accounts cannot be deleted');
    }
    // Cart and refresh tokens cascade with the user; posts and reviews
    // have no author relation.
    await this.prisma.user.delete({ where: { id } });
  }

  /** Revokes every active session (refresh token) of the user — they are
   * signed out everywhere once their access token expires (≤15 min). */
  async revokeAllSessions(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.refreshToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeSession(id: string, sessionId: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new NotFoundException('Session not found or already revoked');
    }
  }
}
