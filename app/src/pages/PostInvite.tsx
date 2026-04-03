import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Copy, CheckCircle, Users, ChevronRight, Loader2, AlertCircle, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getTeamByInviteCode, joinTeamByCode, getInviteStats } from '../services/teamService';
import { getEvent } from '../services/eventService';
import type { Team, HackEvent } from '../types';

export default function PostInvite() {
  const { code } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  const [team, setTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<HackEvent | null>(null);
  const [inviteStats, setInviteStats] = useState<any>(null);
  const [manualCode, setManualCode] = useState(code || '');
  const [isLoading, setIsLoading] = useState(!!code);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const lookupCode = async (c: string) => {
    if (!c) return;
    setIsLoading(true);
    setError('');
    try {
      const t = await getTeamByInviteCode(c.toUpperCase().trim());
      if (!t) { setError('Invalid invite code. Please check and try again.'); return; }
      setTeam(t);
      const [ev, stats] = await Promise.all([
        getEvent(t.eventId),
        getInviteStats(t.$id),
      ]);
      setEvent(ev);
      setInviteStats(stats);
    } catch {
      setError('Could not find team with that code.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (code) lookupCode(code); }, [code]);

  const handleJoin = async () => {
    if (!team || !profile) return;
    setIsJoining(true);
    setError('');
    try {
      await joinTeamByCode(manualCode || code || '', profile.$id);
      setJoined(true);
      setTimeout(() => navigate('/participant/team'), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to join team');
    } finally {
      setIsJoining(false);
    }
  };

  const inviteLink = team?.inviteLink || window.location.href;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (joined) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="cyber-card p-10 text-center max-w-md">
        <CheckCircle className="w-20 h-20 text-cyber-cyan mx-auto mb-6" />
        <h1 className="text-2xl font-heading font-bold text-white mb-2">Welcome to the Team!</h1>
        <p className="text-cyber-gray">Redirecting to your team page...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Team Invite</h1>
          <p className="text-cyber-gray">Join a hackathon team</p>
        </div>

        {/* Manual code entry (if no code in URL or lookup failed) */}
        {!team && (
          <div className="cyber-card p-6">
            <label className="block text-sm text-cyber-gray mb-2">Enter Invite Code</label>
            <div className="flex gap-3">
              <input type="text" value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. NINJA26" className="cyber-input flex-1 font-mono tracking-widest"
                onKeyDown={(e) => { if (e.key === 'Enter') lookupCode(manualCode); }} />
              <button onClick={() => lookupCode(manualCode)} disabled={isLoading || !manualCode}
                className="cyber-button-primary px-4 disabled:opacity-50">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
              </button>
            </div>
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />{error}
              </div>
            )}
          </div>
        )}

        {isLoading && !team && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
          </div>
        )}

        {/* Team preview */}
        {team && event && (
          <>
            <div className="cyber-card p-6 border-cyber-cyan/40">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyber-dark font-bold text-xl">{team.name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-xl font-heading font-semibold text-white">{team.name}</h2>
                  <p className="text-cyber-cyan text-sm">{event.title}</p>
                </div>
              </div>
              {team.description && <p className="text-cyber-gray mb-4">{team.description}</p>}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-cyber-gray">
                  <Users className="w-4 h-4" />
                  <span>Max {team.maxMembers} members</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  team.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>{team.status}</span>
              </div>
            </div>

            {/* Invite stats (for team leader) */}
            {inviteStats && profile && team.leaderId === profile.$id && (
              <div className="cyber-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Share2 className="w-5 h-5 text-cyber-cyan" />
                  <h3 className="text-white font-semibold">Your Invite Stats</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Link Clicks', value: inviteStats.clicks },
                    { label: 'Joined', value: inviteStats.registrations },
                    { label: 'Conversion', value: `${inviteStats.clicks ? Math.round((inviteStats.registrations / inviteStats.clicks) * 100) : 0}%` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-2xl font-bold text-cyber-cyan">{value}</p>
                      <p className="text-cyber-gray text-xs">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                  <p className="text-xs text-cyber-gray mb-1">Share Link</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-cyber-cyan text-xs font-mono truncate">{inviteLink}</p>
                    <button onClick={copyLink}
                      className="flex items-center gap-1 text-xs text-cyber-cyan hover:text-white flex-shrink-0">
                      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Join Action */}
            {(!profile || profile.role === 'participant') && team.leaderId !== profile?.$id && (
              <div className="cyber-card p-6">
                {error && (
                  <div className="mb-4 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />{error}
                  </div>
                )}
                {!isAuthenticated ? (
                  <div className="text-center">
                    <p className="text-cyber-gray mb-4">Sign in to join this team</p>
                    <Link to={`/auth/signin?redirect=/invite/${code}`}
                      className="cyber-button-primary flex items-center justify-center gap-2">
                      Sign In to Join <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : team.status === 'open' ? (
                  <button onClick={handleJoin} disabled={isJoining}
                    className="w-full cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                    {isJoining ? 'Joining...' : `Join ${team.name}`}
                  </button>
                ) : (
                  <div className="text-center text-red-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>This team is full or closed</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
