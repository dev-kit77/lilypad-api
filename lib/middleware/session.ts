import { Elysia } from 'elysia'
import { auth } from '../auth'

export const sessionMiddleware = new Elysia()
    .derive({ as: 'global' }, async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        return { session }
    })