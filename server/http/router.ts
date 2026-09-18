import type { RouteHandler } from './context'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface CompiledRoute {
  readonly method: HttpMethod
  readonly regex: RegExp
  readonly keys: readonly string[]
  readonly handler: RouteHandler
}

export interface RouteMatch {
  readonly handler: RouteHandler
  readonly params: Record<string, string>
}

function compilePath(path: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = []
  const pattern = path
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1))
        return '([^/]+)'
      }
      if (segment === '*') {
        return '(.*)'
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')
  return { regex: new RegExp(`^${pattern}/?$`), keys }
}

export class Router {
  private readonly routes: CompiledRoute[] = []

  add(method: HttpMethod, path: string, handler: RouteHandler): this {
    const { regex, keys } = compilePath(path)
    this.routes.push({ method, regex, keys, handler })
    return this
  }

  get(path: string, handler: RouteHandler): this {
    return this.add('GET', path, handler)
  }

  post(path: string, handler: RouteHandler): this {
    return this.add('POST', path, handler)
  }

  match(method: string, pathname: string): RouteMatch | null {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const result = route.regex.exec(pathname)
      if (!result) continue
      const params: Record<string, string> = {}
      route.keys.forEach((key, index) => {
        params[key] = decodeURIComponent(result[index + 1] ?? '')
      })
      return { handler: route.handler, params }
    }
    return null
  }
}
