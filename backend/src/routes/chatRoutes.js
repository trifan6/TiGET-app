const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { prisma } = require("../utils/db");

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: q,
          mode: "insensitive",
        },
        // NEW: Strictly filter out Admin and Organisers!
        role: {
          name: "CONSUMER",
        },
      },
      select: {
        id: true,
        name: true,
      },
      take: 10,
    });

    res.status(200).json(users);
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

// GET: Fetch recent conversations for a user
router.get("/recents/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Ask MongoDB for ALL messages this user sent or received, newest first
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ timestamp: -1 });

    // 2. Loop through to find the unique people and the last message text
    const recentMap = new Map();
    messages.forEach((msg) => {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!recentMap.has(otherId)) {
        recentMap.set(otherId, {
          id: otherId,
          latestMessage: msg.text,
          timestamp: msg.timestamp,
        });
      }
    });

    const recentUserIds = Array.from(recentMap.keys());
    if (recentUserIds.length === 0) return res.json([]);

        // 3. Ask Prisma for the actual names of these people
    // ---> I DELETED THE CONST PRISMA LINE THAT WAS HERE! <---
    const users = await prisma.user.findMany({
      where: { id: { in: recentUserIds.map(Number) } },
      select: { id: true, name: true },
    });

    // 4. Merge the MongoDB chat data with the Postgres name data
    const finalRecents = users
      .map((u) => ({
        id: String(u.id),
        name: u.name,
        ...recentMap.get(String(u.id)),
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.status(200).json(finalRecents);
  } catch (error) {
    console.error("Error fetching recents:", error);
    res.status(500).json({ error: "Failed to load recents" });
  }
});

router.get("/:user1Id/:user2Id", async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id },
      ],
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
