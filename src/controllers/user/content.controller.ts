import { Elysia } from 'elysia'
import { authPlugin } from '../../../lib/middleware/auth.plugin'

export const contentController = new Elysia()
    .use(authPlugin)
    .get('/content', () => {
        console.log(`Executed GET /content`)
        return '<p>Welcome to /content</p>'
    }, {
        auth: true,
    })
