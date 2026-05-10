const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  store,
  defaultContentModeration,
  defaultAppOperations,
  maskArrayFromCsv,
} = require("../store");

const router = express.Router();

const normalizeContentInput = (body, current) => ({
  homeHeroHeadline: typeof body.homeHeroHeadline === "string"
    ? body.homeHeroHeadline.trim()
    : current.homeHeroHeadline,
  homeHeroSubtext: typeof body.homeHeroSubtext === "string"
    ? body.homeHeroSubtext.trim()
    : current.homeHeroSubtext,
  featuredPlayers: Array.isArray(body.featuredPlayers)
    ? body.featuredPlayers.map((item) => String(item).trim()).filter(Boolean)
    : maskArrayFromCsv(body.featuredPlayers),
  updatedAt: new Date().toISOString(),
  updatedBy: current.updatedBy,
});

const normalizeOperationsInput = (body, current) => ({
  maintenanceBanner: typeof body.maintenanceBanner === "string"
    ? body.maintenanceBanner.trim()
    : current.maintenanceBanner,
  apiRefreshIntervalMinutes: Number(body.apiRefreshIntervalMinutes),
  sportsApiKeyPreview: typeof body.sportsApiKeyPreview === "string"
    ? body.sportsApiKeyPreview.trim()
    : current.sportsApiKeyPreview,
  sportsApiStatus: typeof body.sportsApiStatus === "string"
    ? body.sportsApiStatus.trim().toLowerCase()
    : current.sportsApiStatus,
  authApiStatus: typeof body.authApiStatus === "string"
    ? body.authApiStatus.trim().toLowerCase()
    : current.authApiStatus,
  updatedAt: new Date().toISOString(),
  updatedBy: current.updatedBy,
});

router.get("/content/public", async (req, res) => {
  try {
    const contentModeration = await store.getContentModeration();
    res.json({
      contentModeration: {
        homeHeroHeadline: contentModeration.homeHeroHeadline,
        homeHeroSubtext: contentModeration.homeHeroSubtext,
        featuredPlayers: contentModeration.featuredPlayers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load homepage content." });
  }
});

router.use(authenticateToken, requireAdmin);

router.get("/dashboard", async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const [users, contentModeration, appOperations, audits, sessions] = await Promise.all([
      store.listUsers(search),
      store.getContentModeration(),
      store.getAppOperations(),
      store.listAuditEntries(25),
      store.listActiveSessions(),
    ]);

    res.json({
      users,
      contentModeration,
      appOperations,
      audits,
      sessions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load admin dashboard." });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { role, disabled } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    if (!["admin", "user"].includes(role)) {
      return res.status(400).json({ message: "Role must be admin or user." });
    }

    const targetUser = await store.findUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.id === 1) {
      return res.status(400).json({
        message: "The primary admin account cannot be changed from this panel.",
      });
    }

    if (targetUser.id === req.user.id && disabled) {
      return res.status(400).json({ message: "You cannot disable your own admin account." });
    }

    const adminUsers = (await store.listUsers("")).filter(
      (entry) => entry.role === "admin" && !entry.disabled
    );

    if (targetUser.role === "admin" && (!role || role !== "admin" || disabled)) {
      const isLastActiveAdmin = adminUsers.length === 1 && adminUsers[0].id === targetUser.id;
      if (isLastActiveAdmin) {
        return res.status(400).json({
          message: "You cannot remove or disable the last active admin.",
        });
      }
    }

    const updatedUser = await store.updateUserAccess({
      id: userId,
      role,
      disabled: Boolean(disabled),
      updatedBy: req.user.id,
    });

    await store.addAuditEntry({
      actionType: "user_access_updated",
      summary: `Updated access for ${updatedUser.email}`,
      actorUserId: req.user.id,
      targetType: "user",
      targetId: String(updatedUser.id),
      details: {
        role: updatedUser.role,
        disabled: updatedUser.disabled,
      },
    });

    res.json({
      message: "User access updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update user access." });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user id." });
    }

    const targetUser = await store.findUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.id === 1) {
      return res.status(400).json({
        message: "The primary admin account cannot be deleted.",
      });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your currently logged-in admin account.",
      });
    }

    const deletedUser = await store.deleteUser(userId);

    await store.addAuditEntry({
      actionType: "user_deleted",
      summary: `Deleted account for ${deletedUser.email}`,
      actorUserId: req.user.id,
      targetType: "user",
      targetId: String(deletedUser.id),
      details: {
        email: deletedUser.email,
      },
    });

    res.json({
      message: "User account deleted successfully.",
      user: deletedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to delete user account." });
  }
});

