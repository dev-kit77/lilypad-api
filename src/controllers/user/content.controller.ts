import { Elysia } from 'elysia'
import { checkAuth } from '../../../lib/middleware/requireAuth'

export const contentController = (app: Elysia) =>
    app.guard(
        { beforeHandle: checkAuth() },
        (app) => app
            .get('/content', () => {
                return '<p>Welcome to /content</p>'
            })
    )