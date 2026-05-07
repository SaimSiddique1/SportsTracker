import axios from "axios";

const API_KEY = import.meta.env.VITE_SPORTSDB_API_KEY || "123";
const BASE_URL = `https://www.thesportsdb.com/api/v1/json/${API_KEY}`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Interceptors
api.interceptors.request.use((config) => {
  console.log(`API Request -> ${config.baseURL}${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`API Success <- ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

// Helpers
const safeArray = (data: any) => (Array.isArray(data) ? data : []);

const filterSoccer = (items: any[]) => {
  return items.filter(
    (item) =>
      item?.strSport === "Soccer" ||
      item?.strSport === "Football"
  );
};

// Optional league IDs
export const LEAGUES = {
  EPL: "4328",
  LALIGA: "4335",
  SERIE_A: "4332",
};

// API Functions

export const getTeamsByLeague = async (leagueName: string) => {
  try {
    const res = await api.get(
      `/search_all_teams.php?l=${encodeURIComponent(leagueName)}`
    );
    return filterSoccer(safeArray(res.data.teams));
  } catch {
    return [];
  }
};

export const searchTeam = async (teamName: string) => {
  try {
    const res = await api.get(
      `/searchteams.php?t=${encodeURIComponent(teamName)}`
    );
    return filterSoccer(safeArray(res.data.teams));
  } catch {
    return [];
  }
};

export const getLeagueTable = async (leagueId: string, season: string) => {
  try {
    const res = await api.get(
      `/lookuptable.php?l=${leagueId}&s=${season}`
    );
    return safeArray(res.data.table);
  } catch {
    return [];
  }
};

export const searchPlayer = async (playerName: string) => {
  try {
    const res = await api.get(
      `/searchplayers.php?p=${encodeURIComponent(playerName)}`
    );
    return filterSoccer(safeArray(res.data.player));
  } catch {
    return [];
  }
};

export const getPlayerStats = async (playerId: string) => {
  try {
    const res = await api.get(`/lookupplayer.php?id=${playerId}`);
    return filterSoccer(safeArray(res.data.players));
  } catch {
    return [];
  }
};

export const getRecentLeagueMatches = async (leagueId: string) => {
  try {
    const res = await api.get(`/eventspastleague.php?id=${leagueId}`);
    return safeArray(res.data.events);
  } catch {
    return [];
  }
};