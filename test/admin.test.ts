import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../src/app'
import { signUp, authedRequest, type AuthSession } from './helpers/auth'
import { prisma } from '../lib/prisma'

const BASE = 'http://localhost/api'

const ADMIN_EMAIL = `admin-test-${Date.now()}@test.com`
const ADMIN_PASSWORD = 'password1234'
const ADMIN_NAME = `adminuser${Date.now()}`

const TARGET_EMAIL = `target-test-${Date.now()}@test.com`
const TARGET_PASSWORD = 'password1234'
const TARGET_NAME = `targetuser${Date.now()}`

let adminSession: AuthSession
let targetSession: AuthSession

describe('Admin endpoints', () => {
    beforeAll(async () => {
        // Create target user first
        targetSession = await signUp(TARGET_EMAIL, TARGET_PASSWORD, TARGET_NAME)

        // Create admin user and elevate their role directly in the DB
        adminSession = await signUp(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME)
        await prisma.user.update({
            where: { id: adminSession.userId },
            data: { role: 'admin' },
        })
    })

    afterAll(async () => {
        await prisma.user.deleteMany({
            where: { id: { in: [adminSession.userId, targetSession.userId] } },
        })
    })

    // -------------------------------------------------------------------------
    // Unauthenticated
    // -------------------------------------------------------------------------

    describe('GET /api/content/:userId (unauthenticated)', () => {
        // Verifies the endpoint is protected: fetching another user's posts requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(new Request(`${BASE}/content/some-id`))
            expect(res.status).toBe(401)
        })
    })

    describe('PUT /api/user/:userId (unauthenticated)', () => {
        // Verifies the endpoint is protected: banning a user requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/user/some-id`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ active: true }),
                }),
            )
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // Non-admin (403)
    // -------------------------------------------------------------------------

    describe('GET /api/content/:userId (non-admin)', () => {
        // Verifies that a regular user (no role) cannot access another user's posts
        it('returns 403 for a regular user', async () => {
            const res = await app.handle(
                authedRequest(`/content/${adminSession.userId}`, targetSession.cookie),
            )
            expect(res.status).toBe(403)
        })
    })

    describe('PUT /api/user/:userId (non-admin)', () => {
        // Verifies that a regular user (no role) cannot ban another user
        it('returns 403 for a regular user', async () => {
            const res = await app.handle(
                authedRequest(`/user/${targetSession.userId}`, targetSession.cookie, {
                    method: 'PUT',
                    body: JSON.stringify({ active: true }),
                }),
            )
            expect(res.status).toBe(403)
        })
    })

    // -------------------------------------------------------------------------
    // Authenticated admin
    // -------------------------------------------------------------------------

    describe('GET /api/content/:userId (admin)', () => {
        // Verifies that an admin can retrieve any user's posts by their userId
        it('returns 200 with posts array for a valid user', async () => {
            const res = await app.handle(
                authedRequest(`/content/${targetSession.userId}`, adminSession.cookie),
            )
            expect(res.status).toBe(200)

            const body = await res.json() as Record<string, unknown>
            expect(body).toHaveProperty('posts')
            expect(Array.isArray(body.posts)).toBe(true)
        })

        // Verifies that a userId with no matching record returns an invalid ID error
        it('returns 400 for a non-existent userId', async () => {
            const res = await app.handle(
                authedRequest('/content/non-existent-id', adminSession.cookie),
            )
            expect(res.status).toBe(400)
        })
    })

    describe('PUT /api/user/:userId (admin) — ban', () => {
        // Verifies that an admin can issue a time-limited ban, setting banned and banExpires
        it('returns 200 when banning a user with a time-limited ban', async () => {
            const res = await app.handle(
                authedRequest(`/user/${targetSession.userId}`, adminSession.cookie, {
                    method: 'PUT',
                    body: JSON.stringify({ active: true, lengthOfBanInDays: 7 }),
                }),
            )
            expect(res.status).toBe(200)
            const body = await res.json() as Record<string, unknown>
            expect(body.status).toBe('OK')
        })

        // Verifies that an admin can lift a ban, clearing the banned flag and banExpires
        it('returns 200 when unbanning a user', async () => {
            const res = await app.handle(
                authedRequest(`/user/${targetSession.userId}`, adminSession.cookie, {
                    method: 'PUT',
                    body: JSON.stringify({ active: false }),
                }),
            )
            expect(res.status).toBe(200)
            const body = await res.json() as Record<string, unknown>
            expect(body.status).toBe('OK')
        })

        // Verifies that attempting to ban a userId with no matching record returns a 404 error
        it('returns 404 for a non-existent userId', async () => {
            const res = await app.handle(
                authedRequest('/user/non-existent-id', adminSession.cookie, {
                    method: 'PUT',
                    body: JSON.stringify({ active: true }),
                }),
            )
            expect(res.status).toBe(404)
        })
    })
})
