import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseholdAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves which household a request operates on and verifies the user
   * belongs to it. Most users belong to a single household, so `householdId`
   * is optional and defaults to the user's (oldest) membership.
   */
  async getMembership(userId: string, householdId?: string) {
    if (householdId) {
      const membership = await this.prisma.householdMember.findUnique({
        where: { householdId_userId: { householdId, userId } },
      });
      if (!membership) {
        throw new ForbiddenException('No perteneces a este hogar');
      }
      return membership;
    }

    const membership = await this.prisma.householdMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });
    if (!membership) {
      throw new NotFoundException('No perteneces a ningún hogar');
    }
    return membership;
  }
}
