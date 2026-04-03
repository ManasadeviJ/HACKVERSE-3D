import { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, Users, Search } from 'lucide-react';
import { getLeaderboard } from '../../services/evaluationService';
import { listPublishedEvents } from '../../services/eventService';
import type { LeaderboardEntry, HackEvent } from '../../types';

const rankMedal = (rank: number) => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const ScoreBar = ({ value, max = 100 }: { value: number; max?: number }) => (
  <div className="w-full bg-cyber-cyan/10 rounded-full h-1.5">
    <div className="bg-cyber-cyan h-1.5 rounded-full" style={{ width: `${(value / max) * 100}%` }} />
  </div>
);

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listPublishedEvents().then(setEvents);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    getLeaderboard(selectedEvent || undefined, true)
      .then(setEntries)
      .finally(() => setIsLoading(false));
  }, [selectedEvent]);

  const filtered = entries.filter(
    (e) =>
      e.teamName.toLowerCase().includes(search.toLowerCase()) ||
      e.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-4xl font-heading font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-cyber-gray">Real-time hackathon rankings</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search team or project..." className="cyber-input pl-12 w-full" />
          </div>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
            className="cyber-input sm:w-56">
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.$id} value={ev.$id}>{ev.title}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyber-cyan" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Trophy className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No results published yet</p>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {top3.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, i) => {
                  const podiumOrder = [2, 1, 3][i];
                  const heights = ['h-28', 'h-36', 'h-24'];
                  return (
                    <div key={entry.$id} className={`cyber-card p-4 text-center flex flex-col items-center ${i === 1 ? 'border-yellow-400/40' : ''}`}>
                      <div className="text-3xl mb-2">{rankMedal(podiumOrder)}</div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center mb-2">
                        <span className="text-lg font-bold text-cyber-dark">{entry.teamName.charAt(0)}</span>
                      </div>
                      <p className="text-white font-semibold text-sm truncate w-full">{entry.teamName}</p>
                      <p className="text-cyber-gray text-xs truncate w-full mb-2">{entry.projectName}</p>
                      <span className={`text-lg font-bold ${i === 1 ? 'text-yellow-400' : 'text-cyber-cyan'}`}>
                        {entry.totalScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Table */}
            <div className="cyber-card overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-cyber-cyan/20">
                  <tr>
                    {['Rank', 'Team / Project', 'Innovation', 'Execution', 'Presentation', 'Impact', 'Total', 'Members'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-cyber-gray text-sm font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry, idx) => (
                    <tr key={entry.$id}
                      className={`border-b border-cyber-cyan/10 hover:bg-cyber-cyan/5 transition-colors ${idx < 3 ? 'bg-cyber-cyan/5' : ''}`}>
                      <td className="px-4 py-3 text-lg font-bold">{rankMedal(entry.rank)}</td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{entry.teamName}</p>
                        <p className="text-cyber-gray text-xs">{entry.projectName}</p>
                      </td>
                      {[entry.innovation, entry.execution, entry.presentation, entry.impact].map((score, si) => (
                        <td key={si} className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-white text-sm font-medium">{score}</span>
                            <ScoreBar value={score} />
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <span className="text-cyber-cyan font-bold text-lg">{entry.totalScore}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1 text-cyber-gray text-sm">
                          <Users className="w-4 h-4" /><span>{entry.memberCount}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
