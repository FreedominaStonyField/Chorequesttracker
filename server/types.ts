export interface AuthContext {
  actorId: string
  actorRole: 'system' | 'user'
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext
  }
}
