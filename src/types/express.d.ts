import type { AccessTokenPayload } from '../auth/types/jwt-payload.type.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}
