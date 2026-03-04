import { Elysia, t } from 'elysia'
import { REGISTRATION_FAILED_MESSAGE, TOKEN_GENERATION_FAILED } from '../models/error.responses'
import { getToken } from '../service/auth.service'

const authRegisterBody = t.Object({
    username: t.String(),
    email: t.String({ format: 'email' }),
    hash: t.String(),
    userData: t.Object({}, { additionalProperties: true })
})

export const authController = (app: Elysia) =>
    app
        // global validation handling
        .onError(({ code, error, set }) => {
            if (code === 'VALIDATION') {
                set.status = 400
                return {
                    message: 'Validation failed',
                    fields: error.all.map(e => ({
                        field: e.path.replace('/', ''),
                        message: e.message
                    }))
                }
            }
        })
        .get('/auth', ({ set }) => {
            // change once the logic to generate token
            // is there
            const token = getToken()
            const success = true

            if (!success) {
                set.status = 403
                return { error: TOKEN_GENERATION_FAILED }
            }
            return { token: token }
        })
        .post('/auth', ({ body, set }) => {
            // whatever we need to do, then
            const success = true

            if (!success) {
                set.status = 403
                return { error: REGISTRATION_FAILED_MESSAGE }
            }

            return { token: getToken() }
        }, {
            body: authRegisterBody
        })