import { Elysia, type Context } from 'elysia'
import { auth } from '../../lib/auth'

const betterAuthView = (context: Context) => {
  const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET']

  if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
    return auth.handler(context.request)
  } else {
    context.set.status = 405
  }
}

export const authController = (app: Elysia) => app.all('/api/auth/*', betterAuthView)