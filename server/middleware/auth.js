const jwt = require("jsonwebtoken");
const { store } = require("../store");
const jwtSecret = process.env.JWT_SECRET || "dev_only_sports_tracker_secret";

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Authentication token is required." });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await store.findUserById(payload.id);

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (user.disabled) {
      return res.status(403).json({ message: "This account has been disabled by an admin." });
    }

    if (payload.sessionId) {
      const sessionActive = await store.isSessionActive(payload.sessionId);
      if (!sessionActive) {
        return res.status(401).json({ message: "This session has been revoked." });
      }

      await store.touchSession(payload.sessionId);
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
      sessionId: payload.sessionId || null,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access is required to modify system configuration.",
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
};
