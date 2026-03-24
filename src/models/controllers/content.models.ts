import { t } from 'elysia'

export const postItem = t.Object({
    id: t.String(),
    content: t.String(),
    author: t.String(),
    time: t.String(),
    upvotes: t.Number(),
    replyCount: t.Number(),
})

export const contentGetResponse = {
    200: t.Object({
        posts: t.Array(postItem),
    }),
}

export const postCreateBody = t.Object({
    content: t.String({ minLength: 1 }),
    locality: t.Object({
        lat: t.Number(),
        lon: t.Number()
    }),
})

export const postCreateResponse = {
    200: t.Object({ status: t.String() }),
    400: t.Object({ error: t.String() }),
}
