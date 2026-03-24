import { auth } from '../auth'

export const checkAuth = () =>
    async ({ request, set }: { request: Request, set: any }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
            set.status = 401
            return { error: 'Unauthorized' }
        }
    }

export const checkRole = (role: string) =>
    async ({ request, set }: { request: Request, set: any }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
            set.status = 401
            return { error: 'Unauthorized' }
        }

        if (session.user.role !== role) {
            set.status = 403
            return { error: 'Forbidden' }
        }
    }
