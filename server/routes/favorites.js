const express = require("express");
const pool = require("../db");

const router = express.Router();

router.post("/teams", async (req, res) => {
  try {
    const { user_id, team_name } = req.body;

    if (!user_id || !team_name) {
      return res.status(400).json({ message: "user_id and team_name are required." });
    }

    const result = await pool.query(
      `INSERT INTO favorite_teams (user_id, team_name)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, team_name]
    );

    res.status(201).json({
      message: "Favorite team added.",
      favorite: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error adding favorite team." });
  }
});

router.post("/players", async (req, res) => {
  try {
    const { user_id, player_name } = req.body;

    if (!user_id || !player_name) {
      return res.status(400).json({ message: "user_id and player_name are required." });
    }

    const result = await pool.query(
      `INSERT INTO favorite_players (user_id, player_name)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, player_name]
    );

    res.status(201).json({
      message: "Favorite player added.",
      favorite: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error adding favorite player." });
  }
});

module.exports = router;