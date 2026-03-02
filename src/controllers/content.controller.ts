import { Elysia, t } from 'elysia'

export const contentController = (app: Elysia) =>
    app
        .get('/content', () => {
            return (`<p>Welcome to /content</p>`)
        })