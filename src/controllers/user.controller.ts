import { Elysia, t } from 'elysia'
import { requireAuth } from '../../lib/middleware/requireAuth'

export const userController = (app: Elysia) =>
    app
        .use(requireAuth) // protected route, everything below is protected
        .get('/user', () => {
            return (`<p>Welcome to /user</p>`)
        })