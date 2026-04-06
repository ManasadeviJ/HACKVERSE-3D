import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Search, UserCheck, UserX, Plus,
  Loader2, Trophy, AlertCircle, CheckCircle, Mail, Shield, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  listOrganizerEvents, assignJudge, removeJudge,
  parseJudgeIds
} from '../../services/eventService';
import {
  searchProfilesByRole,   // FIX: uses role filter + client-side name match (no index needed)
  getProfileById
} from '../../services/authService';
import type { FullEvent, Profile } from '../../types';

interface JudgeRow extends Profile { isAssigned: boolean }

export default function ManageJudges() {
  const { profile } = useAuth();

  const [events, setEvents] = useState<FullEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FullEvent | null>(null);
  const [assignedJudges, setAssignedJudges] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JudgeRow[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingJudges, setIsLoadingJudges] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    listOrganizerEvents(profile.$id)
      .then((evs) => { setEvents(evs); if (evs.length) setSelectedEvent(evs[0]); })
      .finally(() => setIsLoadingEvents(false));
  }, [profile?.$id]);

  // ── Load assigned judges when event changes ───────────────────────────────
  useEffect(() => {
    if (!selectedEvent) return;
    setIsLoadingJudges(true);
    setAssignedJudges([]);
    const judgeIds = parseJudgeIds(selectedEvent.judgeIds);
    if (!judgeIds.length) { setIsLoadingJudges(false); return; }
    Promise.all(judgeIds.map((id) => getProfileById(id).catch(() => null)))
      .then((ps) => setAssignedJudges(ps.filter(Boolean) as Profile[]))
      .finally(() => setIsLoadingJudges(false));
  }, [selectedEvent?.$id]);

  // ── Search with debounce ───────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (!searchQuery.trim()) {
      // Show ALL judges when search is empty
      searchTimer.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const all = await searchProfilesByRole('judge');
          const assignedIds = parseJudgeIds(selectedEvent?.judgeIds || '[]');
          setSearchResults(all.map((p) => ({ ...p, isAssigned: assignedIds.includes(p.$id) })));
        } finally { setIsSearching(false); }
      }, 0);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // searchProfilesByRole filters by role='judge' first, then name client-side
        const results = await searchProfilesByRole('judge', searchQuery.trim());
        const assignedIds = parseJudgeIds(selectedEvent?.judgeIds || '[]');
        setSearchResults(results.map((p) => ({ ...p, isAssigned: assignedIds.includes(p.$id) })));
      } finally { setIsSearching(false); }
    }, 350);
  }, [searchQuery, selectedEvent?.judgeIds]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Assign ────────────────────────────────────────────────────────────────
  const handleAssign = async (judgeId: string, judgeName: string) => {
    if (!selectedEvent || !profile) return;
    setActionLoading(judgeId);
    try {
      await assignJudge(
        selectedEvent.detailsId, selectedEvent.judgeIds,
        judgeId, selectedEvent.title, profile.name
      );
      const judgeProfile = await getProfileById(judgeId);
      setAssignedJudges((prev) => [...prev, judgeProfile]);
      const newIds = JSON.stringify([...parseJudgeIds(selectedEvent.judgeIds), judgeId]);
      setSelectedEvent({ ...selectedEvent, judgeIds: newIds });
      setEvents((prev) => prev.map((ev) => ev.$id === selectedEvent.$id ? { ...ev, judgeIds: newIds } : ev));
      setSearchResults((prev) => prev.map((r) => r.$id === judgeId ? { ...r, isAssigned: true } : r));
      showToast(`✓ ${judgeName} assigned. They'll be notified.`);
    } catch (e: any) {
      showToast(e?.message || 'Failed to assign judge', 'err');
    } finally { setActionLoading(null); }
  };

  // ── Remove ────────────────────────────────────────────────────────────────
  const handleRemove = async (judgeId: string, judgeName: string) => {
    if (!selectedEvent) return;
    setActionLoading(judgeId);
    try {
      await removeJudge(selectedEvent.detailsId, selectedEvent.judgeIds, judgeId);
      setAssignedJudges((prev) => prev.filter((j) => j.$id !== judgeId));
      const newIds = JSON.stringify(parseJudgeIds(selectedEvent.judgeIds).filter((id) => id !== judgeId));
      setSelectedEvent({ ...selectedEvent, judgeIds: newIds });
      setEvents((prev) => prev.map((ev) => ev.$id === selectedEvent.$id ? { ...ev, judgeIds: newIds } : ev));
      setSearchResults((prev) => prev.map((r) => r.$id === judgeId ? { ...r, isAssigned: false } : r));
      showToast(`${judgeName} removed.`);
    } catch (e: any) {
      showToast(e?.message || 'Failed to remove', 'err');
    } finally { setActionLoading(null); }
  };

  const judgeCount = parseJudgeIds(selectedEvent?.judgeIds || '[]').length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Link to="/organizer/dashboard"
          className="flex items-center gap-1 text-cyber-gray hover:text-cyber-cyan mb-6 text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />Back
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Manage Judges</h1>
            <p className="text-cyber-gray">Search and assign judges to your events</p>
          </div>
          <div className="mt-3 sm:mt-0 flex items-center gap-2 px-3 py-2 bg-cyber-cyan/10 border border-cyber-cyan/30 rounded-lg">
            <Shield className="w-4 h-4 text-cyber-cyan" />
            <span className="text-cyber-cyan text-sm font-medium">{judgeCount} judge{judgeCount !== 1 ? 's' : ''} assigned</span>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${toast.type === 'ok' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
            }`}>
            {toast.type === 'ok' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1">{toast.msg}</span>
            <button onClick={() => setToast(null)}><X className="w-4 h-4" /></button>
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
          <div className="grid lg:grid-cols-5 gap-8">
            {/* ── Event list ──────────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="cyber-card p-4">
                <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Your Events</h2>
                <div className="space-y-2">
                  {events.map((ev) => {
                    const n = parseJudgeIds(ev.judgeIds).length;
                    const sel = selectedEvent?.$id === ev.$id;
                    return (
                      <button key={ev.$id} onClick={() => setSelectedEvent(ev)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${sel ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-cyber-cyan/20 hover:border-cyber-cyan/40'
                          }`}>
                        <p className={`font-medium text-sm truncate ${sel ? 'text-cyber-cyan' : 'text-white'}`}>{ev.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs capitalize ${ev.status === 'published' ? 'text-green-400' : ev.status === 'ongoing' ? 'text-blue-400' : 'text-cyber-gray'}`}>
                            {ev.status}
                          </span>
                          <span className="text-xs text-cyber-gray flex items-center gap-1">
                            <Shield className="w-3 h-3" />{n}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Right: Search + Assigned ─────────────────────── */}
            <div className="lg:col-span-3 space-y-6">
              {selectedEvent && (
                <>
                  {/* Search panel */}
                  <div className="cyber-card p-6">
                    <h2 className="text-white font-heading font-semibold mb-1">
                      Add Judges — {selectedEvent.title}
                    </h2>
                    <p className="text-cyber-gray text-sm mb-4">
                      All users with role <span className="text-cyber-cyan">Judge</span> are listed below.
                      Search by name or email.
                    </p>

                    {/* Search input */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                      <input type="text" value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name or email…"
                        className="cyber-input pl-10" />
                      {isSearching && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-cyan animate-spin" />
                      )}
                    </div>

                    {/* Results */}
                    {searchResults.length === 0 && !isSearching ? (
                      <div className="py-8 text-center">
                        <Shield className="w-10 h-10 text-cyber-gray/30 mx-auto mb-3" />
                        <p className="text-cyber-gray text-sm">
                          No judges found.
                        </p>
                        <p className="text-cyber-gray/60 text-xs mt-1">
                          Make sure users have signed up with role <span className="text-cyber-cyan">Judge</span>.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {searchResults.map((judge) => (
                          <div key={judge.$id}
                            className="flex items-center justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-cyber-dark font-bold text-sm">{judge.name.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-white text-sm font-medium">{judge.name}</p>
                                <p className="text-cyber-gray text-xs">{judge.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => judge.isAssigned
                                ? handleRemove(judge.$id, judge.name)
                                : handleAssign(judge.$id, judge.name)}
                              disabled={actionLoading === judge.$id}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex-shrink-0 ${judge.isAssigned
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                  : 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30 hover:bg-cyber-cyan/30'
                                }`}>
                              {actionLoading === judge.$id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : judge.isAssigned
                                  ? <><UserX className="w-3 h-3" />Remove</>
                                  : <><Plus className="w-3 h-3" />Assign</>}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned judges */}
                  <div className="cyber-card p-6">
                    <h2 className="text-white font-heading font-semibold mb-4 flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-cyber-cyan" />
                      Assigned Judges
                      <span className="text-cyber-gray text-sm font-normal">({assignedJudges.length})</span>
                    </h2>

                    {isLoadingJudges ? (
                      <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 text-cyber-cyan animate-spin" /></div>
                    ) : assignedJudges.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="w-10 h-10 text-cyber-gray/30 mx-auto mb-3" />
                        <p className="text-cyber-gray text-sm">No judges assigned yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assignedJudges.map((judge) => (
                          <div key={judge.$id}
                            className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-cyber-dark font-bold">{judge.name.charAt(0)}</span>
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-cyber-darker flex items-center justify-center">
                                  <CheckCircle className="w-2.5 h-2.5 text-white" />
                                </div>
                              </div>
                              <div>
                                <p className="text-white font-medium">{judge.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-cyber-gray" />
                                  <p className="text-cyber-gray text-xs">{judge.email}</p>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => handleRemove(judge.$id, judge.name)}
                              disabled={actionLoading === judge.$id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50">
                              {actionLoading === judge.$id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserX className="w-3 h-3" />}
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info box */}
                  <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-xl">
                    <p className="text-cyber-cyan text-sm font-semibold mb-2">How judge assignment works</p>
                    <ol className="space-y-1 text-cyber-gray text-sm">
                      <li className="flex items-start gap-2"><span className="text-cyber-cyan font-bold mt-0.5">1.</span>All judges who signed up appear in the list above</li>
                      <li className="flex items-start gap-2"><span className="text-cyber-cyan font-bold mt-0.5">2.</span>Click <strong className="text-white">Assign</strong> — the judge gets a notification</li>
                      <li className="flex items-start gap-2"><span className="text-cyber-cyan font-bold mt-0.5">3.</span>The judge opens their Dashboard and evaluates submissions</li>
                      <li className="flex items-start gap-2"><span className="text-cyber-cyan font-bold mt-0.5">4.</span>Scores auto-update the leaderboard</li>
                    </ol>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
