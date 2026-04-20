import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Eye, EyeOff, CheckCircle, AlertCircle,
  Loader2, ChevronLeft, BarChart3, Megaphone, RefreshCw, Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listOrganizerEvents, getEventBannerUrl } from '../../services/eventService';
import {
  getLeaderboard, computeLeaderboardFromEvals, reRankEvent
} from '../../services/evaluationService';
import { databases, DB_ID, COLLECTIONS } from '../../lib/appwrite';
import { Query } from 'appwrite';
import type { FullEvent, LeaderboardEntry } from '../../types';

export default function ResultsManagement() {
  const { profile } = useAuth();

  const [events, setEvents] = useState<FullEvent[]>([]);
  const [selectedEvent, setSelected] = useState<FullEvent | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load organizer's events ───────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    listOrganizerEvents(profile.$id)
      .then((evs) => {
        setEvents(evs);
        if (evs.length) setSelected(evs[0]);
      })
      .finally(() => setIsLoadingEvents(false));
  }, [profile?.$id]);

  // ── Load leaderboard preview when event changes ───────────────────────────
  useEffect(() => {
    if (!selectedEvent) return;
    setIsLoadingBoard(true);
    setEntries([]);

    const load = async () => {
      // Try leaderboard collection first; fall back to computing from evaluations
      let rows = await getLeaderboard(selectedEvent.$id, false); // visibleOnly=false for organizer
      if (!rows.length) {
        rows = await computeLeaderboardFromEvals(selectedEvent.$id);
      }
      setEntries(rows);
    };
    load().catch(console.error).finally(() => setIsLoadingBoard(false));
  }, [selectedEvent?.$id]);

  // ── Recompute rankings manually ───────────────────────────────────────────
  const handleRecompute = async () => {
    if (!selectedEvent) return;
    setIsRecomputing(true);
    try {
      await reRankEvent(selectedEvent.$id);
      const rows = await getLeaderboard(selectedEvent.$id, false);
      setEntries(rows.length ? rows : await computeLeaderboardFromEvals(selectedEvent.$id));
      showToast('Rankings recomputed successfully');
    } catch (e: any) {
      showToast(e?.message || 'Recompute failed', 'err');
    } finally {
      setIsRecomputing(false);
    }
  };

  // ── Publish results ───────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!selectedEvent) return;
    setIsPublishing(true);
    try {
      // Recompute first to ensure rankings are fresh
      await reRankEvent(selectedEvent.$id);

      // Update event to resultsPublished=true + status=completed
      await databases.updateDocument(DB_ID, COLLECTIONS.EVENTS, selectedEvent.$id, {
        resultsPublished: true,
        status: 'completed',
      });

      // Update local state
      setSelected({ ...selectedEvent, resultsPublished: true, status: 'completed' });
      setEvents((prev) => prev.map(ev =>
        ev.$id === selectedEvent.$id
          ? { ...ev, resultsPublished: true, status: 'completed' }
          : ev
      ));

      // Notify all participants (in-app)
      await notifyParticipants(selectedEvent.$id, selectedEvent.title);

      showToast(`✓ Results for "${selectedEvent.title}" are now public!`);
    } catch (e: any) {
      showToast(e?.message || 'Failed to publish', 'err');
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Notify participants of results ────────────────────────────────────────
  async function notifyParticipants(eventId: string, eventTitle: string) {
    try {
      const regs = await databases.listDocuments(DB_ID, COLLECTIONS.REGISTRATIONS, [
        Query.equal('eventId', eventId),
        Query.limit(500),
      ]);
      await Promise.all(
        regs.documents.map((reg: any) =>
          databases.createDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, 'unique()', {
            userId: reg.userId,
            title: '🏆 Results Published!',
            body: `The results for "${eventTitle}" are now live. Check the leaderboard to see your ranking!`,
            type: 'result',
            referenceId: eventId,
            isRead: false,
          }).catch(() => { }) // non-critical
        )
      );
    } catch { /* non-critical */ }
  }

  // ── Toggle entry visibility ───────────────────────────────────────────────
  const toggleVisibility = async (entry: LeaderboardEntry) => {
    if (!entry.$id || entry.$id.startsWith('computed-')) {
      showToast('Save leaderboard first by recomputing', 'err');
      return;
    }
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.LEADERBOARD, entry.$id, {
        isVisible: !entry.isVisible,
      });
      setEntries((prev) => prev.map(e => e.$id === entry.$id ? { ...e, isVisible: !e.isVisible } : e));
    } catch (e: any) {
      showToast(e?.message || 'Failed to toggle', 'err');
    }
  };

  const evaluatedCount = entries.filter(e => e.totalScore > 0).length;
  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/organizer/dashboard"
          className="flex items-center gap-1 text-cyber-gray hover:text-cyber-cyan mb-6 text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />Back
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Results Management</h1>
            <p className="text-cyber-gray">Review evaluations and publish results per event</p>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${toast.type === 'ok' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
            }`}>
            {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {isLoadingEvents ? (
          <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Trophy className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray mb-4">No events yet.</p>
            <Link to="/organizer/create-event" className="cyber-button-primary">Create Event</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Event list */}
            <div className="lg:col-span-1">
              <div className="cyber-card p-4">
                <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Events</h2>
                <div className="space-y-2">
                  {events.map((ev) => (
                    <button key={ev.$id} onClick={() => setSelected(ev)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${selectedEvent?.$id === ev.$id ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-cyber-cyan/20 hover:border-cyber-cyan/40'
                        }`}>
                      <p className={`font-medium text-sm truncate ${selectedEvent?.$id === ev.$id ? 'text-cyber-cyan' : 'text-white'}`}>
                        {ev.title}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className={`text-xs capitalize ${ev.status === 'completed' ? 'text-green-400' : ev.status === 'ongoing' ? 'text-blue-400' : 'text-cyber-gray'}`}>
                          {ev.status}
                        </span>
                        {ev.resultsPublished && (
                          <span className="text-xs text-yellow-400 flex items-center gap-1">
                            <Trophy className="w-3 h-3" />Live
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results panel */}
            <div className="lg:col-span-3 space-y-6">
              {selectedEvent && (
                <>
                  {/* Stats + actions bar */}
                  <div className="cyber-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-white font-heading font-semibold text-lg">{selectedEvent.title}</p>
                        <p className="text-cyber-gray text-sm">
                          {evaluatedCount} team{evaluatedCount !== 1 ? 's' : ''} evaluated
                          {selectedEvent.resultsPublished && <span className="text-green-400 ml-2">· Results live</span>}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Recompute rankings */}
                        <button onClick={handleRecompute} disabled={isRecomputing}
                          className="cyber-button flex items-center gap-2 text-sm disabled:opacity-50">
                          {isRecomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Recompute
                        </button>

                        {/* View public leaderboard */}
                        <Link to={`/leaderboard?event=${selectedEvent.$id}`}
                          className="cyber-button flex items-center gap-2 text-sm">
                          <BarChart3 className="w-4 h-4" />Preview
                        </Link>

                        {/* Publish results */}
                        {!selectedEvent.resultsPublished ? (
                          <button onClick={handlePublish} disabled={isPublishing || entries.length === 0}
                            className="cyber-button-primary flex items-center gap-2 text-sm disabled:opacity-50">
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                            Publish Results
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/40 rounded-lg text-sm text-green-400">
                            <CheckCircle className="w-4 h-4" />Published
                          </div>
                        )}
                      </div>
                    </div>

                    {entries.length === 0 && !isLoadingBoard && (
                      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-400 text-sm">
                          No evaluations found for this event. Judges need to score submissions first.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Leaderboard preview */}
                  {isLoadingBoard ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
                  ) : entries.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-white font-heading font-semibold">
                          Rankings Preview
                          {!selectedEvent.resultsPublished && (
                            <span className="text-yellow-400 text-sm font-normal ml-2">
                              (only you can see this)
                            </span>
                          )}
                        </h2>
                        <p className="text-cyber-gray text-xs">Toggle visibility per team</p>
                      </div>

                      {entries.map((entry) => (
                        <div key={entry.teamId || entry.$id}
                          className={`cyber-card p-4 flex items-center gap-4 transition-all ${!entry.isVisible ? 'opacity-50' : ''}`}>
                          {/* Rank */}
                          <div className="w-10 h-10 rounded-full bg-cyber-cyan/5 border border-cyber-cyan/20 flex items-center justify-center flex-shrink-0">
                            <span className={`font-bold ${rankColors[entry.rank - 1] || 'text-cyber-gray'}`}>
                              {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{entry.teamName}</p>
                            <p className="text-cyber-gray text-xs truncate">{entry.projectName}</p>
                            <div className="flex gap-3 mt-1 text-xs text-cyber-gray">
                              <span>Innovation: <span className="text-white">{entry.innovation}</span></span>
                              <span>Execution: <span className="text-white">{entry.execution}</span></span>
                              <span>Presentation: <span className="text-white">{entry.presentation}</span></span>
                              <span>Impact: <span className="text-white">{entry.impact}</span></span>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-center">
                              <p className="text-cyber-cyan font-bold text-xl">{entry.totalScore}</p>
                              <p className="text-cyber-gray text-xs">/100</p>
                            </div>
                            {/* Visibility toggle */}
                            <button onClick={() => toggleVisibility(entry)}
                              className={`p-2 rounded-lg border transition-colors ${entry.isVisible
                                  ? 'border-cyber-cyan/30 hover:bg-cyber-cyan/10 text-cyber-cyan'
                                  : 'border-gray-500/30 hover:bg-gray-500/10 text-gray-400'
                                }`}
                              title={entry.isVisible ? 'Hide from leaderboard' : 'Show on leaderboard'}>
                              {entry.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
