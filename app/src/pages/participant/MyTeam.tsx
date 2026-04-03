import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search, Mail, MessageSquare, Crown,
  MoreVertical, CheckCircle, Clock, Copy, Share2, X, Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '../../context/AuthContext';
import {
  getUserTeams, createTeam as apiCreateTeam,
  getTeamMembers, leaveTeam, removeMember, getInviteStats
} from '../../services/teamService';
import { getProfileById } from '../../services/authService';
import { listPublishedEvents } from '../../services/eventService';
import type { Team, TeamMember, Profile, HackEvent } from '../../types';

interface EnrichedMember extends TeamMember { profile: Profile }

export default function MyTeam() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<EnrichedMember[]>([]);
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [inviteStats, setInviteStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '', eventId: '', maxMembers: 4 });
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    Promise.all([getUserTeams(profile.$id), listPublishedEvents()])
      .then(([t, e]) => {
        setTeams(t);
        setEvents(e);
        if (t.length) setActiveTeam(t[0]);
      })
      .finally(() => setIsLoading(false));
  }, [profile?.$id]);

  useEffect(() => {
    if (!activeTeam) return;
    setMembers([]);
    getTeamMembers(activeTeam.$id).then(async (mems) => {
      const enriched = await Promise.all(
        mems.map(async (m) => ({ ...m, profile: await getProfileById(m.userId) }))
      );
      setMembers(enriched);
    });
    getInviteStats(activeTeam.$id).then(setInviteStats);
  }, [activeTeam?.$id]);

  const handleCreate = async () => {
    if (!profile || !createForm.name || !createForm.eventId) return;
    setIsCreating(true);
    setError('');
    try {
      const team = await apiCreateTeam(
        createForm.eventId, profile.$id,
        createForm.name, createForm.description, createForm.maxMembers
      );
      setTeams((prev) => [team, ...prev]);
      setActiveTeam(team);
      setShowCreateDialog(false);
      setCreateForm({ name: '', description: '', eventId: '', maxMembers: 4 });
    } catch (e: any) {
      setError(e?.message || 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLeave = async () => {
    if (!activeTeam || !profile) return;
    await leaveTeam(activeTeam.$id, profile.$id);
    const updated = teams.filter((t) => t.$id !== activeTeam.$id);
    setTeams(updated);
    setActiveTeam(updated[0] || null);
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeTeam || !profile) return;
    await removeMember(activeTeam.$id, userId, profile.$id);
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  };

  const copyLink = () => {
    if (!activeTeam) return;
    navigator.clipboard.writeText(activeTeam.inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">My Teams</h1>
            <p className="text-cyber-gray">Manage your teams and collaborate</p>
          </div>
          <button onClick={() => setShowCreateDialog(true)}
            className="mt-4 sm:mt-0 cyber-button-primary flex items-center space-x-2">
            <Plus className="w-4 h-4" /><span>Create Team</span>
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Users className="w-16 h-16 text-cyber-gray/30 mx-auto mb-4" />
            <h2 className="text-xl font-heading text-white mb-2">No Teams Yet</h2>
            <p className="text-cyber-gray mb-6">Create a team or join one using an invite link</p>
            <button onClick={() => setShowCreateDialog(true)} className="cyber-button-primary">
              Create Your First Team
            </button>
          </div>
        ) : (
          <>
            {/* Team Tabs */}
            {teams.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {teams.map((team) => (
                  <button key={team.$id} onClick={() => setActiveTeam(team)}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      activeTeam?.$id === team.$id
                        ? 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan'
                        : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
                    }`}>{team.name}</button>
                ))}
              </div>
            )}

            {activeTeam && (
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  {/* Team Info */}
                  <div className="cyber-card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-heading font-semibold text-white">{activeTeam.name}</h2>
                        <p className="text-cyber-cyan text-sm">
                          {events.find((e) => e.$id === activeTeam.eventId)?.title || 'Event'}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-cyber-gray" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-cyber-darker border-cyber-cyan/30">
                          <DropdownMenuItem onClick={() => setShowInviteDialog(true)}
                            className="text-white hover:bg-cyber-cyan/10 cursor-pointer">
                            Share Invite
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleLeave}
                            className="text-red-400 hover:bg-red-500/10 cursor-pointer">
                            Leave Team
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-cyber-gray">{activeTeam.description}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="flex items-center text-cyber-gray text-sm">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{members.filter(m => m.status === 'active').length}/{activeTeam.maxMembers} members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-gray text-sm font-mono">{activeTeam.inviteCode}</span>
                        <button onClick={copyLink}
                          className="flex items-center gap-1 text-xs text-cyber-cyan hover:underline">
                          {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied!' : 'Copy Link'}
                        </button>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        activeTeam.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                      }`}>{activeTeam.status}</span>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="cyber-card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-heading font-semibold text-white">Team Members</h3>
                      <button onClick={() => setShowInviteDialog(true)}
                        className="cyber-button flex items-center space-x-2 text-sm">
                        <Share2 className="w-4 h-4" /><span>Invite</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {members.map((member) => (
                        <div key={member.$id}
                          className="flex items-center justify-between p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-cyber-dark font-bold">
                                {member.profile.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 flex-wrap">
                                <span className="text-white font-semibold">{member.profile.name}</span>
                                {member.role === 'leader' && (
                                  <span className="flex items-center text-yellow-400 text-xs">
                                    <Crown className="w-3 h-3 mr-0.5" />Leader
                                  </span>
                                )}
                                {member.status === 'pending' && (
                                  <span className="flex items-center text-yellow-400 text-xs">
                                    <Clock className="w-3 h-3 mr-0.5" />Pending
                                  </span>
                                )}
                              </div>
                              <p className="text-cyber-gray text-sm">{member.profile.email}</p>
                              {(() => {
                                try {
                                  const skills: string[] = typeof member.profile.skills === 'string'
                                    ? JSON.parse(member.profile.skills || '[]')
                                    : member.profile.skills || [];
                                  return skills.length ? (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {skills.slice(0, 3).map((s) => (
                                        <span key={s} className="px-2 py-0.5 bg-cyber-cyan/20 text-cyber-cyan text-xs rounded">{s}</span>
                                      ))}
                                    </div>
                                  ) : null;
                                } catch { return null; }
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <a href={`mailto:${member.profile.email}`}
                              className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors">
                              <Mail className="w-4 h-4 text-cyber-gray" />
                            </a>
                            <Link to="/participant/collaboration"
                              className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors">
                              <MessageSquare className="w-4 h-4 text-cyber-gray" />
                            </Link>
                            {/* Leader can remove others */}
                            {activeTeam.leaderId === profile?.$id && member.userId !== profile.$id && (
                              <button onClick={() => handleRemoveMember(member.userId)}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  <div className="cyber-card p-6">
                    <h3 className="text-lg font-heading font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <Link to="/participant/collaboration"
                        className="flex items-center p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                        <MessageSquare className="w-5 h-5 text-cyber-cyan mr-3" />
                        <span className="text-white">Team Chat</span>
                      </Link>
                      <Link to="/participant/submission"
                        className="flex items-center p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                        <CheckCircle className="w-5 h-5 text-cyber-cyan mr-3" />
                        <span className="text-white">Submit Project</span>
                      </Link>
                    </div>
                  </div>

                  {inviteStats && (
                    <div className="cyber-card p-6">
                      <h3 className="text-lg font-heading font-semibold text-white mb-4">Invite Stats</h3>
                      <div className="space-y-3">
                        {[
                          { label: 'Link Clicks', value: inviteStats.clicks },
                          { label: 'Joined', value: inviteStats.registrations },
                          { label: 'Conversion', value: `${inviteStats.clicks ? Math.round((inviteStats.registrations / inviteStats.clicks) * 100) : 0}%` },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-cyber-gray text-sm">{label}</span>
                            <span className="text-white font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Team Name *</label>
              <input type="text" value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Enter team name" className="cyber-input" />
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Event *</label>
              <select value={createForm.eventId}
                onChange={(e) => setCreateForm({ ...createForm, eventId: e.target.value })}
                className="cyber-input">
                <option value="">Select an event</option>
                {events.map((ev) => (
                  <option key={ev.$id} value={ev.$id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Description</label>
              <textarea value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                placeholder="Describe your team..." rows={3} className="cyber-input resize-none" />
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Max Members</label>
              <select value={createForm.maxMembers}
                onChange={(e) => setCreateForm({ ...createForm, maxMembers: Number(e.target.value) })}
                className="cyber-input">
                {[2,3,4,5,6].map((n) => <option key={n} value={n}>{n} members</option>)}
              </select>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowCreateDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={isCreating || !createForm.name || !createForm.eventId}
                className="flex-1 cyber-button-primary flex items-center justify-center disabled:opacity-50">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Team'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Invite Teammates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-cyber-gray text-sm">Share this link to invite people to your team:</p>
            <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
              <p className="text-xs text-cyber-gray mb-2">Invite Link</p>
              <p className="text-cyber-cyan font-mono text-sm break-all">{activeTeam?.inviteLink}</p>
              <button onClick={copyLink}
                className="mt-3 flex items-center gap-2 text-sm text-cyber-cyan hover:text-white transition-colors">
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <div className="p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg flex justify-between items-center">
              <span className="text-cyber-gray text-sm">Invite Code</span>
              <code className="text-cyber-cyan font-mono font-bold">{activeTeam?.inviteCode}</code>
            </div>
            <div className="flex gap-3">
              <a href={`https://wa.me/?text=Join my team on Hackverse! ${encodeURIComponent(activeTeam?.inviteLink || '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 text-center text-sm bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors">
                WhatsApp
              </a>
              <a href={`https://twitter.com/intent/tweet?text=Join my hackathon team!&url=${encodeURIComponent(activeTeam?.inviteLink || '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-2 text-center text-sm bg-gray-500/20 text-gray-300 border border-gray-500/30 rounded-lg hover:bg-gray-500/30 transition-colors">
                Twitter/X
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
