import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { RegisterDto, LoginDto } from './dto/auth.schemas';

const ACCESS_TOKEN_TTL_SECONDS = Number(
  process.env.JWT_ACCESS_TOKEN_TTL ?? 900,
);
const REFRESH_TOKEN_TTL_DAYS = Number(
  process.env.JWT_REFRESH_TOKEN_TTL_DAYS ?? 30,
);

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    if (dto.householdId) {
      const household = await this.prisma.household.findUnique({
        where: { id: dto.householdId },
      });
      if (!household) {
        throw new NotFoundException('El hogar indicado no existe');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email: dto.email, passwordHash, name: dto.name },
      });

      const householdId =
        dto.householdId ??
        (
          await tx.household.create({
            data: { name: dto.householdName ?? `Hogar de ${dto.name}` },
          })
        ).id;

      await tx.householdMember.create({
        data: {
          userId: createdUser.id,
          householdId,
          role: dto.householdId ? 'MEMBER' : 'ADMIN',
        },
      });

      await tx.auditLog.create({
        data: {
          householdId,
          userId: createdUser.id,
          action: 'auth.register',
          entityType: 'User',
          entityId: createdUser.id,
        },
      });

      return createdUser;
    });

    const tokens = await this.issueTokenPair(user.id, user.email);
    return { user: this.toPublicUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { memberships: true },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const tokens = await this.issueTokenPair(user.id, user.email);

    const primaryHouseholdId = user.memberships[0]?.householdId;
    if (primaryHouseholdId) {
      await this.prisma.auditLog.create({
        data: {
          householdId: primaryHouseholdId,
          userId: user.id,
          action: 'auth.login',
          entityType: 'User',
          entityId: user.id,
        },
      });
    }

    return { user: this.toPublicUser(user), ...tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const { id, secret } = this.parseRefreshToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { id } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const providedHash = Buffer.from(hashRefreshSecret(secret));
    const storedHash = Buffer.from(stored.tokenHash);
    if (
      providedHash.length !== storedHash.length ||
      !timingSafeEqual(providedHash, storedHash)
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: stored.userId },
    });

    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokenPair(user.id, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    const { id } = this.parseRefreshToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { memberships: { include: { household: true } } },
    });
    return this.toPublicUser(user, user.memberships);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    );

    const secret = randomBytes(32).toString('hex');
    const refreshRow = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshSecret(secret),
        expiresAt: new Date(
          Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    return { accessToken, refreshToken: `${refreshRow.id}.${secret}` };
  }

  private parseRefreshToken(token: string): { id: string; secret: string } {
    const [id, secret] = token.split('.');
    if (!id || !secret) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    return { id, secret };
  }

  private toPublicUser(
    user: { id: string; email: string; name: string },
    memberships?: Array<{
      role: string;
      household: { id: string; name: string };
    }>,
  ) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      memberships: memberships?.map((m) => ({
        householdId: m.household.id,
        householdName: m.household.name,
        role: m.role,
      })),
    };
  }
}
