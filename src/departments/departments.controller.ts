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
} from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createdResponse, successResponse } from '../common';

@Controller('finance/departments')
@UseGuards(PassportJwtGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @RequirePermission('financialManagement.manageBudget')
  async create(@Body() createDto: CreateDepartmentDto) {
    const department = await this.departmentsService.create(createDto);
    return createdResponse('Department created successfully', department);
  }

  @Get()
  @RequirePermission('financialManagement.viewBudget')
  async findAll() {
    const departments = await this.departmentsService.findAll();
    return successResponse('Departments fetched successfully', departments);
  }

  @Get('active')
  @RequirePermission('financialManagement.viewBudget')
  async findActive() {
    const departments = await this.departmentsService.findActive();
    return successResponse(
      'Active departments fetched successfully',
      departments,
    );
  }

  @Get(':id')
  @RequirePermission('financialManagement.viewBudget')
  async findOne(@Param('id') id: string) {
    const department = await this.departmentsService.findOne(id);
    return successResponse('Department fetched successfully', department);
  }

  @Patch(':id')
  @RequirePermission('financialManagement.manageBudget')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDepartmentDto,
  ) {
    const department = await this.departmentsService.update(id, updateDto);
    return successResponse('Department updated successfully', department);
  }

  @Delete(':id')
  @RequirePermission('financialManagement.manageBudget')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.departmentsService.remove(id);
  }
}
