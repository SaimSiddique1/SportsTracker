import axios from "axios";

// RapidAPI credentials
const API_KEY = "b30087d7b9msh0e215936cf1cd32p1dc681jsn6ff77ad2fdb8";
const API_HOST = "football98.p.rapidapi.com";
const BASE_URL = "https://football98.p.rapidapi.com";

// Create Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-RapidAPI-Key": API_KEY,
    "X-RapidAPI-Host": API_HOST
  }
});

/*
  ==============================
  API FUNCTIONS
  ==============================
*/

// Get all competitions
export const getCompetitions = async () => {
  try {
    const response = await api.get("/competitions");

    console.log("Competitions:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching competitions:", error.response?.data || error.message);
    throw error;
  }
};

// Get teams in a competition
export const getTeamsInCompetition = async (competitionName) => {
  try {
    const response = await api.get(`/teams/${competitionName}`);

    console.log("Teams:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching teams:", error.response?.data || error.message);
    throw error;
  }
};

// Get team details
export const getTeam = async (teamName) => {
  try {
    const response = await api.get(`/team/${teamName}`);

    console.log("Team Data:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching team:", error.response?.data || error.message);
    throw error;
  }
};

// Get team squad
export const getTeamSquad = async (teamName) => {
  try {
    const response = await api.get(`/squad/${teamName}`);

    console.log("Squad:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching squad:", error.response?.data || error.message);
    throw error;
  }
};

// Get league table
export const getLeagueTable = async (competitionName) => {
  try {
    const response = await api.get(`/table/${competitionName}`);

    console.log("League Table:", response.data);
    return response.data;

  } catch (error) {
    console.error("Error fetching table:", error.response?.data || error.message);
    throw error;
  }
};