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

export const spatialPostItem = t.Object({
    id: t.String(),
    content: t.String(),
    author: t.String(),
    time: t.String(),
    upvotes: t.Number(),
    replyCount: t.Number(),
    distanceKm: t.Number(),
})

export const spatialContentGetResponse = {
    200: t.Object({
        posts: t.Array(spatialPostItem),
    }),
}

export const postCreateBody = t.Object({
    content: t.String({ minLength: 1 }),
    locality: t.Object({
        lat: t.Number(),
        lon: t.Number(),
    }),
})

export const postCreateResponse = {
    200: t.Object({ status: t.String() }),
    400: t.Object({ error: t.String() }),
}

export const postReplyBody = t.Object({
    content: t.String({ minLength: 1 }),
})

export const postReplyResponse = {
    200: t.Object({ status: t.String() }),
    400: t.Object({ error: t.String() }),
}

export const postRepliesResponse = {
    200: t.Array(postItem),
    404: t.Object({ error: t.String() }),
}

export const feedSpatialQuery = t.Object({
    lat: t.Numeric(),
    lon: t.Numeric(),
})
