import axios from "axios";

const API_KEY = import.meta.env.VITE_SPORTSDB_API_KEY || "123";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

// Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // prevents hanging requests
});

/*
AXIOS INTERCEPTORS
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
HELPERS
*/

// Prevent null crashes
const safeArray = (data: any) => (Array.isArray(data) ? data : []);

const fetchBackendTeams = async (path: string, params: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}/api/sportsdb/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "SportsDB backend request failed.");
  }

  return safeArray(data.teams);
};

// Optional: Common league IDs (very useful for your UI)
export const LEAGUES = {
  EPL: "4328",
  LALIGA: "4335",
  SERIE_A: "4332",
};

/*
API FUNCTIONS
*/

// Get all teams in a league (by name)
export const getTeamsByLeague = async (leagueName: string) => {
  try {
    return await fetchBackendTeams("teams-by-league", { league: leagueName });
  } catch (err: any) {
    console.error("getTeamsByLeague failed:", err.message);
    return [];
  }
};

export const searchTeam = async (teamName: string) => {
  try {
    return await fetchBackendTeams("search-teams", { q: teamName });
  } catch (err: any) {
    console.error("searchTeam failed:", err.message);
    return [];
  }
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
  try {
    const response = await api.get(`/eventspastleague.php?id=${leagueId}`);
    return safeArray(response.data.events);
  } catch (err: any) {
    console.error("getRecentLeagueMatches failed:", err.message);
    return [];
  }
};
