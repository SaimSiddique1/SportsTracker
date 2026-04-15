const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const { store } = require("../store");

const router = express.Router();

const normalizeConfigInput = (body) => ({
  registrationEnabled: Boolean(body.registrationEnabled),
  maintenanceMode: Boolean(body.maintenanceMode),
  maintenanceMessage: typeof body.maintenanceMessage === "string"
    ? body.maintenanceMessage.trim()
    : "",
});

router.get("/public", async (req, res) => {
  try {
    const config = await store.getSystemConfig();
    res.json({
      config: {
        registrationEnabled: config.registrationEnabled,
        maintenanceMode: config.maintenanceMode,
        maintenanceMessage: config.maintenanceMessage,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load public system configuration." });
  }
});

router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = await store.getSystemConfig();
    res.json({ config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to load system configuration." });
  }
});

router.put("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const config = normalizeConfigInput(req.body);

    if (!config.maintenanceMessage) {
      return res.status(400).json({
        message: "Maintenance message is required.",
      });
    }

    const updatedConfig = await store.updateSystemConfig(config, req.user.id);

    await store.addAuditEntry({
      actionType: "system_config_updated",
      summary: "Updated system configuration",
      actorUserId: req.user.id,
      targetType: "system_config",
      targetId: "primary",
      details: {
        maintenanceMode: updatedConfig.maintenanceMode,
        registrationEnabled: updatedConfig.registrationEnabled,
      },
    });

    res.json({
      message: "System configuration updated successfully.",
      config: updatedConfig,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to update system configuration." });
  }
});

module.exports = router;
