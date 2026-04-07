import { Elysia } from 'elysia'
import { authPlugin } from '../../../lib/auth/auth.plugin'
import { prisma } from '../../../lib/prisma'
import { userBanBody, userBanResponse } from '../../models/controllers/admin.models'
import { contentResponse } from '../../models/controllers/content.models'

export const adminController = new Elysia()
    // This controller only lets in requests from users
    // with role == 'admin'
    .use(authPlugin)
    .get(
        '/content/:userId',
        async ({ params, set }) => {
            console.log(`Executed GET /content/${params.userId}`)
            const targetUser = await prisma.user.findUnique({
                where: { id: params.userId },
            })

            if (!targetUser) {
                set.status = 400
                return { error: 'INVALID_ID' }
            }

            const rows = await prisma.post.findMany({
                where: { userID: params.userId },
                include: {
                    user: { include: { settings: true } },
                    _count: { select: { upvotes: true, postReplies: true } },
                },
                orderBy: { time: 'desc' },
            })

            const toItem = (post: (typeof rows)[number]) => ({
                id: post.CUID,
                content: post.content,
                author: post.user.settings?.anon ? 'Anonymous' : post.user.name,
                time: post.time.toISOString(),
                upvotes: post._count.upvotes,
                replyCount: post._count.postReplies,
            })

            const rootPosts = rows.filter((p) => p.replyingToID == null)
            const replyPosts = rows.filter((p) => p.replyingToID != null)

            return {
                posts: rootPosts.map(toItem),
                comments: replyPosts.map(toItem),
            }
        },
        {
            auth: 'admin',
            response: contentResponse,
            detail: {
                description: 'Return the list of posts and comments associated with the specified user. This is an admin-only endpoint.',
                tags: ['Content']
            }
        },
    )
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
            detail: {
                description: 'Ban/Unban the specified user. This is an admin-only endpoint.',
                tags: ['User']
            }
        },
    )
