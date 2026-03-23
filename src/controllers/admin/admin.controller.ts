import { Elysia, t } from 'elysia'
import { checkPermission } from '../../../lib/middleware/requirePermission'

export const adminController = (app: Elysia) =>
    app.guard(
        { beforeHandle: checkPermission('report', ['delete']) },
        (app) => app
            .get('/admin', () => {
                return '<p>Welcome to /admin</p>'
            })
    )