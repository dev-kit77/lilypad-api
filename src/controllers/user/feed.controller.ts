import { Elysia } from 'elysia'
import { prisma } from '../../../lib/prisma'
import { authPlugin } from '../../../lib/middleware/auth.plugin'
import { contentGetResponse } from '../../models/controllers/content.models'

export const contentController = new Elysia()
    .use(authPlugin)
    .get('/feed', async () => {
        console.log(`Executed GET /feed`)
        
        const posts = await prisma.post.findMany({
            where: { replyingToID: null },
            include: {
                user: { include: { settings: true } },
                _count: { select: { upvotes: true, postReplies: true } },
            },
            orderBy: { time: 'desc' },
        })

        return {
            posts: posts.map(post => ({
                id: post.CUID,
                content: post.content,
                author: post.user.settings?.anon ? 'Anonymous' : post.user.name,
                time: post.time.toISOString(),
                upvotes: post._count.upvotes,
                replyCount: post._count.postReplies,
            }))
        }
    }, {
        auth: true,
        response: contentGetResponse,
    })
