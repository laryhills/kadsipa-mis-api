import { IsUUID, IsNotEmpty } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  @IsNotEmpty()
  roleId: string;
}
