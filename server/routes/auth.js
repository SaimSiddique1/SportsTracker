const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../email");
const { store } = require("../store");
const jwtSecret = process.env.JWT_SECRET || "dev_only_sports_tracker_secret";

const router = express.Router();

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }

  return null;
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildPasswordResetUrl = (email, token) => {
  const configuredClientUrl = process.env.CLIENT_BASE_URL;
  const origin = configuredClientUrl || "http://localhost:5173";
  const resetUrl = new URL(origin);
  resetUrl.searchParams.set("resetToken", token);
  resetUrl.searchParams.set("email", email);
  return resetUrl.toString();
};

// Register Route: read username, email, password.
// Check if email exists, hash password w/ bcrypt,
// insert user into database
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const email = normalizeEmail(req.body.email);
    const currentConfig = await store.getSystemConfig();

    if (!currentConfig.registrationEnabled) {
      return res.status(403).json({
        message: "Registration is currently disabled by system configuration.",
      });
    }

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const passwordValidationMessage = validatePassword(password);
    if (passwordValidationMessage) {
      return res.status(400).json({ message: passwordValidationMessage });
    }

    const existingUser = await store.findUserByEmail(email);

    if (existingUser) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const adminCount = await store.countAdmins();
    const role = adminCount === 0 ? "admin" : "user";
    const user = await store.createUser({
      username,
      email,
      passwordHash,
      role,
    });

    await store.addAuditEntry({
      actionType: "user_registered",
      summary: `Registered account for ${email}`,
      actorUserId: user.id,
      targetType: "user",
      targetId: String(user.id),
      details: {
        role: user.role,
      },
    });

    res.status(201).json({
      message: role === "admin"
        ? "User registered successfully. This first account has been granted admin access."
        : "User registered successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// Login Route: look up user by email, 
// compare entered password to stored
// hash, create JWT if valid
router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = normalizeEmail(req.body.email);

    const user = await store.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.disabled) {
      return res.status(403).json({ message: "This account has been disabled by an admin." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const session = await store.createSession({
      userId: user.id,
      label: `${user.username} login`,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, sessionId: session.id },
      jwtSecret,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        disabled: Boolean(user.disabled),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.post("/forgot-password", async (req, res) => {
  const genericMessage = "If an account exists for that email, a password reset link has been sent.";

  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await store.findUserByEmail(email);

    if (!user || user.disabled) {
      return res.json({ message: genericMessage });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const resetUrl = buildPasswordResetUrl(email, token);

    await store.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
    });

    await store.addAuditEntry({
      actionType: "password_reset_requested",
      summary: `Password reset requested for ${email}`,
      actorUserId: user.id,
      targetType: "user",
      targetId: String(user.id),
      details: {
        expiresAt: expiresAt.toISOString(),
      },
    });

    res.json({ message: genericMessage });
  } catch (err) {
    console.error(err);
    if (err.code === "EMAIL_NOT_CONFIGURED") {
      return res.status(503).json({ message: err.message });
    }
    res.status(500).json({ message: "Unable to send password reset email." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const token = String(req.body.token || "");
    const { password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({ message: "Email, reset token, and new password are required." });
    }

    const passwordValidationMessage = validatePassword(password);
    if (passwordValidationMessage) {
      return res.status(400).json({ message: passwordValidationMessage });
    }

    const tokenHash = hashResetToken(token);
    const resetToken = await store.findPasswordResetToken(tokenHash);

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.disabled ||
      resetToken.email.toLowerCase() !== email ||
      new Date(resetToken.expiresAt).getTime() < Date.now()
    ) {
      return res.status(400).json({ message: "This password reset link is invalid or expired." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const updatedUser = await store.updateUserPassword({
      id: resetToken.userId,
      passwordHash,
    });

    await store.markPasswordResetTokenUsed(tokenHash);

    if (updatedUser) {
      await store.addAuditEntry({
        actionType: "password_reset_completed",
        summary: `Password reset completed for ${email}`,
        actorUserId: updatedUser.id,
        targetType: "user",
        targetId: String(updatedUser.id),
      });
    }

    res.json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during password reset." });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;

    if (!username) {
      return res.status(400).json({ message: "Username is required." });
    }

    const user = await store.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    let passwordHash = user.password_hash;

    if (newPassword || currentPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Current password and new password are both required to change your password.",
        });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Current password is incorrect." });
      }

      const passwordValidationMessage = validatePassword(newPassword);
      if (passwordValidationMessage) {
        return res.status(400).json({ message: passwordValidationMessage });
      }

      passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await store.updateUserProfile({
      id: user.id,
      username,
      passwordHash,
    });

    res.json({
      message: "Profile updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during profile update." });
  }
});

module.exports = router;
