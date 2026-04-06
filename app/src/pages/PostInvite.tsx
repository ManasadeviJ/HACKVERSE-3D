import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Copy, CheckCircle, Users, ChevronRight,
  Loader2, AlertCircle, Share2, Zap, ArrowLeft, Key, QrCode
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getUserTeams, getTeamByInviteCode,
  joinTeamByCode, getInviteStats
} from '../services/teamService';
import { getEvent } from '../services/eventService';
import type { Team, FullEvent } from '../types';

export default function PostInvite() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  // ── My own teams (to show invite codes) ──────────────────────────────────
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedMyTeam, setSelectedMyTeam] = useState<Team | null>(null);
  const [myTeamEvent, setMyTeamEvent] = useState<FullEvent | null>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [loadingMyTeams, setLoadingMyTeams] = useState(true);

  // ── Join via code (when coming from a link) ───────────────────────────────
  const [inboundTeam, setInboundTeam] = useState<Team | null>(null);
  const [inboundEvent, setInboundEvent] = useState<FullEvent | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(!!code);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');

  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<'mine' | 'join'>(code ? 'join' : 'mine');

  // ── Load my teams ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) { setLoadingMyTeams(false); return; }
    getUserTeams(profile.$id).then(async (teams) => {
      setMyTeams(teams);
      if (teams.length) {
        setSelectedMyTeam(teams[0]);
        const [ev, stats] = await Promise.all([
          getEvent(teams[0].eventId),
          getInviteStats(teams[0].$id),
        ]);
        setMyTeamEvent(ev);
        setMyStats(stats);
      }
    }).finally(() => setLoadingMyTeams(false));
  }, [profile?.$id]);

  // When user picks a different team, reload event + stats
  useEffect(() => {
    if (!selectedMyTeam) return;
    Promise.all([
      getEvent(selectedMyTeam.eventId),
      getInviteStats(selectedMyTeam.$id),
    ]).then(([ev, stats]) => {
      setMyTeamEvent(ev);
      setMyStats(stats);
    });
  }, [selectedMyTeam?.$id]);

  // ── Look up inbound invite code ───────────────────────────────────────────
  useEffect(() => {
    if (!code) return;
    setIsLookingUp(true);
    getTeamByInviteCode(code.toUpperCase().trim())
      .then(async (t) => {
        if (!t) return;
        setInboundTeam(t);
        const ev = await getEvent(t.eventId);
        setInboundEvent(ev);
      })
      .catch(() => { })
      .finally(() => setIsLookingUp(false));
  }, [code]);

  // ── Join team ─────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!inboundTeam || !profile) return;
    setIsJoining(true);
    setJoinError('');
    try {
      await joinTeamByCode(code || '', profile.$id);
      setJoined(true);
      setTimeout(() => navigate('/participant/team'), 2000);
    } catch (e: any) {
      setJoinError(e?.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (joined) return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="cyber-card p-10 text-center max-w-md mx-4">
        <CheckCircle className="w-20 h-20 text-cyber-cyan mx-auto mb-6" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Welcome to the Team!</h1>
        <p className="text-cyber-gray">Redirecting to your team page…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-cyber-darker/95 backdrop-blur-md border-b border-cyber-cyan/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyber-cyan rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyber-dark" />
            </div>
            <span className="text-white font-heading font-bold text-xl">Hackverse</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAuthenticated
              ? <Link to="/participant/team" className="cyber-button text-sm px-3 py-1.5">My Teams</Link>
              : <><Link to="/auth/signin" className="text-cyber-gray hover:text-cyber-cyan text-sm">Sign In</Link>
                <Link to="/auth/signup" className="cyber-button-primary text-sm px-4 py-2">Sign Up</Link></>
            }
          </div>
        </div>
      </header>

      <div className="pt-16 px-4 py-12">
        <div className="max-w-xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-cyber-gray hover:text-cyber-cyan text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </button>

          {/* ── Tabs: My Invite vs Join ──────────────────────────── */}
          {!code && isAuthenticated && (
            <div className="flex gap-1 mb-6 p-1 bg-cyber-darker rounded-xl border border-cyber-cyan/20">
              {[
                { key: 'mine' as const, label: '📤 My Invite Link' },
                { key: 'join' as const, label: '📥 Join with Code' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-cyber-cyan text-cyber-dark' : 'text-cyber-gray hover:text-white'
                    }`}>{label}</button>
              ))}
            </div>
          )}

          {/* ══════ MY INVITE ══════ */}
          {tab === 'mine' && isAuthenticated && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-white mb-2">Invite Teammates</h1>
                <p className="text-cyber-gray">Share your code or link to grow your team</p>
              </div>

              {loadingMyTeams ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
              ) : myTeams.length === 0 ? (
                <div className="cyber-card p-10 text-center">
                  <Users className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
                  <p className="text-cyber-gray mb-4">You're not in any team yet.</p>
                  <p className="text-cyber-gray/60 text-sm mb-6">Register for an event to create or join a team first.</p>
                  <Link to="/events" className="cyber-button-primary">Browse Events</Link>
                </div>
              ) : (
                <>
                  {/* Team picker */}
                  {myTeams.length > 1 && (
                    <div className="mb-4">
                      <label className="block text-sm text-cyber-gray mb-2">Select Team</label>
                      <select value={selectedMyTeam?.$id || ''}
                        onChange={(e) => setSelectedMyTeam(myTeams.find(t => t.$id === e.target.value) || null)}
                        className="cyber-input">
                        {myTeams.map((t) => <option key={t.$id} value={t.$id}>{t.name}</option>)}
                      </select>
                    </div>
                  )}

                  {selectedMyTeam && (
                    <div className="space-y-4">
                      {/* Team info */}
                      <div className="cyber-card p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyber-dark font-bold text-xl">{selectedMyTeam.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-white font-heading font-semibold">{selectedMyTeam.name}</p>
                            <p className="text-cyber-cyan text-sm">{myTeamEvent?.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${selectedMyTeam.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>{selectedMyTeam.status}</span>
                          <span className="text-cyber-gray text-xs">Max {selectedMyTeam.maxMembers} members</span>
                        </div>
                      </div>

                      {/* Invite code — BIG and obvious */}
                      <div className="cyber-card p-5 border-cyber-cyan/40">
                        <p className="text-cyber-gray/60 text-xs uppercase tracking-widest mb-3">Invite Code</p>
                        <div className="flex items-center justify-between gap-3">
                          <code className="text-4xl font-bold text-cyber-cyan font-mono tracking-widest">
                            {selectedMyTeam.inviteCode}
                          </code>
                          <button onClick={() => copyText(selectedMyTeam.inviteCode, 'code')}
                            className="flex items-center gap-2 cyber-button px-4 py-2 flex-shrink-0">
                            {copied === 'code' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                            {copied === 'code' ? 'Copied!' : 'Copy Code'}
                          </button>
                        </div>
                        <p className="text-cyber-gray/60 text-xs mt-2">Share this code with teammates. They enter it at <span className="text-cyber-cyan">/invite</span></p>
                      </div>

                      {/* Invite link */}
                      <div className="cyber-card p-5">
                        <p className="text-cyber-gray/60 text-xs uppercase tracking-widest mb-3">Invite Link</p>
                        <div className="flex items-center gap-2 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg mb-3">
                          <p className="text-cyber-cyan text-sm font-mono truncate flex-1">{selectedMyTeam.inviteLink}</p>
                          <button onClick={() => copyText(selectedMyTeam.inviteLink, 'link')}
                            className="flex-shrink-0 p-2 hover:bg-cyber-cyan/10 rounded transition-colors">
                            {copied === 'link' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-cyber-cyan" />}
                          </button>
                        </div>
                        {/* Share buttons */}
                        <div className="grid grid-cols-3 gap-2">
                          <a href={`https://wa.me/?text=Join my hackathon team ${selectedMyTeam.name}! ${encodeURIComponent(selectedMyTeam.inviteLink)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="py-2 text-center text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors">
                            WhatsApp
                          </a>
                          <a href={`https://twitter.com/intent/tweet?text=Join my team!&url=${encodeURIComponent(selectedMyTeam.inviteLink)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="py-2 text-center text-xs bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors">
                            Twitter/X
                          </a>
                          <a href={`mailto:?subject=Join my hackathon team&body=Join ${selectedMyTeam.name}! ${selectedMyTeam.inviteLink}`}
                            className="py-2 text-center text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors">
                            Email
                          </a>
                        </div>
                      </div>

                      {/* Stats */}
                      {myStats && (
                        <div className="cyber-card p-5">
                          <p className="text-white font-semibold mb-4">Invite Stats</p>
                          <div className="grid grid-cols-3 gap-4 text-center">
                            {[
                              { label: 'Link Clicks', value: myStats.clicks },
                              { label: 'Joined', value: myStats.registrations },
                              { label: 'Conversion', value: myStats.clicks ? `${Math.round((myStats.registrations / myStats.clicks) * 100)}%` : '0%' },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p className="text-2xl font-bold text-cyber-cyan">{value}</p>
                                <p className="text-cyber-gray text-xs mt-1">{label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ══════ JOIN WITH CODE ══════ */}
          {(tab === 'join' || code) && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-heading font-bold text-white mb-2">Join a Team</h1>
                <p className="text-cyber-gray">Enter an invite code or follow an invite link</p>
              </div>

              {/* Inbound code from URL */}
              {isLookingUp && (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
              )}

              {inboundTeam && inboundEvent && !isLookingUp && (
                <div className="space-y-4">
                  <div className="cyber-card p-6 border-cyber-cyan/40">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyber-dark font-bold text-2xl">{inboundTeam.name.charAt(0)}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-heading font-semibold text-white">{inboundTeam.name}</h2>
                        <p className="text-cyber-cyan text-sm">{inboundEvent.title}</p>
                      </div>
                    </div>
                    {inboundTeam.description && <p className="text-cyber-gray mb-3">{inboundTeam.description}</p>}
                    <div className="flex items-center gap-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${inboundTeam.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {inboundTeam.status}
                      </span>
                      <span className="text-cyber-gray">Max {inboundTeam.maxMembers} members</span>
                    </div>
                  </div>

                  {joinError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />{joinError}
                    </div>
                  )}

                  {!isAuthenticated ? (
                    <Link to={`/auth/signin?redirect=/invite/${code || ''}`}
                      className="w-full cyber-button-primary flex items-center justify-center gap-2">
                      Sign In to Join <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : inboundTeam.status === 'open' ? (
                    <button onClick={handleJoin} disabled={isJoining}
                      className="w-full cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                      {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                      {isJoining ? 'Joining…' : `Join ${inboundTeam.name}`}
                    </button>
                  ) : (
                    <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                      <p className="text-red-400">This team is full or closed.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Manual code entry (no URL code) */}
              {!code && (
                <ManualCodeEntry onJoined={() => { setJoined(true); setTimeout(() => navigate('/participant/team'), 2000); }} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small sub-component for manual code entry ─────────────────────────────────
function ManualCodeEntry({ onJoined }: { onJoined: () => void }) {
  const { profile } = useAuth();
  const [code, setCode] = useState('');
  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<FullEvent | null>(null);
  const [looking, setLooking] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const lookup = async () => {
    if (!code.trim()) return;
    setLooking(true); setError(''); setTeam(null);
    try {
      const t = await getTeamByInviteCode(code.toUpperCase().trim());
      if (!t) { setError('Invalid code'); return; }
      setTeam(t);
      setEvent(await getEvent(t.eventId));
    } catch { setError('Could not find team'); }
    finally { setLooking(false); }
  };

  const join = async () => {
    if (!team || !profile) return;
    setJoining(true);
    try {
      await joinTeamByCode(code.toUpperCase().trim(), profile.$id);
      onJoined();
    } catch (e: any) { setError(e?.message || 'Failed to join'); }
    finally { setJoining(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-cyber-gray mb-2">Enter Invite Code</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
            <input type="text" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. NINJA26"
              className="cyber-input pl-9 font-mono tracking-widest text-center text-lg uppercase"
              onKeyDown={(e) => { if (e.key === 'Enter') lookup(); }} />
          </div>
          <button onClick={lookup} disabled={looking || !code.trim()}
            className="cyber-button-primary px-5 disabled:opacity-50">
            {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {team && event && (
        <div className="cyber-card p-5">
          <p className="text-white font-semibold">{team.name}</p>
          <p className="text-cyber-cyan text-sm">{event.title}</p>
          <button onClick={join} disabled={joining || team.status !== 'open'}
            className="mt-3 w-full cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {team.status === 'open' ? 'Join Team' : 'Team is full'}
          </button>
        </div>
      )}
    </div>
  );
}
