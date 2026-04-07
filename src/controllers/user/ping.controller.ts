import { Elysia } from 'elysia'

/** GET / - ping for uptime / connectivity checks */
export const pingController = new Elysia().get('/', () => ({
    ok: true
}))
