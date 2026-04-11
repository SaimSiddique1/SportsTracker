import axios from "axios";
// Load API key from environment variables
// Note: Ensure you have a .env file with VITE_SOCCER_API_KEY=your_api_key
const API_KEY = import.meta.env.VITE_SOCCER_API_KEY;
const API_HOST = "football98.p.rapidapi.com";
const BASE_URL = "https://football98.p.rapidapi.com";

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-RapidAPI-Key": API_KEY,
    "X-RapidAPI-Host": API_HOST,
  },
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

export const getCompetitions = async () => {
  const response = await api.get("/competitions");
  return response.data;
};

export const getTeam = async (teamName: string) => {
  const response = await api.get(`/team/${teamName}`);
  return response.data;
};

export const getTeamSquad = async (teamName: string) => {
  const response = await api.get(`/squad/${teamName}`);
  return response.data;
};

export const getLeagueTable = async (competitionName: string) => {
  const response = await api.get(`/${competitionName}`);
  return response.data;
};

export const getFixtures = async (competitionName: string) => {
  const response = await api.get(`/${competitionName}/fixtures`);
  return response.data;
};