import axios from "axios";

const API_KEY = "123"; // Hard-coded for testing only
const BASE_URL = "https://www.thesportsdb.com/api/v1/json";

// --------------------------------------------------
// Create Axios instance
// --------------------------------------------------
const sportsDB = axios.create({
  baseURL: `${BASE_URL}/${API_KEY}`,
  timeout: 10000,
});

// --------------------------------------------------
// Global error interceptor
// --------------------------------------------------
sportsDB.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("SportsDB API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// --------------------------------------------------
// API FUNCTIONS
// --------------------------------------------------

// Get league information
export const getLeagueDetails = async (leagueId: string) => {
  const res = await sportsDB.get(`/lookupleague.php?id=${leagueId}`);
  return res.data;
};

// Get all teams in a league
export const getLeagueTeams = async (leagueId: string) => {
  const res = await sportsDB.get(`/lookup_all_teams.php?id=${leagueId}`);
  return res.data;
};

// Search for a team by name
export const searchTeam = async (teamName: string) => {
  const res = await sportsDB.get(`/searchteams.php?t=${teamName}`);
  return res.data;
};

// Get all players on a team
export const getTeamPlayers = async (teamId: string) => {
  const res = await sportsDB.get(`/lookup_all_players.php?id=${teamId}`);
  return res.data;
};

// Upcoming matches for a team
export const getNextEvents = async (teamId: string) => {
  const res = await sportsDB.get(`/eventsnext.php?id=${teamId}`);
  return res.data;
};

// Recent matches for a team
export const getLastEvents = async (teamId: string) => {
  const res = await sportsDB.get(`/eventslast.php?id=${teamId}`);
  return res.data;
};

export default {
  getLeagueDetails,
  getLeagueTeams,
  searchTeam,
  getTeamPlayers,
  getNextEvents,
  getLastEvents,
};