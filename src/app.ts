import { Elysia, type Context } from 'elysia'
import { userController } from './controllers/user/user.controller'
import { contentController as feedController } from './controllers/user/feed.controller'
import { contentController } from './controllers/user/content.controller'
import swagger from '@elysiajs/swagger'
import { adminController } from './controllers/admin/admin.controller'
import { testController } from './controllers/test/test.controller'
import { auth } from '../lib/auth/auth'
import { cors } from '@elysiajs/cors'

const AUTH_ROUTE = '/auth/*'

const betterAuthView = (context: Context) => {
    const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET']

    if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
        return auth.handler(context.request)
    } else {
        context.set.status = 405
    }
}

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
    .group('/api', (app) =>
        app
            .all(AUTH_ROUTE, betterAuthView)
            .use(userController)
            .use(feedController)
            .use(contentController)
            .use(adminController)
            .use(testController)
    )
