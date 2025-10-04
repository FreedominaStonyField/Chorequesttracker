export interface RequestContext {
  method: string
  path: string
  headers: Record<string, string | undefined>
  body?: unknown
  locals: Record<string, unknown>
}

export interface ResponseObject {
  status: number
  body?: unknown
}

export type Handler = (ctx: RequestContext) => Promise<ResponseObject> | ResponseObject

export type Next = () => Promise<ResponseObject>

export type Middleware = (ctx: RequestContext, next: Next) => Promise<ResponseObject>

