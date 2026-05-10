import axios from "axios";

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

const isEmptyResponse = (data: unknown) => {
  if (data == null) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === "string") return data.trim().length === 0;
  if (typeof data === "object") return Object.keys(data as Record<string, unknown>).length === 0;
  return false;
};

export const getCompetitions = async () => {
  const response = await api.get("/competitions");
  return response.data;
};

export const getLeagueTable = async (championship: string) => {
  const response = await api.get(`/${championship}/table`);
  if (isEmptyResponse(response.data)) {
    throw new Error(`Empty league table returned for ${championship}`);
  }
  return response.data;
};

export const getSquadByName = async (
  championship: string,
  squadName: string
) => {
  const response = await api.get(
    `/${championship}/squadname/${encodeURIComponent(squadName)}`
  );
  if (isEmptyResponse(response.data)) {
    throw new Error(`No squad data returned for ${squadName}`);
  }
  return response.data;
};

export const getSquadByPosition = async (
  championship: string,
  squadPosition: number
) => {
  const response = await api.get(
    `/${championship}/table/squadposition/${squadPosition}`
  );
  if (isEmptyResponse(response.data)) {
    throw new Error(`No squad data returned for position ${squadPosition}`);
  }
  return response.data;
};

export const getFixtures = async (championship: string) => {
  const response = await api.get(`/${championship}/fixtures/`);
  if (isEmptyResponse(response.data)) {
    throw new Error(`No fixtures returned for ${championship}`);
  }
  return response.data;
};

    
export const getResults = async (championship: string) => {
  const response = await api.get(`/${championship}/results/`);
  if (isEmptyResponse(response.data)) {
    throw new Error(`No results returned for ${championship}`);
  }
  return response.data;
};

export const getNews = async (championship: string) => {
  const response = await api.get(`/${championship}/news/`);
  if (isEmptyResponse(response.data)) {
    throw new Error(`No news returned for ${championship}`);
  }
  return response.data;
};

export const getTransfers = async (championship: string) => {
  const response = await api.get(`/${championship}/transfers/`);
  if (isEmptyResponse(response.data)) {
    throw new Error(`No transfers returned for ${championship}`);
  }
  return response.data;
};
