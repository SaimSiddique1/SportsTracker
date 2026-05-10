const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { store } = require("../store");

const router = express.Router();

const PROVIDER = "thesportsdb";

const normalizePlayerPayload = (player) => ({
  provider: PROVIDER,
  externalId: String(player?.idPlayer || "").trim(),
  playerName: String(player?.strPlayer || "").trim(),
  teamName: player?.strTeam ? String(player.strTeam).trim() : null,
  sport: player?.strSport ? String(player.strSport).trim() : null,
  position: player?.strPosition ? String(player.strPosition).trim() : null,
  imageUrl: player?.strThumb ? String(player.strThumb).trim() : null,
  rawPayload: player,
});

const normalizeTeamPayload = (team) => ({
  provider: PROVIDER,
  externalId: String(team?.idTeam || "").trim(),
  teamName: String(team?.strTeam || "").trim(),
  leagueName: team?.strLeague ? String(team.strLeague).trim() : null,
  country: team?.strCountry ? String(team.strCountry).trim() : null,
  badgeUrl: team?.strTeamBadge ? String(team.strTeamBadge).trim() : null,
  rawPayload: team,
});

router.use(authenticateToken);

router.get("/players", async (req, res) => {
  try {
    const favorites = await store.listFavoritePlayers(req.user.id);
    res.json({ favorites });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error loading favorite players." });
  }
});

router.post("/players", async (req, res) => {
  try {
    const favoriteInput = normalizePlayerPayload(req.body?.player);

    if (!favoriteInput.externalId || !favoriteInput.playerName) {
      return res.status(400).json({
        message: "A full player result with idPlayer and strPlayer is required.",
      });
    }

    const favorite = await store.upsertFavoritePlayer({
      userId: req.user.id,
      ...favoriteInput,
    });

    res.status(201).json({
      message: "Favorite player saved.",
      favorite,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error saving favorite player." });
  }
});

router.delete("/players/:externalId", async (req, res) => {
  try {
    const externalId = String(req.params.externalId || "").trim();

    if (!externalId) {
      return res.status(400).json({ message: "A player external id is required." });
    }

    const removed = await store.deleteFavoritePlayer({
      userId: req.user.id,
      externalId,
    });

    if (!removed) {
      return res.status(404).json({ message: "Favorite player not found." });
    }

    res.json({ message: "Favorite player removed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error removing favorite player." });
  }
});

router.get("/teams", async (req, res) => {
  try {
    const favorites = await store.listFavoriteTeams(req.user.id);
    res.json({ favorites });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error loading favorite teams." });
  }
});

router.post("/teams", async (req, res) => {
  try {
    const favoriteInput = normalizeTeamPayload(req.body?.team);

    if (!favoriteInput.externalId || !favoriteInput.teamName) {
      return res.status(400).json({
        message: "A full team result with idTeam and strTeam is required.",
      });
    }

    const favorite = await store.upsertFavoriteTeam({
      userId: req.user.id,
      ...favoriteInput,
    });

    res.status(201).json({
      message: "Favorite team saved.",
      favorite,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error saving favorite team." });
  }
});

router.delete("/teams/:externalId", async (req, res) => {
  try {
    const externalId = String(req.params.externalId || "").trim();

    if (!externalId) {
      return res.status(400).json({ message: "A team external id is required." });
    }

    const removed = await store.deleteFavoriteTeam({
      userId: req.user.id,
      externalId,
    });

    if (!removed) {
      return res.status(404).json({ message: "Favorite team not found." });
    }

    res.json({ message: "Favorite team removed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error removing favorite team." });
  }
});

module.exports = router;
