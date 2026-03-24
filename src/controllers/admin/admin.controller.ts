import { Elysia, t } from 'elysia'
import { checkRole } from '../../../lib/middleware/requireAuth'

export const adminController = (app: Elysia) =>
    app.guard(
        { beforeHandle: checkRole('admin') },
        (app) => app
            .get('/admin', () => {
                return '<p>Welcome to /admin</p>'
            })
    )