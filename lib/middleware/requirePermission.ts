import { auth } from '../auth'

export const checkPermission = (resource: string, actions: string[]) =>
    async ({ request, set }: { request: Request, set: any }) => {
        const session = await auth.api.getSession({ headers: request.headers })

        if (!session) {
            set.status = 401
            return { error: 'Unauthorized' }
        }

        const result = await auth.api.userHasPermission({
            body: {
                userId: session.user.id,
                permissions: { [resource]: actions },
            },
        })

        console.log('Permission check result:', result)

        if (!result.success) {
            set.status = 403
            return { error: 'Forbidden' }
        }
    }