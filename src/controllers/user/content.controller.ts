import { Elysia } from 'elysia'
import { checkPermission } from '../../../lib/middleware/requirePermission'

export const contentController = (app: Elysia) =>
    app.guard(
        { beforeHandle: checkPermission('content', ['view']) },
        (app) => app
            .get('/content', () => {
                return '<p>Welcome to /content</p>'
            })
    )