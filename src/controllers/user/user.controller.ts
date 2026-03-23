import { Elysia } from 'elysia'
import { checkPermission } from '../../../lib/middleware/requirePermission'

export const userController = (app: Elysia) =>
    app.guard(
        { beforeHandle: checkPermission('post', ['create']) },
        (app) => app
            .get('/user', () => {
                return '<p>Welcome to /user</p>'
            })
    )