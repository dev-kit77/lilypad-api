import { t } from "elysia";

export const userBanBody = t.Object({
  active: t.Boolean(),
  lengthOfBanInDays: t.Optional(t.Integer({ minimum: 1 })),
});

export const userBanResponse = {
  200: t.Object({ status: t.String() }),
  400: t.Object({ error: t.String() }),
  403: t.Object({ error: t.String() }),
  404: t.Object({ error: t.String() }),
};

export const reportItem = t.Object({
  id: t.String(),
  userID: t.String(),
  reason: t.String(),
  content: t.String(),
  time: t.Date(),
});

export const reportResponse = {
  200: t.Object({
    report: reportItem,
  }),
  400: t.Object({ error: t.String() }),
  403: t.Object({ error: t.String() }),
  404: t.Object({ error: t.String() }),
};

export const getReportsResponse = {
  200: t.Object({
    reports: t.Array(reportItem),
  }),
  400: t.Object({ error: t.String() }),
  403: t.Object({ error: t.String() }),
};
