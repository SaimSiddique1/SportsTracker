import { useEffect } from "react";
import {
  getCompetitions,
  getLeague,
  getTeams,
  getSquad,
  getLeagueTable
} from "./soccerAPI";

function App() {
  useEffect(() => {
    async function testAPI() {
      console.log("=== Testing Football98 API ===");

      try {
        const competitions = await getCompetitions();
        console.log("Competitions:", competitions);
      } catch (e: any) {
        console.error("Competitions Error:", e.message);
      }

      try {
        const laliga = await getLeague("laliga");
        console.log("LaLiga League Object:", laliga);
      } catch (e: any) {
        console.error("League Error:", e.message);
      }

      try {
        const teams = await getTeams("laliga");
        console.log("Teams in LaLiga:", teams);
      } catch (e: any) {
        console.error("Teams Error:", e.message);
      }

      try {
        const squad = await getSquad("laliga", "barcelona");
        console.log("Barcelona Squad:", squad);
      } catch (e: any) {
        console.error("Squad Error:", e.message);
      }

      try {
        const table = await getLeagueTable("laliga");
        console.log("LaLiga Table:", table);
      } catch (e: any) {
        console.error("League Table Error:", e.message);
      }
    }

    testAPI();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Football98 API Test</h1>
      <p>Open Console to view the API results.</p>
    </div>
  );
}

export default App;