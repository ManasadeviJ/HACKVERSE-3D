import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, Clock, Users, Trophy, ChevronRight,
  Code, MessageSquare, Upload, TrendingUp, Loader2, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserRegistrations } from '../../services/registrationService';
import { getEvent } from '../../services/eventService';
import { getUserTeams } from '../../services/teamService';
import { getLeaderboard } from '../../services/evaluationService';
import type { HackEvent, Registration, Team, LeaderboardEntry } from '../../types';

export default function ParticipantDashboard() {
  const { profile, getAvatarUrl } = useAuth();
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [ranking, setRanking] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      getUserRegistrations(profile.$id),
      getUserTeams(profile.$id),
      getLeaderboard(undefined, true),
    ]).then(async ([regs, userTeams, lb]) => {
      const evs = await Promise.all(
        regs.slice(0, 5).map((r: Registration) => getEvent(r.eventId))
      );
      setEvents(evs);
      setTeams(userTeams);
      // Find user's best ranking
      const myEntry = lb.find((e) => userTeams.some((t) => t.$id === e.teamId));
      setRanking(myEntry || null);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const avatarUrl = profile?.avatarFileId ? getAvatarUrl(profile.avatarFileId) : '';

  const quickActions = [
    { to: '/events', icon: Calendar, label: 'Browse Events', color: 'text-cyber-cyan' },
    { to: '/participant/team', icon: Users, label: 'My Team', color: 'text-blue-400' },
    { to: '/participant/collaboration', icon: MessageSquare, label: 'Team Chat', color: 'text-green-400' },
    { to: '/participant/submission', icon: Upload, label: 'Submit Project', color: 'text-yellow-400' },
    { to: '/town', icon: Zap, label: '3D Town', color: 'text-purple-400' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard', color: 'text-orange-400' },
  ];

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Welcome */}
        <div className="flex items-center gap-4 mb-8">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile?.name} className="w-16 h-16 rounded-full object-cover border-2 border-cyber-cyan/30" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-cyber-dark font-bold text-2xl">{profile?.name?.charAt(0)}</span>
            </div>
          )}
          <div>
            <h1 className="text-3xl font-heading font-bold text-white">
              Hey, {profile?.name?.split(' ')[0]}!
            </h1>
            <p className="text-cyber-gray">Ready to build something amazing?</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Hackathons', value: profile?.hackathonsCount || 0, icon: Calendar, color: 'text-cyber-cyan' },
            { label: 'Projects', value: profile?.projectsCount || 0, icon: Code, color: 'text-blue-400' },
            { label: 'Wins', value: profile?.winsCount || 0, icon: Trophy, color: 'text-yellow-400' },
            { label: 'Best Rank', value: ranking ? `#${ranking.rank}` : '—', icon: TrendingUp, color: 'text-green-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="cyber-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyber-gray text-sm">{label}</span>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="cyber-card p-6">
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map(({ to, icon: Icon, label, color }) => (
                  <Link key={to} to={to}
                    className="flex flex-col items-center p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors text-center">
                    <Icon className={`w-6 h-6 ${color} mb-2`} />
                    <span className="text-white text-xs">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* My Events */}
          <div className="lg:col-span-2 space-y-6">
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold text-white">My Events</h2>
                <Link to="/participant/my-events" className="text-cyber-cyan text-sm hover:underline flex items-center gap-1">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {events.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-cyber-gray/30 mx-auto mb-3" />
                  <p className="text-cyber-gray text-sm">No events registered yet</p>
                  <Link to="/events" className="text-cyber-cyan text-sm hover:underline mt-2 inline-block">Browse events →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 3).map((ev) => {
                    const now = Date.now();
                    const status = now > new Date(ev.endDate).getTime() ? 'completed'
                      : now >= new Date(ev.startDate).getTime() ? 'ongoing' : 'upcoming';
                    return (
                      <Link key={ev.$id} to={`/events/${ev.$id}`}
                        className="flex items-center justify-between p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                        <div>
                          <p className="text-white font-medium">{ev.title}</p>
                          <p className="text-cyber-gray text-xs">{new Date(ev.startDate).toLocaleDateString()} → {new Date(ev.endDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${status === 'ongoing' ? 'bg-green-500/20 text-green-400'
                              : status === 'upcoming' ? 'bg-cyber-cyan/20 text-cyber-cyan'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>{status}</span>
                          <ChevronRight className="w-4 h-4 text-cyber-gray" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Teams */}
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-heading font-semibold text-white">My Teams</h2>
                <Link to="/participant/team" className="text-cyber-cyan text-sm hover:underline flex items-center gap-1">
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {teams.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="w-10 h-10 text-cyber-gray/30 mx-auto mb-3" />
                  <p className="text-cyber-gray text-sm">Not part of any team yet</p>
                  <Link to="/participant/team" className="text-cyber-cyan text-sm hover:underline mt-2 inline-block">Create a team →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => (
                    <Link key={team.$id} to="/participant/team"
                      className="flex items-center justify-between p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center">
                          <span className="text-cyber-dark font-bold">{team.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{team.name}</p>
                          <p className="text-cyber-gray text-xs capitalize">{team.status} · max {team.maxMembers}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-cyber-gray" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
