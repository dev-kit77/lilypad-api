import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { ac, user, moderator, admin as adminRole } from "./middleware/accessControlPolicies";
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    plugins: [
        admin({
            ac,
            roles: {
                user,
                moderator,
                admin: adminRole,
            },
        }),
    ],
    emailAndPassword: { 
        enabled: true, 
    }
});