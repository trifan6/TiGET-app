const { prisma } = require('./db');

async function logUserAction(userId, actionInfo) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: { role: true }
    });

    if (!user) return;

    const roleId = user.role.id;
    const roleName = user.role.name;
    const timestamp = new Date();

    await prisma.log.create({
      data: {
        userId: Number(userId),
        roleId: Number(roleId),
        action: actionInfo,
        timestamp: timestamp
      }
    });

    const formattedLog = `${userId}:${roleId}[${roleName}] ${actionInfo}:${timestamp.toISOString()}`;
    console.log(`[LOG] ${formattedLog}`);
    
    if (roleName !== "MASTER_ADMIN") {
      let isMalevolent = false;
      let flagReason = "";

      if (actionInfo.includes("UNAUTHORIZED")) {
        isMalevolent = true;
        flagReason = "Consumer attempted to access a restricted endpoint.";
      }

      if (!isMalevolent) {
        const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
        const actionCount = await prisma.log.count({
          where: {
            userId: Number(userId),
            timestamp: { gte: tenSecondsAgo }
          }
        });

        if (actionCount > 15) {
          isMalevolent = true;
          flagReason = "Consumer spamming endpoints / Bot-like behavior detected.";
        }
      }

      if (isMalevolent) {
        const existingObservation = await prisma.observation.findUnique({
          where: { userId: Number(userId) }
        });

        if (!existingObservation) {
          await prisma.observation.create({
            data: {
              userId: Number(userId),
              reason: flagReason
            }
          });
          console.log(`🚨 MALVOLENT CONSUMER DETECTED! User ${userId} added to Observation List.`);
        }
      }
    }

  } catch (error) {
    console.error("Fatal error in Logging System:", error);
  }
}

module.exports = { logUserAction };