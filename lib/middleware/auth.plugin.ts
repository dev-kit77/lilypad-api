import { Elysia } from 'elysia'
import { auth } from '../auth'

export const authPlugin = new Elysia({ name: 'better-auth' })
    .macro({
        auth(value: true | string) {
            return {
                async resolve({ status, request: { headers } }) {
                    const session = await auth.api.getSession({ headers })
                    if (!session) {
                        return status(401)
                    }

                    if (typeof value === 'string' && session.user.role !== value) {
                        return status(403)
                    }
                    
                    return {
                        user: session.user,
                        session: session.session,
                    }
                }
            }
        }
    })
