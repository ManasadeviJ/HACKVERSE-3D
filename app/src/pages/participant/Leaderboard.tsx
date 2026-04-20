import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Trophy, Medal, Star, TrendingUp, Users, Loader2,
  Lock, ChevronDown, BarChart3, Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLeaderboard, computeLeaderboardFromEvals } from '../../services/evaluationService';
import { listPublishedEvents, getEvent } from '../../services/eventService';
import type { FullEvent, LeaderboardEntry } from '../../types';

// ── Rank medal colours ────────────────────────────────────────────────────────
const RANK_STYLE: Record<number, { bg: string; text: string; label: string; icon: typeof Trophy }> = {
  1: { bg: 'bg-yellow-500/20 border-yellow-500/40', text: 'text-yellow-400', label: '🥇 1st', icon: Trophy },
  2: { bg: 'bg-gray-300/10 border-gray-300/30', text: 'text-gray-300', label: '🥈 2nd', icon: Medal },
  3: { bg: 'bg-orange-500/10 border-orange-400/30', text: 'text-orange-400', label: '🥉 3rd', icon: Award },
};

function ScoreBar({ value, max = 100, color = 'bg-cyber-cyan' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-cyber-cyan/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-xs text-cyber-gray w-8 text-right">{value}</span>
    </div>
  );
}

