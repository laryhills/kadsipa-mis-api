import { OmitType } from '@nestjs/mapped-types';
import { QueryActivityLogDto } from './query-activity-log.dto';

/** Same as {@link QueryActivityLogDto} but `user_id` is set from the JWT, not the query string. */
export class QueryMyActivityLogDto extends OmitType(QueryActivityLogDto, [
  'user_id',
] as const) {}
