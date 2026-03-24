import axios from "axios";

const BASE_URL = "https://football98.p.rapidapi.com";
const API_KEY = "b30087d7b9msh0e215936cf1cd32p1dc681jsn6ff77ad2fdb8";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "x-rapidapi-key": API_KEY,
    "x-rapidapi-host": "football98.p.rapidapi.com",
  },
});

// Log every request
api.interceptors.request.use((req) => {
  console.log(`API Request -> ${req.baseURL}${req.url}`);
  return req;
});

// Log every response/error
api.interceptors.response.use(
  (res) => {
    console.log(`API Success <- ${res.request.responseURL.replace(BASE_URL, "")}`);
    return res;
  },
  (error) => {
    console.error("API Response Error:", error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: "Unknown error" });
  }
);

/**
 * 1. Get all competitions (root data structure)
 */
export async function getCompetitions() {
  return (await api.get("/competitions")).data;
}

/**
 * 2. Get specific league object (e.g., laliga, premierleague, bundesliga)
 */
export async function getLeague(league: string) {
  const competitions = await getCompetitions();
  return competitions[league] || null;
}

/**
 * 3. Get all teams in a given league
 */
export async function getTeams(league: string) {
  const leagueData = await getLeague(league);
  return leagueData?.teams || [];
}

/**
 * 4. Get squad for a specific team
 */
export async function getSquad(league: string, teamName: string) {
  const leagueData = await getLeague(league);
  if (!leagueData) return [];

  const team = leagueData.teams.find(
    (t: any) => t.name.toLowerCase() === teamName.toLowerCase()
  );

  return team?.players || [];
}

/**
 * 5. Get league table
 */
export async function getLeagueTable(league: string) {
  const leagueData = await getLeague(league);
  return leagueData?.standings || [];
}