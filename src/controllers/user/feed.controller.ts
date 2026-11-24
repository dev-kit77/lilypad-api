import { Elysia } from "elysia";
import { prisma } from "../../../lib/prisma";
import { authPlugin } from "../../../lib/auth/auth.plugin";
import {
  spatialContentGetResponse,
  feedSpatialQuery,
} from "../../models/content.models";
import { log } from "../../../lib/log";
import { ERROR_CODES } from "../../models/error.models";

export const contentController = new Elysia().use(authPlugin).get(
  "/feed-spatial",
  async ({ user, query, set }) => {
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
        upvotes: { where: {id: user.id }, select: { id: true } }
      },
    });

    log.success(`Found ${posts.length} nearby posts`, "feed-controller");

    const toItem = (post: (typeof posts)[number]) => ({
      id: post.CUID,
      content: post.content,
      ...(!post.user.settings?.anon || user.id == post.userID ? { userID: post.userID } : {}),
      username: !post.user.settings?.anon || user.id == post.userID ? post.user.name : "Anonymous",
      time: post.time,
      ...(post.updated ? { updated: post.updated } : {}),
      upvotes: post._count.upvotes,
      upvoted: post.upvotes.length > 0,
      ...(post.replyingToID ? { replyingTo: post.replyingToID } : {}),
      replyCount: post._count.postReplies,
      distanceKm: Math.round((distanceMap.get(post.CUID) ?? 0) / 10) / 100,
    });

    const rootPosts = posts.filter((p) => p.replyingToID == null);
    const replyPosts = posts.filter((p) => p.replyingToID != null);

    return {
      posts: rootPosts
        .map(toItem)
        .sort((a, b) => a.distanceKm - b.distanceKm),
      replies: replyPosts.map(toItem)
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
