import { Elysia } from 'elysia'
import { sessionMiddleware } from '../lib/middleware/session'
import { authController } from './controllers/user/auth.controller'
import { userController } from './controllers/user/user.controller'
import { contentController } from './controllers/user/content.controller'
import swagger from '@elysiajs/swagger'
import { adminController } from './controllers/admin/admin.controller'

const PORT = process.env.PORT || 3000

export const app = new Elysia()
  .use(swagger())
  .use(sessionMiddleware)
  .use(authController)
  .group('/api', (app) =>
    app
      .use(userController)
      .use(contentController)
      .use(adminController)
  )
  .listen(PORT)
  
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`)