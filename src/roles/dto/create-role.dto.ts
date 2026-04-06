import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { RolePermissions } from '../entities/role.entity';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsNotEmpty()
  permissions: RolePermissions;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
