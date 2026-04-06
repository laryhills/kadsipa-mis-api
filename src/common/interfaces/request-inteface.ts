import { Request } from 'express';

export interface RequestWithUserInterface extends Request {
  user?: {
    id: string;
    email: string;
  };
}
