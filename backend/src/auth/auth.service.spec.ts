import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
  };
  let jwtService: { signAsync: jest.Mock };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('login', () => {
    it('rejects when the email does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nope@orbitfinc.com',
          password: 'whatever',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the password does not match', async () => {
      const passwordHash = await argon2.hash('correct-password');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'kendri@orbitfinc.com',
        passwordHash,
        memberships: [],
      });

      await expect(
        authService.login({
          email: 'kendri@orbitfinc.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rejects a malformed refresh token', async () => {
      await expect(authService.refresh('not-a-valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a refresh token that was already revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'irrelevant',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(authService.refresh('token-1.some-secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a refresh token whose secret does not match the stored hash', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'a'.repeat(64),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(authService.refresh('token-1.wrong-secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
