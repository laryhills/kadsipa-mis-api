import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { RoleEntity } from './entities/role.entity';
import { UserRoleEntity } from './entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RoleEntity, UserRoleEntity])],
  providers: [RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
