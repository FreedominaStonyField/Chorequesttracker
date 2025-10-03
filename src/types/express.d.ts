import type { User } from '../models/types.js';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: User;
    }
  }
}
export {};
