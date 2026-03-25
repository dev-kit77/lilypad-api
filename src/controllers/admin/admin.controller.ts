import { Elysia } from 'elysia'
import { authPlugin } from '../../../lib/auth/auth.plugin'

export const adminController = new Elysia()
    .use(authPlugin)
    .get('/admin', () => {
        console.log(`Executed GET /admin`)
        return '<p>Welcome to /admin</p>'
    }, {
        auth: 'admin',
    })
