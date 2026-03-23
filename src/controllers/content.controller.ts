import { Elysia, t } from 'elysia'
import { requireAuth } from '../../lib/middleware/requireAuth'

export const contentController = (app: Elysia) =>
    app
        .use(requireAuth) // protected route, everything below is protected
        .get('/content', () => {
            return (`<p>Welcome to /content</p>`)
        })