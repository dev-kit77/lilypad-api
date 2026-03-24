import { Elysia } from 'elysia'
import { userGetResponse, userUpdateBody, userUpdateResponse, userDeleteResponse } from '../../models/controllers/user.models'
import { auth } from '../../../lib/auth'
import { prisma } from '../../../lib/prisma'
import { checkAuth } from '../../../lib/middleware/requireAuth'

export const userController = (app: Elysia) =>
    app.guard(
        {
            beforeHandle: checkAuth()
        },
        (app) => app
            .resolve(async ({ request }) => {
                const session = await auth.api.getSession({ headers: request.headers })
                return { session: session! }
            })
            .get('/user', async ({ session, set }) => {
                const user = await prisma.user.findUnique({
                    where: { id: session.user.id },
                    include: { profile: true, settings: true },
                })

                if (!user) {
                    set.status = 404
                    return { error: 'INVALID_USER' }
                }

                return {
                    userId: user.id,
                    username: user.name,
                    status: user.profile?.status ?? '',
                    settings: {
                        dark: user.settings?.dark ?? false,
                        anon: user.settings?.anon ?? false,
                    },
                }
            }, {
                response: userGetResponse,
            })
            .put('/user', async ({ session, body, set }) => {
                try {
                    if (body.username) {
                        await prisma.user.update({
                            where: { id: session.user.id },
                            data: { name: body.username },
                        })
                    }

                    if (body.status) {
                        await prisma.userProfile.upsert({
                            where: { userID: session.user.id },
                            update: { status: body.status },
                            create: { userID: session.user.id, name: '', bio: '', status: body.status },
                        })
                    }

                    if (body.settings) {
                        await prisma.userSettings.upsert({
                            where: { userID: session.user.id },
                            update: body.settings,
                            create: { userID: session.user.id, ...body.settings },
                        })
                    }

                    return { status: 'OK' }
                } catch (e) {
                    set.status = 400
                    return { error: 'INVALID_FIELD' }
                }
            }, {
                body: userUpdateBody,
                response: userUpdateResponse,
            })
            .delete('/user', async ({ session, set }) => {
                const user = await prisma.user.findUnique({
                    where: { id: session.user.id },
                })

                if (!user) {
                    set.status = 404
                    return { error: 'INVALID_USER' }
                }

                await prisma.user.delete({
                    where: { id: session.user.id },
                })

                return { status: 'OK' }
            }, {
                response: userDeleteResponse,
            })
    )