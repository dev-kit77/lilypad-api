import { app } from '../../src/app'

const BASE = 'http://localhost/api'

export interface AuthSession {
    cookie: string
    userId: string
}

/**
 * Signs up a new user and returns the session cookie and userId.
 * The email/password combination should be unique per test run.
 */
export async function signUp(email: string, password: string, name: string): Promise<AuthSession> {
    const res = await app.handle(
        new Request(`${BASE}/auth/sign-up/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
        }),
    )

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Sign-up failed (${res.status}): ${body}`)
    }

    const cookie = res.headers.get('set-cookie') ?? ''
    const body = await res.json() as { user: { id: string } }
    return { cookie, userId: body.user.id }
}

/**
 * Signs in an existing user and returns the session cookie and userId.
 */
export async function signIn(email: string, password: string): Promise<AuthSession> {
    const res = await app.handle(
        new Request(`${BASE}/auth/sign-in/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        }),
    )

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Sign-in failed (${res.status}): ${body}`)
    }

    const cookie = res.headers.get('set-cookie') ?? ''
    const body = await res.json() as { user: { id: string } }
    return { cookie, userId: body.user.id }
}

/**
 * Convenience wrapper: builds a Request with the session cookie attached.
 */
export function authedRequest(path: string, cookie: string, init: RequestInit = {}): Request {
    return new Request(`${BASE}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            Cookie: cookie,
            ...(init.headers as Record<string, string> ?? {}),
        },
    })
}
