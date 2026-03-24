import { Elysia } from 'elysia'
import { prisma } from '../../../lib/prisma'
import { authPlugin } from '../../../lib/middleware/auth.plugin'
import { postCreateBody, postCreateResponse } from '../../models/controllers/content.models'

export const contentController = new Elysia()
    .use(authPlugin)
    .post('/content/post', async ({ user, body, set }) => {
        console.log(`Executed POST /content/post`)
        try {
            const { lat, lon } = body.locality

            let location = await prisma.location.findFirst({
                where: { lat, long: lon },
            })

            if (!location) {
                location = await prisma.location.create({
                    data: { lat, long: lon },
                })
            }

            await prisma.post.create({
                data: {
                    userID: user.id,
                    content: body.content,
                    locationID: location.CUID,
                },
            })

            return { status: 'OK' }
        } catch (e) {
            set.status = 400
            return { error: 'INVALID_FIELD' }
        }
    }, {
        auth: true,
        body: postCreateBody,
        response: postCreateResponse,
    })
