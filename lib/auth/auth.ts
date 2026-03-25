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
    }
});