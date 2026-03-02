import { Elysia, t } from 'elysia'

export const userController = (app: Elysia) =>
    app
        .get('/user', () => {
            return (`<p>Welcome to /user</p>`)
        })