const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const crypto = require("crypto");

const passwordRegex =
  /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

const router = express.Router();

// Register Route: read username, email, password.
// Check if email exists, hash password w/ bcrypt,
// insert user into database
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character.", });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash]
    );

    const newUser = result.rows[0];

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)`,
      [newUser.id, verificationToken, expiresAt]
    );

    console.log(
      `Verify email at: http://localhost:5000/api/auth/verify-email?token=${verificationToken}`
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
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Identifier and password are required.",
      });
    }

    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1 OR username = $1",
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username/email or password.",
      });
    }

    const user = result.rows[0];

    if (!user.email_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username/email or password.",
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
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
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    const tokenResult = await pool.query(
      `SELECT * FROM email_verification_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const verificationRecord = tokenResult.rows[0];

    await pool.query(
      `UPDATE users
       SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [verificationRecord.user_id]
    );

    await pool.query(
      `UPDATE email_verification_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [verificationRecord.id]
    );

    res.json({ message: "Email verified successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error during email verification." });
  }
});

module.exports = router;