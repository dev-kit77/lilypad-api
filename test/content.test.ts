import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../src/app'
import { signUp, authedRequest, type AuthSession } from './helpers/auth'
import { prisma } from '../lib/prisma'

const BASE = 'http://localhost/api'

const TEST_EMAIL = `content-test-${Date.now()}@test.com`
const TEST_PASSWORD = 'password1234'
const TEST_NAME = `contentuser${Date.now()}`

let session: AuthSession

describe('Content endpoints', () => {
    beforeAll(async () => {
        session = await signUp(TEST_EMAIL, TEST_PASSWORD, TEST_NAME)
    })

    afterAll(async () => {
        await prisma.user.delete({ where: { id: session.userId } })
    })

    // -------------------------------------------------------------------------
    // Unauthenticated
    // -------------------------------------------------------------------------

    describe('GET /api/content (unauthenticated)', () => {
        // Verifies the endpoint is protected as fetching posts requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(new Request(`${BASE}/content`))
            expect(res.status).toBe(401)
        })
    })

    describe('POST /api/content/post (unauthenticated)', () => {
        // Verifies the endpoint is protected as creating a post requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/content/post`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: 'hello',
                        locality: { lat: 51.5, lon: -0.1 },
                    }),
                }),
            )
            expect(res.status).toBe(401)
        })
    })

    describe('GET /api/content/post/:postId/reply (unauthenticated)', () => {
        // Verifies the endpoint is protected as fetching replies requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(new Request(`${BASE}/content/post/some-id/reply`))
            expect(res.status).toBe(401)
        })
    })

    describe('POST /api/content/post/:postId/reply (unauthenticated)', () => {
        // Verifies the endpoint is protected as posting a reply requires a valid session
        it('returns 401', async () => {
            const res = await app.handle(
                new Request(`${BASE}/content/post/some-id/reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: 'reply text' }),
                }),
            )
            expect(res.status).toBe(401)
        })
    })

    // -------------------------------------------------------------------------
    // Authenticated — requires a running test database
    // -------------------------------------------------------------------------

    describe('GET /api/content (authenticated)', () => {
        // Verifies that the current user's posts are returned as an array
        it('returns 200 with posts array', async () => {
            const res = await app.handle(authedRequest('/content', session.cookie))
            expect(res.status).toBe(200)

            const body = await res.json() as Record<string, unknown>
            expect(body).toHaveProperty('posts')
            expect(Array.isArray(body.posts)).toBe(true)
        })
    })

    describe('POST /api/content/post (authenticated)', () => {
        // Verifies that a post with valid content and locality is created successfully
        it('returns 200 when creating a post', async () => {
            const res = await app.handle(
                authedRequest('/content/post', session.cookie, {
                    method: 'POST',
                    body: JSON.stringify({
                        content: 'Test post content',
                        locality: { lat: 51.5074, lon: -0.1278 },
                    }),
                }),
            )
            expect(res.status).toBe(200)
            const body = await res.json() as Record<string, unknown>
            expect(body.status).toBe('OK')
        })

        // Verifies that an empty content string fails the minimum length validation
        it('returns 400 when content is empty', async () => {
            const res = await app.handle(
                authedRequest('/content/post', session.cookie, {
                    method: 'POST',
                    body: JSON.stringify({
                        content: '',
                        locality: { lat: 51.5074, lon: -0.1278 },
                    }),
                }),
            )
            expect(res.status).toBe(400)
        })
    })

    describe('GET /api/content/post/:postId/reply (authenticated)', () => {
        // Verifies that requesting replies for a postId that doesn't exist returns a 404 error
        it('returns 404 for a non-existent post', async () => {
            const res = await app.handle(
                authedRequest('/content/post/non-existent-id/reply', session.cookie),
            )
            expect(res.status).toBe(404)
        })
    })
})
