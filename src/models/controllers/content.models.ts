import { t } from "elysia";
import { reportItem } from "./admin.models";

export const postItem = t.Object({
  id: t.String(),
  content: t.String(),
  userID: t.Optional(t.String()),
  author: t.String(),
  time: t.Date(),
  updated: t.Optional(t.Date()),
  upvotes: t.Number(),
  replyingTo: t.Optional(t.String()),
  replyCount: t.Number(),
});

export const postResponse = {
  200: t.Object({ post: postItem }),
  400: t.Object({ error: t.String() }),
  404: t.Object({ error: t.String() }),
};

export const contentResponse = {
  200: t.Object({
    posts: t.Array(postItem),
    comments: t.Array(postItem),
  }),
  400: t.Object({ error: t.String() }),
  403: t.Object({ error: t.String() }),
};

export const spatialPostItem = t.Object({
  id: t.String(),
  content: t.String(),
  userID: t.Optional(t.String()),
  author: t.String(),
  time: t.Date(),
  updated: t.Optional(t.Date()),
  upvotes: t.Number(),
  replyingTo: t.Optional(t.String()),
  replyCount: t.Number(),
  distanceKm: t.Number(),
});

export const spatialContentGetResponse = {
  200: t.Object({
    posts: t.Array(spatialPostItem),
  }),
};

export const postCreateBody = t.Object({
  content: t.String({ minLength: 1 }),
  locality: t.Object({
    lat: t.Number(),
    lon: t.Number(),
  }),
});

export const postCreateResponse = {
  200: t.Object({ status: t.String() }),
  400: t.Object({ error: t.String() }),
};

export const postReportBody = t.Object({
  reason: t.String({ minLength: 1 }),
  content: t.String({ minLength: 1 }),
});

export const postReportResponse = {
  200: t.Object({ report: reportItem }),
  400: t.Object({ error: t.String() }),
};

export const postUpdateBody = t.Object({
  content: t.String({ minLength: 1 }),
});

export const postUpdateResponse = {
  200: t.Object({ status: t.String() }),
  400: t.Object({ error: t.String() }),
  403: t.Object({ error: t.String() }),
};

export const postDeleteResponse = {
  200: t.Object({ status: t.String() }),
  403: t.Object({ error: t.String() }),
  404: t.Object({ error: t.String() }),
};

export const postReplyBody = t.Object({
  content: t.String({ minLength: 1 }),
});

export const postReplyResponse = {
  200: t.Object({ status: t.String() }),
  400: t.Object({ error: t.String() }),
};

export const postRepliesResponse = {
  200: t.Array(postItem),
  404: t.Object({ error: t.String() }),
};

export const feedSpatialQuery = t.Object({
  lat: t.Numeric(),
  lon: t.Numeric(),
});
