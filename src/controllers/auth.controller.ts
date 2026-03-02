import { Elysia, t } from 'elysia'

export const authController = (app: Elysia) =>
    app
        .get('/auth', () => {
            return (`<p>Welcome to /auth</p>`)
        })