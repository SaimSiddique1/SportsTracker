const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/auth");
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

// Register Route: read username, email, password.
// Check if email exists, hash password w/ bcrypt,
// insert user into database
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
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
    const { email, password } = req.body;

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
