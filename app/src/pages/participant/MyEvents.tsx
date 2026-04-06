import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Users, Trophy, CheckCircle,
  Clock3, History, Loader2, ChevronRight, Lock, Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserRegistrations } from '../../services/registrationService';
import { getEvent, getEventBannerUrl } from '../../services/eventService';
import { getUserTeamForEvent, getTeamMembers } from '../../services/teamService';
import { getProfileById } from '../../services/authService';
import type { FullEvent, Registration, Profile } from '../../types';

interface MyEventRow {
  reg: Registration;
  event: FullEvent;
  teamName: string;
  teammates: Profile[];
  teamId: string;
}

function getStatus(event: FullEvent): 'upcoming' | 'ongoing' | 'completed' {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (now > end) return 'completed';
  if (now >= start) return 'ongoing';
  return 'upcoming';
}

function isSubmissionOpen(event: FullEvent): boolean {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  return now >= start && now <= end;
}

function daysText(event: FullEvent): string {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (now > end) return 'Ended';
  if (now >= start) {
    const left = Math.ceil((end - now) / 86400000);
    return `${left}d left`;
  }
  const until = Math.ceil((start - now) / 86400000);
  return `Starts in ${until}d`;
}

export default function MyEvents() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<MyEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  useEffect(() => {
    if (!profile) return;
    getUserRegistrations(profile.$id).then(async (regs) => {
      const valid = regs.filter((r) => r.status !== 'cancelled');
      const enriched = await Promise.all(
        valid.map(async (reg) => {
          const event = await getEvent(reg.eventId);
          const team = await getUserTeamForEvent(profile.$id, reg.eventId);
          let teammates: Profile[] = [];
          if (team) {
            const mems = await getTeamMembers(team.$id);
            teammates = await Promise.all(
              mems
                .filter((m) => m.userId !== profile.$id && m.status === 'active')
                .map((m) => getProfileById(m.userId).catch(() => null))
            ).then((ps) => ps.filter(Boolean) as Profile[]);
          }
          return {
            reg, event,
            teamName: team?.name || 'No team yet',
            teammates,
            teamId: team?.$id || '',
          };
        })
      );
      setRows(enriched);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const filtered = rows.filter(({ event }) =>
    filter === 'all' || getStatus(event) === filter
  );

  const STATUS_CFG = {
    upcoming: { icon: Clock3, color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/20', label: 'Upcoming' },
    ongoing: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Ongoing' },
    completed: { icon: History, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Completed' },
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-1">My Events</h1>
            <p className="text-cyber-gray">Your hackathon journey</p>
          </div>
          <Link to="/events" className="mt-4 sm:mt-0 cyber-button-primary">Browse Events</Link>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors border ${filter === f ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40' : 'text-cyber-gray border-cyber-cyan/20 hover:border-cyber-cyan/40'
                }`}>{f}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Calendar className="w-16 h-16 text-cyber-gray/30 mx-auto mb-4" />
            <h2 className="text-xl font-heading text-white mb-2">No Events Yet</h2>
            <p className="text-cyber-gray mb-6">Register for a hackathon to get started</p>
            <Link to="/events" className="cyber-button-primary">Browse Events</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map(({ reg, event, teamName, teammates, teamId }) => {
              const status = getStatus(event);
              const cfg = STATUS_CFG[status];
              const StatusIcon = cfg.icon;
              const banner = event.bannerFileId ? getEventBannerUrl(event.bannerFileId) : null;
              const subOpen = isSubmissionOpen(event);

              return (
                <div key={reg.$id} className="cyber-card overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {banner && (
                      <div className="sm:w-44 h-28 sm:h-auto flex-shrink-0 overflow-hidden">
                        <img src={banner} alt={event.title} className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                    <div className="flex-1 p-5">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                            <span className="text-cyber-gray text-xs">{event.category}</span>
                            <span className={`text-xs font-medium ${status === 'ongoing' ? 'text-green-400' : status === 'completed' ? 'text-gray-400' : 'text-cyber-cyan'
                              }`}>{daysText(event)}</span>
                          </div>
                          <h2 className="text-xl font-heading font-semibold text-white">{event.title}</h2>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 flex-shrink-0 flex-wrap">
                          <Link to={`/events/${event.$id}`} className="cyber-button text-sm px-3 py-1.5">
                            Details
                          </Link>
                          {/* Submission gated by event dates */}
                          {subOpen ? (
                            <Link to="/participant/submission"
                              className="cyber-button-primary text-sm px-3 py-1.5 flex items-center gap-1">
                              <Upload className="w-3 h-3" />Submit
                            </Link>
                          ) : status === 'upcoming' ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 text-xs border border-cyber-cyan/20 text-cyber-gray rounded-lg cursor-not-allowed">
                              <Lock className="w-3 h-3" />Not started
                            </span>
                          ) : status === 'completed' ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-500/20 text-gray-400 rounded-lg">
                              <History className="w-3 h-3" />Ended
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Team + Teammates */}
                      <div className="mt-3 pt-3 border-t border-cyber-cyan/10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Team */}
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
                            <span className="text-white text-sm font-medium">{teamName}</span>
                          </div>

                          {/* Teammates avatars */}
                          {teammates.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-cyber-gray text-xs">Teammates:</span>
                              <div className="flex -space-x-2">
                                {teammates.slice(0, 4).map((tm) => (
                                  <div key={tm.$id}
                                    title={tm.name}
                                    className="w-7 h-7 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 border-2 border-cyber-darker flex items-center justify-center">
                                    <span className="text-cyber-dark font-bold text-xs">
                                      {tm.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                ))}
                                {teammates.length > 4 && (
                                  <div className="w-7 h-7 rounded-full bg-cyber-darker border-2 border-cyber-cyan/30 flex items-center justify-center">
                                    <span className="text-cyber-gray text-xs">+{teammates.length - 4}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                {teammates.slice(0, 3).map((tm) => (
                                  <span key={tm.$id} className="text-cyber-gray text-xs">{tm.name}</span>
                                ))}
                                {teammates.length > 3 && (
                                  <span className="text-cyber-gray text-xs">and {teammates.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* No team yet */}
                          {!teamId && (
                            <Link to="/participant/team"
                              className="flex items-center gap-1 text-yellow-400 text-xs hover:underline">
                              <AlertTriangle className="w-3 h-3" />No team — create one
                            </Link>
                          )}
                        </div>

                        {/* Dates */}
                        <div className="flex flex-wrap gap-4 mt-3 text-xs text-cyber-gray">
                          <span>Starts: {new Date(event.startDate).toLocaleDateString()}</span>
                          <span>Ends: {new Date(event.endDate).toLocaleDateString()}</span>
                          {!subOpen && status === 'ongoing' && (
                            <span className="text-red-400">Submission deadline passed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Missing import fix
function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5C2.57 18.333 3.532 20 5.072 20z" />
    </svg>
  );
}
