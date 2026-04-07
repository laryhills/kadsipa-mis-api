import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { BudgetLinesService } from './budget-lines.service';
import { CreateBudgetLineDto } from './dto/create-budget-line.dto';
import { UpdateBudgetLineDto } from './dto/update-budget-line.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('finance/budget-lines')
@UseGuards(PassportJwtGuard, RolesGuard)
export class BudgetLinesController {
  constructor(private readonly budgetLinesService: BudgetLinesService) {}

  @Post()
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBudgetLineDto: CreateBudgetLineDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const budgetLine = await this.budgetLinesService.create(
      createBudgetLineDto,
      currentUser.id,
    );
    return {
      success: true,
      message: 'Budget line created successfully',
      data: budgetLine,
    };
  }

  @Get()
  @RequirePermission('financialManagement.viewBudget')
  async findAll(@Query('fiscalYearId') fiscalYearId?: string) {
    const budgetLines = await this.budgetLinesService.findAll(fiscalYearId);
    return {
      success: true,
      data: budgetLines,
    };
  }

  @Get('summary')
  @RequirePermission('financialManagement.viewBudget')
  async getSummary() {
    const summary = await this.budgetLinesService.getSummary();
    return {
      success: true,
      data: summary,
    };
  }

  @Get(':id')
  @RequirePermission('financialManagement.viewBudget')
  async findOne(@Param('id') id: string) {
    const budgetLine = await this.budgetLinesService.findOne(id);
    return {
      success: true,
      data: budgetLine,
    };
  }

  @Get(':id/balance')
  @RequirePermission('financialManagement.viewBudget')
  async getBalance(@Param('id') id: string) {
    const balance = await this.budgetLinesService.getBalance(id);
    return {
      success: true,
      data: balance,
    };
  }

  @Patch(':id')
  @RequirePermission('financialManagement.manageBudget')
  async update(
    @Param('id') id: string,
    @Body() updateBudgetLineDto: UpdateBudgetLineDto,
  ) {
    const budgetLine = await this.budgetLinesService.update(
      id,
      updateBudgetLineDto,
    );
    return {
      success: true,
      message: 'Budget line updated successfully',
      data: budgetLine,
    };
  }

  @Delete(':id')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.budgetLinesService.remove(id);
  }
}
