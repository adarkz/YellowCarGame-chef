import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const submitCar = mutation({
  args: {
    imageId: v.id("_storage"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Create car spot
    await ctx.db.insert("carSpots", {
      userId,
      imageId: args.imageId,
      points: 1,
      verified: false,
      description: args.description,
    });

    // Update user score
    const existingScore = await ctx.db
      .query("userScores")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingScore) {
      await ctx.db.patch(existingScore._id, {
        totalPoints: existingScore.totalPoints + 1,
        totalSpots: existingScore.totalSpots + 1,
      });
    } else {
      await ctx.db.insert("userScores", {
        userId,
        totalPoints: 1,
        totalSpots: 1,
      });
    }
  },
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const getCarSpots = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    
    const spots = await ctx.db
      .query("carSpots")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    
    return Promise.all(
      spots.map(async (spot) => ({
        ...spot,
        imageUrl: await ctx.storage.getUrl(spot.imageId),
      }))
    );
  },
});

export const getLeaderboard = query({
  handler: async (ctx) => {
    const scores = await ctx.db
      .query("userScores")
      .withIndex("by_points", (q) => q)
      .order("desc")
      .take(10);

    return Promise.all(
      scores.map(async (score) => {
        const user = await ctx.db.get(score.userId);
        return {
          ...score,
          username: user?.email ?? "Anonymous",
          image: user?.image,  // Include user image
        };
      })
    );
  },
});
