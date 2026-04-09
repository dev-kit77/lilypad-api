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
