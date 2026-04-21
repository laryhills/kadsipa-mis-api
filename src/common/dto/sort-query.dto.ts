import { IsIn, IsOptional } from 'class-validator';

export const SORT_ORDERS = ['ASC', 'DESC'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class SortOrderQueryDto {
  @IsOptional()
  @IsIn(SORT_ORDERS)
  sortOrder?: SortOrder = 'DESC';
}
