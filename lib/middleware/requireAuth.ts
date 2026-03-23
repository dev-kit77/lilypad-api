import { Elysia } from 'elysia'
import { sessionMiddleware } from '../middleware/session'

export const requireAuth = new Elysia()
    .use(sessionMiddleware)
    .onBeforeHandle({ as: 'global' }, ({ session, set }) => {
        if (!session) {
            set.status = 401
            return { error: 'Unauthorized' }
        }
    })
