import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../prisma";
import { createId } from '@paralleldrive/cuid2'

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    plugins: [
        admin(),
    ],
    emailAndPassword: { 
        enabled: true, 
    },
    // TODO: Remove once ready to deploy
    trustedOrigins: ['http://localhost:8080'],
    advanced: {
        database: {
            generateId: () => createId()
        }
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