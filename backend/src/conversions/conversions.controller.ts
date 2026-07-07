import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createConversionSchema,
  listConversionQuerySchema,
} from './dto/conversion.schemas';
import type {
  CreateConversionDto,
  ListConversionQuery,
} from './dto/conversion.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload';

@UseGuards(JwtAuthGuard)
@Controller('conversions')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @HttpCode(201)
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createConversionSchema))
    dto: CreateConversionDto,
  ) {
    return this.conversionsService.create(user.sub, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listConversionQuerySchema))
    query: ListConversionQuery,
  ) {
    return this.conversionsService.findAll(user.sub, query);
  }

  @Get('balance/:incomeId')
  getBalance(
    @CurrentUser() user: JwtPayload,
    @Param('incomeId') incomeId: string,
  ) {
    return this.conversionsService.getBalance(user.sub, incomeId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.conversionsService.findOne(user.sub, id);
  }
}