export default function Leaderboard() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const preselectedEventId = searchParams.get('event');

  const [events, setEvents] = useState<FullEvent[]>([]);
  const [selectedEvent, setSelected] = useState<FullEvent | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [showScoreBreakdown, setShowBreakdown] = useState(false);

  // ── Load all completed/published events ──────────────────────────────────
  useEffect(() => {
    listPublishedEvents()
      .then(async (evs) => {
        // Include completed events too
        const allEvs = evs;
        if (preselectedEventId) {
          try {
            const pre = await getEvent(preselectedEventId);
            if (!allEvs.find(e => e.$id === pre.$id)) allEvs.unshift(pre);
          } catch { /* ignore */ }
        }
        setEvents(allEvs);

        // Auto-select: preselected → first completed → first event
        const pick = allEvs.find(e => e.$id === preselectedEventId)
          || allEvs.find(e => e.resultsPublished)
          || allEvs[0]
          || null;
        setSelected(pick);
      })
      .finally(() => setIsLoadingEvents(false));
  }, [preselectedEventId]);

  // ── Load leaderboard when event changes ──────────────────────────────────
  useEffect(() => {
    if (!selectedEvent) return;
    setIsLoadingBoard(true);
    setEntries([]);

    const loadBoard = async () => {
      if (selectedEvent.resultsPublished) {
        // Results published → load from leaderboard collection (final official scores)
        const rows = await getLeaderboard(selectedEvent.$id, true);
        if (rows.length) {
          setEntries(rows);
        } else {
          // Fallback: compute from evaluations if leaderboard collection is empty
          const computed = await computeLeaderboardFromEvals(selectedEvent.$id);
          setEntries(computed);
        }
      } else {
        // Results not published yet → only organizer/judge can see a preview
        if (profile?.role === 'organizer' || profile?.role === 'judge') {
          const computed = await computeLeaderboardFromEvals(selectedEvent.$id);
          setEntries(computed);
        } else {
          setEntries([]); // participants see locked state
        }
      }
    };

    loadBoard().catch(console.error).finally(() => setIsLoadingBoard(false));
  }, [selectedEvent?.$id, profile?.role]);

  const isLocked = selectedEvent && !selectedEvent.resultsPublished && profile?.role === 'participant';
  const myTeamEntry = entries.find(e => {
    // Basic check — could be enhanced if we had teamId in profile
    return false;
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-1">
              Leaderboard
            </h1>
            <p className="text-cyber-gray">Official hackathon results — per event</p>
          </div>
          {/* Score breakdown toggle */}
          <button
            onClick={() => setShowBreakdown(!showScoreBreakdown)}
            className="mt-4 sm:mt-0 flex items-center gap-2 cyber-button text-sm px-3 py-2">
            <BarChart3 className="w-4 h-4" />
            {showScoreBreakdown ? 'Hide Breakdown' : 'Show Breakdown'}
          </button>
        </div>

        {/* Event selector */}
        {isLoadingEvents ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-cyber-cyan animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="cyber-card p-10 text-center">
            <Trophy className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No events with published results yet.</p>
          </div>
        ) : (
          <>
            {/* Event tabs */}
            <div className="mb-6">
              <p className="text-cyber-gray/60 text-xs uppercase tracking-wider mb-3">Select Event</p>
              <div className="flex flex-wrap gap-2">
                {events.map((ev) => (
                  <button key={ev.$id} onClick={() => setSelected(ev)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${selectedEvent?.$id === ev.$id
                        ? 'border-cyber-cyan bg-cyber-cyan/10 text-white'
                        : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
                      }`}>
                    {ev.resultsPublished
                      ? <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      : <Lock className="w-3.5 h-3.5 text-cyber-gray/50" />}
                    <span className="truncate max-w-[180px]">{ev.title}</span>
                    {ev.resultsPublished && (
                      <span className="text-xs text-green-400 font-medium">Published</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected event info */}
            {selectedEvent && (
              <div className="cyber-card p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{selectedEvent.title}</p>
                  <p className="text-cyber-gray text-sm">
                    {selectedEvent.category} · {entries.length} team{entries.length !== 1 ? 's' : ''} scored
                  </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${selectedEvent.resultsPublished
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
                  }`}>
                  {selectedEvent.resultsPublished ? '🟢 Results Live' : '🔒 Results Pending'}
                </div>
              </div>
            )}

            {/* Locked state for participants */}
            {isLocked && (
              <div className="cyber-card p-16 text-center">
                <Lock className="w-16 h-16 text-cyber-gray/30 mx-auto mb-6" />
                <h2 className="text-2xl font-heading font-bold text-white mb-3">Results Not Yet Published</h2>
                <p className="text-cyber-gray max-w-md mx-auto">
                  The organizer hasn't published results for this event yet. Check back after the evaluation period ends.
                </p>
              </div>
            )}

            {/* Judge/organizer preview banner */}
            {selectedEvent && !selectedEvent.resultsPublished && (profile?.role === 'judge' || profile?.role === 'organizer') && entries.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
                <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <p className="text-yellow-400 text-sm">
                  Preview — scores computed from evaluations. Not yet visible to participants until organizer publishes results.
                </p>
              </div>
            )}

            {/* Loading */}
            {isLoadingBoard && (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
            )}

            {/* No entries */}
            {!isLoadingBoard && !isLocked && entries.length === 0 && (
              <div className="cyber-card p-12 text-center">
                <TrendingUp className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
                <p className="text-cyber-gray">No evaluations submitted yet for this event.</p>
              </div>
            )}

            {/* Leaderboard entries */}
            {!isLoadingBoard && !isLocked && entries.length > 0 && (
              <>
                {/* Top 3 podium */}
                {entries.length >= 3 && (
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
                      if (!entry) return <div key={podiumIdx} />;
                      const heights = ['h-28', 'h-36', 'h-24'];
                      const labels = ['2nd', '1st', '3rd'];
                      const colors = ['text-gray-300', 'text-yellow-400', 'text-orange-400'];
                      return (
                        <div key={entry.teamId} className="flex flex-col items-center">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center mb-2">
                            <span className="text-cyber-dark font-bold text-lg">{entry.teamName.charAt(0)}</span>
                          </div>
                          <p className="text-white text-sm font-semibold text-center truncate w-full text-center">{entry.teamName}</p>
                          <p className={`text-xs font-bold ${colors[podiumIdx]}`}>{entry.totalScore}/100</p>
                          <div className={`w-full ${heights[podiumIdx]} mt-2 rounded-t-lg flex items-end justify-center pb-2 ${podiumIdx === 1 ? 'bg-yellow-500/20 border-t border-yellow-500/40' :
                              podiumIdx === 0 ? 'bg-gray-300/10 border-t border-gray-300/30' :
                                'bg-orange-500/10 border-t border-orange-400/30'
                            }`}>
                            <span className={`text-lg font-bold ${colors[podiumIdx]}`}>{labels[podiumIdx]}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full table */}
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const rank = entry.rank;
                    const rs = RANK_STYLE[rank] || { bg: 'bg-cyber-cyan/5 border-cyber-cyan/20', text: 'text-cyber-gray', label: `#${rank}`, icon: Star };
                    return (
                      <div key={entry.teamId || entry.$id}
                        className={`cyber-card p-5 border ${rs.bg} transition-all hover:shadow-neon-sm`}>
                        <div className="flex items-start gap-4">
                          {/* Rank */}
                          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${rank <= 3 ? rs.bg : 'bg-cyber-cyan/5 border-cyber-cyan/20'
                            }`}>
                            <span className={`text-lg font-bold ${rank <= 3 ? rs.text : 'text-cyber-gray'}`}>
                              {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                            </span>
                          </div>

                          {/* Team info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                              <p className="text-white font-heading font-semibold">{entry.teamName}</p>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5 text-cyber-gray" />
                                  <span className="text-cyber-gray text-xs">{entry.memberCount}</span>
                                </div>
                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${rs.bg}`}>
                                  <Star className={`w-4 h-4 ${rs.text}`} />
                                  <span className={`font-bold text-lg ${rs.text}`}>{entry.totalScore}</span>
                                  <span className="text-cyber-gray text-xs">/100</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-cyber-gray text-sm mb-3">{entry.projectName}</p>

                            {/* Score breakdown */}
                            {showScoreBreakdown && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-cyber-cyan/10">
                                {[
                                  { label: 'Innovation', value: entry.innovation, color: 'bg-purple-400' },
                                  { label: 'Execution', value: entry.execution, color: 'bg-blue-400' },
                                  { label: 'Presentation', value: entry.presentation, color: 'bg-green-400' },
                                  { label: 'Impact', value: entry.impact, color: 'bg-orange-400' },
                                ].map(({ label, value, color }) => (
                                  <div key={label}>
                                    <p className="text-cyber-gray text-xs mb-1">{label}</p>
                                    <ScoreBar value={value} color={color} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
