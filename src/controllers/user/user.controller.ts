import { Elysia } from 'elysia'
import { userGetResponse, userUpdateBody, userUpdateResponse, userDeleteResponse } from '../../models/controllers/user.models'
import { prisma } from '../../../lib/prisma'
import { authPlugin } from '../../../lib/auth/auth.plugin'

export const userController = new Elysia()
    .use(authPlugin)
    .get('/user', async ({ user, set }) => {
        console.log(`Executed GET /user`)
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { profile: true, settings: true },
        })

        if (!dbUser) {
            set.status = 404
            return { error: 'INVALID_USER' }
        }

        return {
            userId: dbUser.id,
            username: dbUser.name,
            status: dbUser.profile?.status ?? '',
            settings: {
                dark: dbUser.settings?.dark ?? false,
                anon: dbUser.settings?.anon ?? false,
            },
        }
    }, {
        auth: true,
        response: userGetResponse,
    })
    .put('/user', async ({ user, body, set }) => {
        console.log(`Executed PUT /user`)
        try {
            if (body.username) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { name: body.username },
                })
            }

            if (body.status) {
                await prisma.userProfile.upsert({
                    where: { userID: user.id },
                    update: { status: body.status },
                    create: { userID: user.id, name: '', bio: '', status: body.status },
                })
            }

            if (body.settings) {
                await prisma.userSettings.upsert({
                    where: { userID: user.id },
                    update: body.settings,
                    create: { userID: user.id, ...body.settings },
                })
            }

            return { status: 'OK' }
        } catch (e) {
            set.status = 400
            return { error: 'INVALID_FIELD' }
        }
    }, {
        auth: true,
        body: userUpdateBody,
        response: userUpdateResponse,
    })
    .delete('/user', async ({ user, set }) => {
        console.log(`Executed DELETE /user`)
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
        })

        if (!dbUser) {
            set.status = 404
            return { error: 'INVALID_USER' }
        }

        await prisma.user.delete({
            where: { id: user.id },
        })

        return { status: 'OK' }
    }, {
        auth: true,
        response: userDeleteResponse,
    })
