import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Trophy, Castle, CheckCircle, Clock3, History, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserRegistrations } from '../../services/registrationService';
import { getEvent, getEventBannerUrl } from '../../services/eventService';
import { getUserTeamForEvent } from '../../services/teamService';
import type { HackEvent, Registration } from '../../types';

interface MyEvent { reg: Registration; event: HackEvent; teamName: string }

function getEventStatus(event: HackEvent): 'registered' | 'ongoing' | 'completed' {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (now > end) return 'completed';
  if (now >= start) return 'ongoing';
  return 'registered';
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 86400000);
}

export default function MyEvents() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'registered' | 'ongoing' | 'completed'>('all');

  useEffect(() => {
    if (!profile) return;
    getUserRegistrations(profile.$id).then(async (regs) => {
      const enriched = await Promise.all(
        regs.filter((r) => r.status !== 'cancelled').map(async (reg) => {
          const event = await getEvent(reg.eventId);
          const team = await getUserTeamForEvent(profile.$id, reg.eventId);
          return { reg, event, teamName: team?.name || 'No team yet' };
        })
      );
      setMyEvents(enriched);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const filtered = myEvents.filter((me) =>
    filter === 'all' || getEventStatus(me.event) === filter
  );

  const statusConfig = {
    registered: { icon: Clock3, color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/20', label: 'Registered' },
    ongoing:    { icon: Castle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Ongoing' },
    completed:  { icon: History, color: 'text-gray-400', bg: 'bg-gray-500/20', label: 'Completed' },
  };

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">My Events</h1>
            <p className="text-cyber-gray">Your hackathon journey</p>
          </div>
          <Link to="/events" className="mt-4 sm:mt-0 cyber-button-primary">Browse Events</Link>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(['all', 'registered', 'ongoing', 'completed'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30' : 'text-cyber-gray hover:text-white border border-cyber-cyan/20'
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
            {filtered.map(({ reg, event, teamName }) => {
              const status = getEventStatus(event);
              const cfg = statusConfig[status];
              const StatusIcon = cfg.icon;
              const banner = event.bannerFileId ? getEventBannerUrl(event.bannerFileId) : '/event_neon_build.jpg';

              return (
                <div key={reg.$id} className="cyber-card overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden">
                      <img src={banner} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cfg.bg} ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                            <span className="text-cyber-gray text-xs">{event.category}</span>
                          </div>
                          <h2 className="text-xl font-heading font-semibold text-white mb-1">{event.title}</h2>
                          <p className="text-cyber-gray text-sm">{event.shortDescription}</p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link to={`/events/${event.$id}`}
                            className="cyber-button text-sm px-3 py-2">Details</Link>
                          {status === 'ongoing' && (
                            <Link to="/participant/submission"
                              className="cyber-button-primary text-sm px-3 py-2">Submit</Link>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-cyber-cyan/10">
                        <div>
                          <p className="text-cyber-gray text-xs mb-1">Team</p>
                          <p className="text-white text-sm font-medium">{teamName}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs mb-1">Start</p>
                          <p className="text-white text-sm">{new Date(event.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs mb-1">End</p>
                          <p className="text-white text-sm">{new Date(event.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs mb-1">
                            {status === 'registered' ? 'Starts In' : status === 'ongoing' ? 'Time Left' : 'Status'}
                          </p>
                          <p className={`text-sm font-medium ${status === 'ongoing' ? 'text-green-400' : status === 'completed' ? 'text-gray-400' : 'text-cyber-cyan'}`}>
                            {status === 'registered' ? `${daysUntil(event.startDate)}d`
                              : status === 'ongoing' ? `${daysUntil(event.endDate)}d left`
                              : 'Ended'}
                          </p>
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
