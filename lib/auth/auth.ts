import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../prisma";
import { createId } from '@paralleldrive/cuid2'
import { createAuthMiddleware } from "better-auth/api";
import { log } from "../log";

export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    rateLimit: {
        enabled: false
    },
    plugins: [
        admin(),
    ],
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: [
        'http://localhost:8080',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
    ],
    advanced: {
        database: {
            generateId: () => createId()
        }
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            const path = ctx.path;

            if (path === "/sign-up/email") {
                log.out(`POST request at /api/auth/sign-up/email`, "auth-controller");
                return;
            }

            if (path === "/sign-in/email") {
                log.out(`POST request at /api/auth/sign-in/email`, "auth-controller");
                return;
            }

            if (path === "/sign-out") {
                log.out(`POST request at /api/auth/sign-out`, "auth-controller");
            }
        }),
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await prisma.userProfile.create({
                        data: {
                            userID: user.id,
                            name: user.name,
                            bio: '',
                            status: '',
                        },
                    })
                    await prisma.userSettings.create({
                        data: {
                            userID: user.id,
                        },
                    })
                },
            },
        },
    },
});