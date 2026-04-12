import { useEffect, useState } from "react";
import { getLeagueTable } from "./soccerAPI";

interface Team {
  name: string;
  points: number;
}

export default function RealTimeStats() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getLeagueTable("premierleague");

        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.slice(0, 10).map((team: any) => ({
            name: team.name || team.team || "Unknown",
            points: Number(team.points || team.pts || 0),
          }));

          setTeams(formatted);
        } else {
          throw new Error("Empty data");
        }
      } catch (error) {
        console.log("Using fallback data");
        setTeams([
          { name: "Arsenal", points: 70 },
          { name: "Manchester City", points: 61 },
          { name: "Manchester United", points: 55 },
          { name: "Aston Villa", points: 51 },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <p>Loading stats...</p>;
  }

  return (
    <div>
      <h2>Premier League Table</h2>
      {teams.map((team, index) => (
        <div key={index}>
          {team.name} - {team.points} pts
        </div>
      ))}
    </div>
  );
}