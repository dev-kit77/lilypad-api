import { cuid } from 'better-auth'
import { t } from 'elysia'

export const userData = t.Object({
    userId: t.String(),
    username: t.String(),
    status: t.String(),
    settings: t.Object({
        dark: t.Boolean(),
        anon: t.Boolean(),
    }),
    flagged: t.Optional(t.Array(t.String())),
    active: t.Optional(t.Integer()),
})

export const userGetResponse = {
    200: userData,
    404: t.Object({
        error: t.String(),
    }),
}

export const userUpdateBody = t.Object({
    username: t.Optional(t.String()),
    status: t.Optional(t.String()),
    settings: t.Optional(t.Object({
        dark: t.Optional(t.Boolean()),
        anon: t.Optional(t.Boolean()),
    })),
})

export const userUpdateResponse = {
    200: t.Object({ status: t.String() }),
    400: t.Object({ error: t.String() }),
}

export const userDeleteResponse = {
    200: t.Object({ status: t.String() }),
    404: t.Object({ error: t.String() }),
}

export const userPublicGetResponse = {
    200: t.Object({
        name: t.String(),
        bio: t.String(),
        status: t.String(),
    }),
    404: t.Object({ error: t.String() }),
}

export const userReportBody = t.Object({
    reason: t.String(),
    content: t.String(),
    action: t.Optional(t.String()),
    reportedUserID: t.String()
})

export const userReportResponse = {
    200: t.Object({ status: t.String() }),
    400: t.Object({ error: t.String() }),
}