import axios from "axios";

const API_KEY = import.meta.env.VITE_SPORTSDB_API_KEY || "123";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // prevents hanging requests
});

/*
==============================
AXIOS INTERCEPTORS
==============================
*/

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request -> ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Success <- ${response.config.url}`);
    return response;
  },
  (error) => {
    let errorMessage = "Unexpected error occurred.";

    if (error.response) {
      console.error("API Response Error:", error.response.data);
      errorMessage =
        error.response.data?.message ||
        `Server error (${error.response.status})`;
    } else if (error.request) {
      console.error("API No Response:", error.request);
      errorMessage = "No response from API server.";
    } else {
      console.error("API Request Error:", error.message);
      errorMessage = error.message;
    }

    return Promise.reject({
      error: true,
      message: errorMessage,
    });
  }
);

/*
==============================
HELPERS
==============================
*/

// Prevent null crashes
const safeArray = (data: any) => (Array.isArray(data) ? data : []);

// Optional: Common league IDs (very useful for your UI)
export const LEAGUES = {
  EPL: "4328",
  LALIGA: "4335",
  SERIE_A: "4332",
};

/*
==============================
API FUNCTIONS
==============================
*/

// Get all teams in a league (by name)
export const getTeamsByLeague = async (leagueName: string) => {
  try {
    const response = await api.get(
      `/search_all_teams.php?l=${encodeURIComponent(leagueName)}`
    );
    return safeArray(response.data.teams);
  } catch (err: any) {
    console.error("getTeamsByLeague failed:", err.message);
    return [];
  }
};

export const searchTeam = async (teamName: string) => {
  const response = await api.get(`/searchteams.php?t=${encodeURIComponent(teamName)}`);
  return response.data.teams;
};

export const getLeagueTable = async (leagueId: string, season: string) => {
  try {
    const response = await api.get(
      `/lookuptable.php?l=${leagueId}&s=${season}`
    );
    return safeArray(response.data.table);
  } catch (err: any) {
    console.error("getLeagueTable failed:", err.message);
    return [];
  }
};

// Search players by name
export const searchPlayer = async (playerName: string) => {
  try {
    const response = await api.get(
      `/searchplayers.php?p=${encodeURIComponent(playerName)}`
    );
    return safeArray(response.data.player);
  } catch (err: any) {
    console.error("searchPlayer failed:", err.message);
    return [];
  }
};

// Get player details by ID
export const getPlayerStats = async (playerId: string) => {
  try {
    const response = await api.get(`/lookupplayer.php?id=${playerId}`);
    return safeArray(response.data.players);
  } catch (err: any) {
    console.error("getPlayerStats failed:", err.message);
    return [];
  }
};

// Get recent matches in a league
export const getRecentLeagueMatches = async (leagueId: string) => {
  const response = await api.get(`/eventspastleague.php?id=${leagueId}`);
  return response.data.events;
}
