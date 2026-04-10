import { Elysia } from "elysia";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  spatialContentGetResponse,
  feedSpatialQuery,
} from "../../models/controllers/content.models";
import { log } from "../../../lib/log";
import { ERROR_CODES } from "../../models/controllers/error-codes.models";

export const contentController = new Elysia().use(authPlugin).get(
  "/feed-spatial",
  async ({ query, set }) => {
    log.out(`GET requested at /feed-spatial`, "feed-controller");

    const DISTANCE = 1000;

    const { lat, lon } = query;

    if (
      lat === null ||
      lon === null ||
      lat === undefined ||
      lon === undefined
    ) {
      set.status = 400;
      log.err(400, `Invalid field: ${lat}, ${lon}`, "feed-controller");
      return { error: ERROR_CODES.INVALID_FIELD };
    }

    log.out(`Querying geolocation lat: ${lat}, lon: ${lon}`, "feed-controller");

    let nearby: { CUID: string; distance_m: number }[];

    // Spatial lookup, returns CUID and distance for each nearby post
    try {
      nearby = await prisma.$queryRaw<{ CUID: string; distance_m: number }[]>`
              SELECT p."CUID",
                     ST_Distance(l.geog, ST_MakePoint(${lon}, ${lat})::geography) AS distance_m
              FROM "post" p
              JOIN "location" l ON p."locationID" = l."CUID"
              WHERE p."replyingToID" IS NULL
              AND ST_DWithin(l.geog, ST_MakePoint(${lon}, ${lat})::geography, ${DISTANCE})
          `;
    } catch (e) {
      log.err(500, `Error querying nearby posts: ${e}`, "feed-controller");
      set.status = 500;
      return { error: ERROR_CODES.INTERNAL_SERVER };
    }

    log.success(`Found ${nearby.length} nearby points`, "feed-controller");
    const distanceMap = new Map(nearby.map((r) => [r.CUID, r.distance_m]));

    log.out(`Querying for posts at nearby points`, "feed-controller");

    const posts = await prisma.post.findMany({
      where: {
        CUID: { in: nearby.map((r) => r.CUID) },
        hidden: false,
      },
      include: {
        user: { include: { settings: true } },
        _count: { select: { upvotes: true, postReplies: true } },
      },
    });

    log.success(`Found ${posts.length} nearby posts`, "feed-controller");

    return {
      posts: posts
        .map((post) => ({
          id: post.CUID,
          content: post.content,
          ...(post.user.settings?.anon ? { userID: post.userID } : {}),
          author: post.user.settings?.anon ? "Anonymous" : post.user.name,
          time: post.time,
          ...(post.updated ? { updated: post.updated } : {}),
          upvotes: post._count.upvotes,
          ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
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
    detail: {
      description: "Return a list of posts filtered by locality.",
      tags: ["Feed"],
    },
  },
);
