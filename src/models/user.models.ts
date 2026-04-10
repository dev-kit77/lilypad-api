import { t } from "elysia";
import { postItem } from "./content.models";
import { reportItem } from "./admin.models";

export const userData = t.Object({
  userId: t.String(),
  username: t.String(),
  status: t.Optional(t.String()),
  bio: t.Optional(t.String()),
  settings: t.Object({
    dark: t.Boolean(),
    anon: t.Boolean(),
  }),
  flagged: t.Optional(t.Array(t.String())),
  active: t.Optional(t.Integer()),
});

export const userGetResponse = {
  200: t.Object({ user: userData }),
  404: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
};

export const userGdprSarResponse = {
  200: t.Object({
    generatedAt: t.String(),
    requestType: t.String(),
    user: t.Unknown(),
    posts: t.Array(t.Unknown()),
    reportsFiled: t.Array(t.Unknown()),
    reportsAgainstUser: t.Array(t.Unknown()),
  }),
  404: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
};

export const userUpdateBody = t.Object({
  username: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  status: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  bio: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  settings: t.Optional(
    t.Object({
      dark: t.Optional(t.Boolean()),
      anon: t.Optional(t.Boolean()),
    }),
  ),
});

export const userUpdateResponse = {
  200: t.Object({ user: userData }),
  400: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
};

export const userDeleteResponse = {
  200: t.Object({ status: t.String() }),
  404: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
};

export const userPublicGetResponse = {
  200: t.Object({
    name: t.String(),
    bio: t.String(),
    status: t.String(),
  }),
  404: t.Object({ error: t.String() }),
};

export const userReportBody = t.Object({
  reason: t.String({ minLength: 1 }),
  content: t.String({ minLength: 1 }),
});

export const userReportResponse = {
  200: t.Object({ report: reportItem }),
  400: t.Object({ error: t.String() }),
  404: t.Object({ error: t.String() }),
  500: t.Object({ error: t.String() }),
};
