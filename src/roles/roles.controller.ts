import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import type { RolePermissions } from './entities/role.entity';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { createdResponse, successResponse } from '../common';
import { Audit } from '../audit/decorators/audit.decorator';
import { ActivityType } from '../audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'roles' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('userManagement.manageRoles')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return createdResponse('Role created successfully', role);
  }

  @Get()
  @RequirePermission('userManagement.viewUsers')
  async findAll() {
    const roles = await this.rolesService.findAll();
    return successResponse('Roles fetched successfully', roles);
  }

  @Get(':id')
  @RequirePermission('userManagement.viewUsers')
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return successResponse('Role fetched successfully', role);
  }

  @Patch(':id')
  @RequirePermission('userManagement.manageRoles')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return successResponse('Role updated successfully', role);
  }

  @Patch(':id/permissions')
  @RequirePermission('userManagement.manageRoles')
  @Audit(ActivityType.USER, 'Role permissions updated')
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: RolePermissions,
  ) {
    const updateDto: UpdateRoleDto = { permissions };
    const role = await this.rolesService.update(id, updateDto);
    return successResponse('Role permissions updated successfully', role);
  }

  @Delete(':id')
  @RequirePermission('userManagement.manageRoles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}
