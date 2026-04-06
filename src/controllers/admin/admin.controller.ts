import { Elysia } from 'elysia'
import { authPlugin } from '../../../lib/auth/auth.plugin'
import { prisma } from '../../../lib/prisma'
import { userBanBody, userBanResponse } from '../../models/controllers/admin.models'

export const adminController = new Elysia()
    // This controller only lets in requests from users
    // with role == 'admin'
    .use(authPlugin)
    .put(
        '/user/:userId',
        async ({ params, body, set }) => {
            console.log(`Executed PUT /user/${params.userId}`)
            const NUMBER_MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000
            try {
                const targetUser = await prisma.user.findUnique({
                    where: { id: params.userId },
                })

                if (!targetUser) {
                    set.status = 404
                    return { error: 'INVALID_USER' }
                }

                let banExpires: Date | null = null
                if (body.active && body.lengthOfBanInDays) {
                    banExpires = new Date(Date.now() + body.lengthOfBanInDays * NUMBER_MILLISECONDS_IN_A_DAY)
                }

                await prisma.user.update({
                    where: { id: params.userId },
                    data: {
                        banned: body.active,
                        banExpires,
                    },
                })

                return { status: 'OK' }
            } catch (e) {
                set.status = 400
                return { error: 'INVALID_FIELD' }
            }
        },
        {
            auth: 'admin',
            body: userBanBody,
            response: userBanResponse,
        },
    )
