import { IsEnum, IsOptional } from 'class-validator';
import { SortOrderQueryDto } from '../../common/dto/sort-query.dto';

export enum UserListSortBy {
  name = 'name',
  role = 'role',
  status = 'status',
  lastActive = 'lastActive',
}

export class QueryUsersDto extends SortOrderQueryDto {
  @IsOptional()
  @IsEnum(UserListSortBy)
  sortBy?: UserListSortBy;
}
