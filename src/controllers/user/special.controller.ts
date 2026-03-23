import { Elysia, t } from 'elysia'

export const specialController = (app: Elysia) =>
    app
        // add here other control policies when ready
        .get('/special', () => {
            return (`<p>Welcome to /special</p>`)
        })