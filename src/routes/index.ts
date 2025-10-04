import { authMiddleware } from './middleware/auth'
import type { Handler, Middleware, RequestContext, ResponseObject } from './types'
import { registerUserRoutes } from './users'

interface RouteDefinition {
  method: string
  path: string
  handler: Handler
}

export interface HandleRequestOptions {
  method: string
  path: string
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

export class Router {
  private readonly routes: RouteDefinition[] = []
  private readonly middlewares: Middleware[] = []

  use(middleware: Middleware): void {
    this.middlewares.push(middleware)
  }

  post(path: string, handler: Handler): void {
    this.routes.push({ method: 'POST', path, handler })
  }

  async handle(options: HandleRequestOptions): Promise<ResponseObject> {
    const route = this.routes.find(
      (candidate) => candidate.method === options.method.toUpperCase() && candidate.path === options.path,
    )

    if (!route) {
      return { status: 404, body: { error: 'not_found' } }
    }

    const context: RequestContext = {
      method: options.method.toUpperCase(),
      path: options.path,
      body: options.body,
      headers: normaliseHeaders(options.headers),
      locals: {},
    }

    const dispatch = this.middlewares.reduceRight<NextDispatcher>(
      (next, middleware) => async () => middleware(context, next),
      async () => Promise.resolve(route.handler(context)),
    )

    try {
      return await dispatch()
    } catch (error) {
      return {
        status: 500,
        body: { error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  }

  register(builder: (router: Router) => void): void {
    builder(this)
  }
}

type NextDispatcher = () => Promise<ResponseObject>

export function createRouter(): Router {
  const router = new Router()
  router.use(authMiddleware)
  router.register(registerUserRoutes)
  return router
}

function normaliseHeaders(
  headers: HandleRequestOptions['headers'] = {},
): Record<string, string | undefined> {
  const normalised: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      if (value.length) {
        normalised[key.toLowerCase()] = value[value.length - 1]
      }
      continue
    }
    normalised[key.toLowerCase()] = String(value)
  }
  return normalised
}

