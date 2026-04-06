import { Elysia } from "elysia";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  spatialContentGetResponse,
  feedSpatialQuery,
} from "../../models/controllers/content.models";

export const contentController = new Elysia().use(authPlugin).get(
  "/feed-spatial",
  async ({ query }) => {
    console.log(`Executed GET /feed-spatial`);

    const DISTANCE = 1000;

    const { lat, lon } = query;

    // Spatial lookup, returns CUID and distance for each nearby post
    const nearby = await prisma.$queryRaw<
      { CUID: string; distance_m: number }[]
    >`
            SELECT p."CUID",
                   ST_Distance(l.geog, ST_MakePoint(${lon}, ${lat})::geography) AS distance_m
            FROM "post" p
            JOIN "location" l ON p."locationID" = l."CUID"
            WHERE p."replyingToID" IS NULL
            AND ST_DWithin(l.geog, ST_MakePoint(${lon}, ${lat})::geography, ${DISTANCE})
        `;

    const distanceMap = new Map(nearby.map((r) => [r.CUID, r.distance_m]));

    const posts = await prisma.post.findMany({
      where: {
        CUID: { in: nearby.map((r) => r.CUID) },
      },
      include: {
        user: { include: { settings: true } },
        _count: { select: { upvotes: true, postReplies: true } },
      },
    });

    return {
      posts: posts
        .map((post) => ({
          id: post.CUID,
          content: post.content,
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time.toISOString(),
          upvotes: post._count.upvotes,
          replyCount: post._count.postReplies,
          distanceKm: Math.round((distanceMap.get(post.CUID) ?? 0) / 10) / 100,
        }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    };
  },
  {
    auth: true,
    query: feedSpatialQuery,
    response: spatialContentGetResponse,
  },
);
