import { Elysia } from 'elysia'
import { sessionMiddleware } from '../lib/middleware/session'
import { authController } from './controllers/user/auth.controller'
import { userController } from './controllers/user/user.controller'
import { contentController } from './controllers/user/content.controller'
import swagger from '@elysiajs/swagger'
import { adminController } from './controllers/admin/admin.controller'

// TODO: Remove once deployed
import { cors } from '@elysiajs/cors'

const PORT = process.env.PORT || 3000

export const app = new Elysia()
    .use(cors())
    .use(swagger())
    .onError(({ code, error, set }) => {
        if (code === 'VALIDATION') {
            set.status = 400
            return {
                message: 'Validation failed',
                fields: error.all.map(e => ({
                    field: e.path.replace('/', ''),
                    message: e.message
                }))
            }
        }
    })
    .use(sessionMiddleware)
    .group('/api', (app) =>
        app
            .use(authController)
            .use(userController)
            .use(contentController)
            .use(adminController)
        )
    .listen(PORT)
  
console.log(`🦊 Elysia is running at ${app.server?.hostname}:${PORT}`)