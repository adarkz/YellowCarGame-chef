import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  carSpots: defineTable({
    userId: v.id("users"),
    imageId: v.id("_storage"),
    points: v.number(),
    verified: v.boolean(),
    description: v.string(),
  }).index("by_user", ["userId"]),
  
  userScores: defineTable({
    userId: v.id("users"),
    totalPoints: v.number(),
    totalSpots: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_points", ["totalPoints"]),

  friendships: defineTable({
    userId: v.id("users"),
    friendId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_user", ["userId"])
    .index("by_friend", ["friendId"])
    .index("by_users", ["userId", "friendId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
