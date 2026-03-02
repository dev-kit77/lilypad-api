const server = Bun.serve({
    routes: {
        "/": {
            GET: () => new Response("OK")
        },
        "/auth": {
            GET: () => new Response("OK"),
            POST: () => new Response("OK"),
            PUT: () => new Response("OK")
        },
        "/user": {
            GET: () => new Response("OK"),
            PUT: () => new Response("OK"),
            DELETE: () => new Response("OK")
        },
        "/user/:userId": {
            GET: () => new Response("OK"),
            PUT: () => new Response("OK")
        },
        "/user/:userId/report": {
            POST: () => new Response("OK")
        },
        "/content": {
            PUT: () => new Response("OK")
        },
        "/content/:userId": {
            GET: () => new Response("OK")
        },
        "/content/post": {
            POST: () => new Response("OK")
        },
        "/content/post/:postId": {
            GET: () => new Response("OK"),
            POST: () => new Response("OK"),
            PUT: () => new Response("OK"),
            DELETE: () => new Response("OK")
        },
        "/content/post/:postId/reply": {
            GET: () => new Response("OK"),
            POST: () => new Response("OK")
        },
        "/special": {
            GET: () => new Response("OK")
        },
        "/special/:reportId": {
            GET: () => new Response("OK"),
            PUT: () => new Response("OK")
        }
    }
});