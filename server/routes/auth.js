const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

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

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const passwordValidationMessage = validatePassword(password);
    if (passwordValidationMessage) {
      return res.status(400).json({ message: passwordValidationMessage });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash]
    );

    res.status(201).json({
      message: "User registered successfully",
      user: result.rows[0],
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

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.put("/profile", async (req, res) => {
  try {
    const { email, username, currentPassword, newPassword } = req.body;

    if (!email || !username) {
      return res.status(400).json({ message: "Email and username are required." });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = result.rows[0];

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

    const updateResult = await pool.query(
      `UPDATE users
       SET username = $1, password_hash = $2
       WHERE email = $3
       RETURNING id, username, email`,
      [username, passwordHash, email]
    );

    res.json({
      message: "Profile updated successfully.",
      user: updateResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during profile update." });
  }
});

module.exports = router;
