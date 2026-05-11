const express = require("express");

const router = express.Router();

const API_KEY = process.env.SPORTSDB_API_KEY || process.env.VITE_SPORTSDB_API_KEY || "123";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const SEARCHABLE_LEAGUES = [
  "English Premier League",
  "Spanish La Liga",
  "German Bundesliga",
  "Italian Serie A",
  "French Ligue 1",
];

let searchableTeamsCache = null;

const normalize = (value = "") =>
  value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const safeTeams = (data) => (Array.isArray(data?.teams) ? data.teams : []);

const fieldsMatchQuery = (fields, query) => {
  const normalizedQuery = normalize(query);
  const searchableFields = fields
    .filter(Boolean)
    .map(normalize);

  return searchableFields.some((field) => {
    if (!field || !normalizedQuery) {
      return false;
    }

    return field.includes(normalizedQuery) || normalizedQuery.includes(field);
  });
};

const teamNameMatchesQuery = (team, query) =>
  fieldsMatchQuery(
    [team.strTeam, team.strTeamShort, team.strTeamAlternate, team.strKeywords],
    query
  );

const rosterTeamMatchesQuery = (team, query) =>
  fieldsMatchQuery(
    [
      team.strTeam,
      team.strTeamShort,
      team.strTeamAlternate,
      team.strKeywords,
      team.strLeague,
      team.strCountry,
    ],
    query
  );

const fetchSportsDb = async (path, params) => {
  const url = new URL(`${BASE_URL}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`TheSportsDB responded with ${response.status}`);
  }

  return response.json();
};

const getSearchableTeams = async () => {
  if (searchableTeamsCache) {
    return searchableTeamsCache;
  }

  const leagueResponses = await Promise.all(
    SEARCHABLE_LEAGUES.map((league) =>
      fetchSportsDb("search_all_teams.php", { l: league }).catch(() => ({ teams: [] }))
    )
  );

  const teamsById = new Map();

  leagueResponses.flatMap(safeTeams).forEach((team) => {
    if (team.idTeam) {
      teamsById.set(team.idTeam, team);
    }
  });

  searchableTeamsCache = [...teamsById.values()];
  return searchableTeamsCache;
};

router.get("/search-teams", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  if (!query) {
    return res.status(400).json({ teams: [], message: "Team search query is required." });
  }

  try {
    const data = await fetchSportsDb("searchteams.php", { t: query });
    const directMatches = safeTeams(data).filter((team) => teamNameMatchesQuery(team, query));
    const teams = directMatches.length
      ? directMatches
      : (await getSearchableTeams()).filter((team) => rosterTeamMatchesQuery(team, query));

    res.json({ teams });
  } catch (error) {
    console.error("SportsDB team search failed:", error);
    res.status(502).json({ teams: [], message: "Team search provider is unavailable." });
  }
});

router.get("/teams-by-league", async (req, res) => {
  const league = typeof req.query.league === "string" ? req.query.league.trim() : "";

  if (!league) {
    return res.status(400).json({ teams: [], message: "League name is required." });
  }

  try {
    const data = await fetchSportsDb("search_all_teams.php", { l: league });
    res.json({ teams: safeTeams(data) });
  } catch (error) {
    console.error("SportsDB league team lookup failed:", error);
    res.status(502).json({ teams: [], message: "Team search provider is unavailable." });
  }
});

module.exports = router;
