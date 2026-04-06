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

@Controller('roles')
@UseGuards(PassportJwtGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission('userManagement.manageRoles')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return {
      success: true,
      message: 'Role created successfully',
      data: role,
    };
  }

  @Get()
  @RequirePermission('userManagement.viewUsers')
  async findAll() {
    const roles = await this.rolesService.findAll();
    return {
      success: true,
      data: roles,
    };
  }

  @Get(':id')
  @RequirePermission('userManagement.viewUsers')
  async findOne(@Param('id') id: string) {
    const role = await this.rolesService.findOne(id);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(':id')
  @RequirePermission('userManagement.manageRoles')
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.rolesService.update(id, updateRoleDto);
    return {
      success: true,
      message: 'Role updated successfully',
      data: role,
    };
  }

  @Patch(':id/permissions')
  @RequirePermission('userManagement.manageRoles')
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: RolePermissions,
  ) {
    const updateDto: UpdateRoleDto = { permissions };
    const role = await this.rolesService.update(id, updateDto);
    return {
      success: true,
      message: 'Role permissions updated successfully',
      data: role,
    };
  }

  @Delete(':id')
  @RequirePermission('userManagement.manageRoles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.rolesService.remove(id);
  }
}
