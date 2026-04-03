import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Trophy, Plus, ChevronRight, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listOrganizerEvents, publishEvent, getEventBannerUrl } from '../../services/eventService';
import { getEventRegistrations } from '../../services/registrationService';
import { getEventSubmissions } from '../../services/submissionService';
import type { FullEvent } from '../../types';

interface FullEventWithStats extends FullEvent {
  participantCount: number;
  submissionCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  published: 'bg-cyber-cyan/20 text-cyber-cyan',
  ongoing: 'bg-green-500/20 text-green-400',
  completed: 'bg-purple-500/20 text-purple-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function OrganizerDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<FullEventWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listOrganizerEvents(profile.$id)
      .then(async (evs) => {
        const enriched = await Promise.all(
          evs.map(async (ev) => {
            const [regs, subs] = await Promise.all([
              getEventRegistrations(ev.$id),
              getEventSubmissions(ev.$id),
            ]);
            return { ...ev, participantCount: regs.length, submissionCount: subs.length };
          })
        );
        setEvents(enriched);
      })
      .finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const handlePublish = async (eventId: string) => {
    setPublishing(eventId);
    await publishEvent(eventId);
    setEvents((prev) =>
      prev.map((ev) => ev.$id === eventId ? { ...ev, status: 'published' } : ev)
    );
    setPublishing(null);
  };

  const totalParticipants = events.reduce((a, e) => a + e.participantCount, 0);
  const totalSubmissions = events.reduce((a, e) => a + e.submissionCount, 0);

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
            <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-1">
              Organizer Dashboard
            </h1>
            <p className="text-cyber-gray">Manage your hackathon events</p>
          </div>
          <Link to="/organizer/create-event"
            className="mt-4 sm:mt-0 cyber-button-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />Create Event
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Total Events', value: events.length, color: 'text-cyber-cyan' },
            { icon: Users, label: 'Participants', value: totalParticipants.toLocaleString(), color: 'text-blue-400' },
            { icon: Trophy, label: 'Submissions', value: totalSubmissions, color: 'text-yellow-400' },
            { icon: CheckCircle, label: 'Completed', value: events.filter(e => e.status === 'completed').length, color: 'text-green-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="cyber-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyber-gray text-sm">{label}</span>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Events list */}
        {events.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Calendar className="w-16 h-16 text-cyber-gray/30 mx-auto mb-4" />
            <h2 className="text-xl font-heading text-white mb-2">No Events Yet</h2>
            <p className="text-cyber-gray mb-6">Create your first hackathon event to get started</p>
            <Link to="/organizer/create-event" className="cyber-button-primary">Create Event</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-heading font-semibold text-white">Your Events</h2>
            {events.map((ev) => {
              const banner = ev.bannerFileId ? getEventBannerUrl(ev.bannerFileId) : null;
              return (
                <div key={ev.$id} className="cyber-card overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    {banner && (
                      <div className="sm:w-40 h-28 sm:h-auto flex-shrink-0 overflow-hidden bg-cyber-darker">
                        <img src={banner} alt={ev.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[ev.status]}`}>
                              {ev.status}
                            </span>
                            <span className="text-cyber-gray text-xs">{ev.category}</span>
                          </div>
                          <h3 className="text-lg font-heading font-semibold text-white truncate">{ev.title}</h3>
                          <p className="text-cyber-gray text-sm line-clamp-1">{ev.shortDescription}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 flex-shrink-0">
                          {ev.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(ev.$id)}
                              disabled={publishing === ev.$id}
                              className="cyber-button-primary text-sm px-3 py-2 flex items-center gap-1 disabled:opacity-50">
                              {publishing === ev.$id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : null}
                              Publish
                            </button>
                          )}
                          <Link to={`/organizer/manage-teams?event=${ev.$id}`}
                            className="cyber-button text-sm px-3 py-2 flex items-center gap-1">
                            Teams <ChevronRight className="w-3 h-3" />
                          </Link>
                          <Link to="/organizer/results"
                            className="cyber-button text-sm px-3 py-2">
                            Results
                          </Link>
                          <Link to="/organizer/announcements"
                            className="cyber-button text-sm px-3 py-2">
                            Announce
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-cyber-cyan/10 text-sm">
                        <div>
                          <p className="text-cyber-gray text-xs">Reg. Deadline</p>
                          <p className="text-white">{new Date(ev.registrationDeadline).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs">Start</p>
                          <p className="text-white">{new Date(ev.startDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs">End</p>
                          <p className="text-white">{new Date(ev.endDate).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs">Participants</p>
                          <p className="text-cyber-cyan font-semibold">{ev.participantCount}</p>
                        </div>
                        <div>
                          <p className="text-cyber-gray text-xs">Results</p>
                          <p className={`font-semibold ${ev.resultsPublished ? 'text-green-400' : 'text-gray-400'}`}>
                            {ev.resultsPublished ? 'Published' : 'Pending'}
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
