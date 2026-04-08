import { Elysia } from 'elysia'
import { userGetResponse, userUpdateBody, userUpdateResponse, userDeleteResponse, userPublicGetResponse, userReportBody, userReportResponse } from '../../models/controllers/user.models'
import { prisma } from '../../../lib/prisma'
import { authPlugin } from '../../../lib/auth/auth.plugin'

export const userController = new Elysia()
    .use(authPlugin)
    .get('/user/gdpr-sar', async ({ user, set }) => {
        console.log(`Executed GET /user/gdpr-sar`)

        const [dbUser, userPosts, reportsFiled, reportsAgainst] = await Promise.all([
            prisma.user.findUnique({
                where: { id: user.id },
                include: {
                    profile: true,
                    settings: true,
                },
            }),
            prisma.post.findMany({
                where: { userID: user.id },
                orderBy: { time: 'asc' },
                include: {
                    _count: { select: { upvotes: true, postReplies: true } },
                },
            }),
            prisma.report.findMany({
                where: { userID: user.id },
                orderBy: { time: 'asc' },
            }),
            prisma.report.findMany({
                where: { reportedUserID: user.id },
                orderBy: { time: 'asc' },
            }),
        ])

        if (!dbUser) {
            set.status = 404
            return { error: 'INVALID_USER' }
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        set.headers['Content-Type'] = 'application/json; charset=utf-8'
        set.headers['Content-Disposition'] = `attachment; filename="lilypad-gdpr-sar-${dbUser.id}-${timestamp}.json"`

        return {
            generatedAt: new Date().toISOString(),
            requestType: 'GDPR_ARTICLE_15_SAR',
            user: dbUser,
            posts: userPosts,
            reportsFiled,
            reportsAgainstUser: reportsAgainst.map(({ userID: _userID, ...report }) => ({
                ...report,
                reporter: 'ANONYMISED',
            })),
        }
    }, {
        auth: true,
        detail: {
            description: 'Export personal data for the authenticated user (GDPR SAR).',
            tags: ['User']
        }
    })
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
        detail: {
            description: 'Return the current user’s profile and settings.',
            tags: ['User']
        }
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
        detail: {
            description: 'Update the current user’s profile and settings.',
            tags: ['User']
        }
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

        const anonymisedName = `deleted-user-${user.id.slice(0, 8)}`
        const anonymisedEmail = `deleted-${user.id}@deleted.local`

        await prisma.$transaction([
            prisma.session.deleteMany({
                where: { userId: user.id },
            }),
            prisma.account.deleteMany({
                where: { userId: user.id },
            }),
            prisma.userProfile.upsert({
                where: { userID: user.id },
                update: {
                    name: 'Deleted User',
                    bio: '',
                    status: '',
                },
                create: {
                    userID: user.id,
                    name: 'Deleted User',
                    bio: '',
                    status: '',
                },
            }),
            prisma.userSettings.upsert({
                where: { userID: user.id },
                update: {
                    anon: true,
                },
                create: {
                    userID: user.id,
                    anon: true,
                },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: {
                    name: anonymisedName,
                    email: anonymisedEmail,
                    image: null,
                    role: null,
                    emailVerified: false,
                    banned: true,
                    banReason: 'ACCOUNT_DELETED',
                    banExpires: null,
                },
            }),
        ])

        return { status: 'OK' }
    }, {
        auth: true,
        response: userDeleteResponse,
        detail: {
            description: 'Delete the current user account by anonymising identity while preserving authored content.',
            tags: ['User']
        }
    })
    .get(
        "/user/:userId",
        async ({ params, set }) => {
            console.log(`Executed GET /user/${params.userId}`)
            const profile = await prisma.userProfile.findUnique({
                where: { userID: params.userId },
            })

            if (!profile) {
                set.status = 404
                return { error: 'INVALID_USER' }
            }

            return {
                name: profile.name,
                bio: profile.bio,
                status: profile.status,
            }
        },
        {
            auth: true,
            response: userPublicGetResponse,
            detail: {
                description: 'Return the specified user’s profile information. This is an admin-only endpoint.',
                tags: ['User']
            }
        },
    )
    .post(
        '/user/:userId/report',
        async ({ user, params, body, set }) => {
            console.log(`Executed POST /user/${params.userId}/report`)
            try {
                await prisma.report.create({
                    data: {
                        userID: user.id,
                        reportedUserID: params.userId,
                        reason: body.reason,
                        content: body.content,
                        action: body.action
                    },
                })

                return { status: 'OK' }
            } catch (e) {
                set.status = 400
                return { error: 'INVALID_FIELD' }
            }
        },
        {
            auth: true,
            body: userReportBody,
            response: userReportResponse,
            detail: {
                description: 'File a report against the user specified in the path parameter {userId}.',
                tags: ['User']
            }
        },
    )
