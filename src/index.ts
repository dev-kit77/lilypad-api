import { Elysia } from 'elysia'
import { sessionMiddleware } from '../lib/middleware/session'
import { authController } from './controllers/auth.controller'
import { userController } from './controllers/user.controller'
import { contentController } from './controllers/content.controller'
import swagger from '@elysiajs/swagger'

const PORT = process.env.PORT || 3000

export const app = new Elysia()
  .use(swagger())
  .use(sessionMiddleware)
  .use(authController)
  .group('/api', (app) =>
    app
      .use(userController)
      .use(contentController)
  )
  .listen(PORT)
  
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`)