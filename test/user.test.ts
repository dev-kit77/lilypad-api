import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../src/app'
import { signUp, authedRequest, type AuthSession } from './helpers/auth'
import { prisma } from '../lib/prisma'

const BASE = 'http://localhost/api'

// Unique credentials per test run to avoid conflicts across runs
const TEST_EMAIL = `user-test-${Date.now()}@test.com`
const TEST_PASSWORD = 'password1234'
const TEST_NAME = `testuser${Date.now()}`

let session: AuthSession

describe('User endpoints', () => {
    beforeAll(async () => {
        session = await signUp(TEST_EMAIL, TEST_PASSWORD, TEST_NAME)
    })

    afterAll(async () => {
        await prisma.user.delete({ where: { id: session.userId } })
    })

    // -------------------------------------------------------------------------
    // Unauthenticated — no DB interaction, always runnable
    // -------------------------------------------------------------------------

    describe('GET /api/user (unauthenticated)', () => {
        // Verifies the endpoint is protected as no session cookie should result in 401
        it('returns 401', async () => {
            const res = await app.handle(new Request(`${BASE}/user`))
            expect(res.status).toBe(401)
        })
    })

    describe('PUT /api/user (unauthenticated)', () => {
        // Verifies the endpoint is protected as update attempts without auth should be rejected
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/user`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'newname' }),
                }),
            )
            expect(res.status).toBe(401)
        })
    })

    describe('DELETE /api/user (unauthenticated)', () => {
        // Verifies the endpoint is protected as account deletion without auth should be rejected
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/user`, { method: 'DELETE' }),
            )
            expect(res.status).toBe(401)
        })
    })

    describe('GET /api/user/:userId (unauthenticated)', () => {
        // Verifies the endpoint is protected as public profile lookup requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(new Request(`${BASE}/user/some-id`))
            expect(res.status).toBe(401)
        })
    })

    describe('POST /api/user/:userId/report (unauthenticated)', () => {
        // Verifies the endpoint is protected as filing a report requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/user/some-id/report`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: 'spam', content: 'test' }),
                }),
            )
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // Authenticated — requires a running test database
    // -------------------------------------------------------------------------

    describe('GET /api/user (authenticated)', () => {
        // Verifies the current user's own account data is returned correctly
        it('returns 200 with user data', async () => {
            const res = await app.handle(authedRequest('/user', session.cookie))
            expect(res.status).toBe(200)

            const body = await res.json() as Record<string, unknown>
            expect(body).toHaveProperty('userId')
            expect(body).toHaveProperty('username')
            expect(body).toHaveProperty('settings')
        })
    })

    describe('GET /api/user/:userId (authenticated)', () => {
        // Verifies that a valid userId returns the corresponding user's public profile
        it('returns 200 with profile data for a valid user', async () => {
            const res = await app.handle(authedRequest(`/user/${session.userId}`, session.cookie))
            expect(res.status).toBe(200)

            const body = await res.json() as Record<string, unknown>
            expect(body).toHaveProperty('name')
            expect(body).toHaveProperty('bio')
            expect(body).toHaveProperty('status')
        })

        // Verifies that a userId with no matching record returns a not-found error
        it('returns 404 for a non-existent userId', async () => {
            const res = await app.handle(authedRequest('/user/non-existent-id', session.cookie))
            expect(res.status).toBe(404)
        })
    })

    describe('PUT /api/user (authenticated)', () => {
        // Verifies that a valid username update is accepted and persisted
        it('returns 200 when updating username', async () => {
            const res = await app.handle(
                authedRequest('/user', session.cookie, {
                    method: 'PUT',
                    body: JSON.stringify({ username: `updated${Date.now()}` }),
                }),
            )
            expect(res.status).toBe(200)
            const body = await res.json() as Record<string, unknown>
            expect(body.status).toBe('OK')
        })
    })
})
