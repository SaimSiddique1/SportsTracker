import axios from "axios";
//load API key from .env file, for SPORTSDB 
const API_KEY = import.meta.env.VITE_SPORTSDB_API_KEY; 
const BASE_URL = "https://www.thesportsdb.com/api/v1/json/123";

// Create axios instance (no API key required for free tier)
const api = axios.create({
  baseURL: BASE_URL,
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
  (error) => {
    return Promise.reject(error);
  }
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
API FUNCTIONS
==============================
*/

export const getTeamsByLeague = async (leagueName: string) => {
  const response = await api.get(`/search_all_teams.php?l=${encodeURIComponent(leagueName)}`);
  return response.data.teams;
};

export const getLeagueTable = async (leagueId: string, season: string) => {
  const response = await api.get(`/lookuptable.php?l=${leagueId}&s=${season}`);
  return response.data.table;
};

export const searchPlayer = async (playerName: string) => {
  const response = await api.get(`/searchplayers.php?p=${encodeURIComponent(playerName)}`);
  return response.data.player;
};

export const getPlayerStats = async (playerId: string) => {
  const response = await api.get(`/lookupplayer.php?id=${playerId}`);
  return response.data.players;
};
