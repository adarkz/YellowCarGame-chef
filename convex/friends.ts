import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";

type FriendshipWithDetails = Doc<"friendships"> & {
  friend: {
    email: string | undefined;
    totalPoints: number;
    totalSpots: number;
  };
};

export const getFriends = query({
  handler: async (ctx): Promise<FriendshipWithDetails[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    return Promise.all(
      friendships.map(async (friendship) => {
        const friend = await ctx.db.get(friendship.friendId);
        const score = await ctx.db
          .query("userScores")
          .withIndex("by_user", (q) => q.eq("userId", friendship.friendId))
          .unique();
        
        return {
          ...friendship,
          friend: {
            email: friend?.email,
            totalPoints: score?.totalPoints ?? 0,
            totalSpots: score?.totalSpots ?? 0,
          },
        };
      })
    );
  },
});

export const addFriend = mutation({
  args: {
    friendEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Find the user by email
    const friend = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.friendEmail))
      .unique();

    if (!friend) throw new Error("User not found");
    if (friend._id === userId) throw new Error("Cannot add yourself as a friend");

    // Check if friendship already exists
    const existingFriendship = await ctx.db
      .query("friendships")
      .withIndex("by_users", (q) => q.eq("userId", userId).eq("friendId", friend._id))
      .unique();

    if (existingFriendship) throw new Error("Already friends or request pending");

    // Create friendship
    await ctx.db.insert("friendships", {
      userId,
      friendId: friend._id,
      status: "accepted" as const, // For simplicity, auto-accept friendships
    });

    // Create reverse friendship
    await ctx.db.insert("friendships", {
      userId: friend._id,
      friendId: userId,
      status: "accepted" as const,
    });
  },
});
