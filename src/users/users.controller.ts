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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { ResetPendingInviteDto } from './dto/reset-pending-invite.dto';
import { createdResponse, successResponse } from '../common';
import { PassportJwtGuard } from '../auth/guards/passport-jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { QueryUsersDto } from './dto/query-users.dto';
import { Audit } from '../audit/decorators/audit.decorator';
import { ActivityType } from '../audit/constants/audit-action.enum';

@Controller({ version: '1', path: 'users' })
@UseGuards(PassportJwtGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @RequirePermission('userManagement.manageRoles')
  @Audit(ActivityType.USER, 'User invited')
  async inviteUser(
    @Body() inviteUserDto: InviteUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const result = await this.usersService.inviteUser(
      inviteUserDto,
      currentUser.id,
    );
    return createdResponse('User invited successfully', result);
  }

  @Post()
  @RequirePermission('userManagement.viewUsers')
  @Audit(ActivityType.USER, 'User created')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return createdResponse('User created successfully', user);
  }

  @Get()
  @RequirePermission('userManagement.viewUsers')
  async findAll(@Query() query: QueryUsersDto) {
    const users = await this.usersService.findAll(query);
    return successResponse('Users fetched successfully', users);
  }

  @Post(':id/reset-invite')
  @RequirePermission('userManagement.manageRoles')
  @Audit(ActivityType.USER, 'Pending user invite reset')
  async resetPendingInvite(
    @Param('id') userId: string,
    @Body() body: ResetPendingInviteDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    await this.usersService.resetPendingUserInvite(
      userId,
      currentUser.id,
      body.personalMessage,
    );
    return successResponse(
      'A new temporary password was emailed to the user.',
      null,
    );
  }

  @Get(':id')
  @RequirePermission('userManagement.viewUsers')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOnePublicDetail(id);
    return successResponse('User fetched successfully', user);
  }

  @Patch(':id')
  @RequirePermission('userManagement.viewUsers')
  @Audit(ActivityType.USER, 'User updated')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.usersService.update(id, updateUserDto);
    return successResponse('User updated successfully', user);
  }

  @Delete(':id')
  @RequirePermission('userManagement.viewUsers')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit(ActivityType.USER, 'User removed (soft delete)')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
  }

  @Post(':id/roles')
  @RequirePermission('userManagement.manageRoles')
  @Audit(ActivityType.USER, 'User role assigned')
  async assignRole(
    @Param('id') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const userRole = await this.usersService.assignRole(
      userId,
      assignRoleDto.roleId,
      currentUser.id,
    );
    return createdResponse('Role assigned successfully', userRole);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermission('userManagement.manageRoles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audit(ActivityType.USER, 'User role removed')
  async removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
  ) {
    await this.usersService.removeRole(userId, roleId);
    return successResponse('Role removed successfully', null);
  }

  @Get(':id/roles')
  @RequirePermission('userManagement.viewUsers')
  async getUserRoles(@Param('id') userId: string) {
    const roles = await this.usersService.getUserRoles(userId);
    return successResponse('User roles fetched successfully', roles);
  }
}