router.put("/content", async (req, res) => {
  try {
    const current = (await store.getContentModeration()) || defaultContentModeration;
    const nextContent = normalizeContentInput(req.body, current);

    if (!nextContent.homeHeroHeadline || !nextContent.homeHeroSubtext) {
      return res.status(400).json({
        message: "Homepage headline and subtext are required.",
      });
    }

    if (nextContent.featuredPlayers.length === 0) {
      return res.status(400).json({
        message: "Add at least one featured player.",
      });
    }

    nextContent.updatedBy = req.user.id;
    const contentModeration = await store.updateContentModeration(nextContent);

    await store.addAuditEntry({
      actionType: "content_updated",
      summary: "Updated content moderation settings",
      actorUserId: req.user.id,
      targetType: "content",
      targetId: "homepage",
      details: {
        featuredPlayers: contentModeration.featuredPlayers,
      },
    });

    res.json({
      message: "Content moderation settings updated successfully.",
      contentModeration,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update content moderation settings." });
  }
});

router.put("/operations", async (req, res) => {
  try {
    const current = (await store.getAppOperations()) || defaultAppOperations;
    const nextOperations = normalizeOperationsInput(req.body, current);

    if (!Number.isInteger(nextOperations.apiRefreshIntervalMinutes) || nextOperations.apiRefreshIntervalMinutes < 1 || nextOperations.apiRefreshIntervalMinutes > 120) {
      return res.status(400).json({
        message: "API refresh interval must be between 1 and 120 minutes.",
      });
    }

    if (!["healthy", "degraded", "offline"].includes(nextOperations.sportsApiStatus) ||
      !["healthy", "degraded", "offline"].includes(nextOperations.authApiStatus)) {
      return res.status(400).json({
        message: "API statuses must be healthy, degraded, or offline.",
      });
    }

    nextOperations.updatedBy = req.user.id;
    const appOperations = await store.updateAppOperations(nextOperations);

    await store.addAuditEntry({
      actionType: "operations_updated",
      summary: "Updated app operations settings",
      actorUserId: req.user.id,
      targetType: "operations",
      targetId: "system",
      details: {
        apiRefreshIntervalMinutes: appOperations.apiRefreshIntervalMinutes,
        sportsApiStatus: appOperations.sportsApiStatus,
        authApiStatus: appOperations.authApiStatus,
      },
    });

    res.json({
      message: "App operations updated successfully.",
      appOperations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update app operations." });
  }
});

router.post("/sessions/:id/revoke", async (req, res) => {
  try {
    const sessionId = req.params.id;

    const revoked = await store.revokeSession(sessionId);
    if (!revoked) {
      return res.status(404).json({ message: "Session not found." });
    }

    await store.addAuditEntry({
      actionType: "session_revoked",
      summary: `Revoked session ${sessionId}`,
      actorUserId: req.user.id,
      targetType: "session",
      targetId: sessionId,
      details: {},
    });

    res.json({ message: "Session revoked successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to revoke session." });
  }
});

router.get("/database", async (req, res) => {
  try {
    const tables = await store.listDatabaseTables();
    res.json({ tables });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load database tables." });
  }
});

router.get("/database/tables/:tableName", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 25;
    const preview = await store.previewDatabaseTable(req.params.tableName, limit);

    if (!preview) {
      return res.status(404).json({ message: "Database table not found." });
    }

    res.json(preview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load database table preview." });
  }
});

module.exports = router;
