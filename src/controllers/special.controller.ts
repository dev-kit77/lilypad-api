import { Elysia, t } from 'elysia'

export const specialController = (app: Elysia) =>
    app
        .get('/special', () => {
            return (`<p>Welcome to /special</p>`)
        })