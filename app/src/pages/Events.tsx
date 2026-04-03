import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Clock, ChevronRight, Trophy, Loader2 } from 'lucide-react';
import { listPublishedEvents, getEventBannerUrl } from '../services/eventService';
import type { FullEvent } from '../types';

const CATEGORIES = [
  'All', 'Open Innovation', 'AI/ML', 'Web3/Blockchain', 'Cybersecurity',
  'Sustainability', 'Healthcare', 'Gaming', 'Fintech', 'Education', 'Social Impact',
];

function formatDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status: FullEvent['status']) {
  const map: Record<string, string> = {
    published: 'bg-cyber-cyan/20 text-cyber-cyan',
    ongoing: 'bg-green-500/20 text-green-400',
    completed: 'bg-gray-500/20 text-gray-400',
    draft: 'bg-yellow-500/20 text-yellow-400',
  };
  return map[status] || 'bg-gray-500/20 text-gray-400';
}

function statusLabel(status: FullEvent['status']) {
  if (status === 'published') return 'Upcoming';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function durationHrs(start: string, end: string) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return `${Math.round(ms / 3600000)} hrs`;
}

function topPrize(prizesJson: string): string {
  try {
    const arr = JSON.parse(prizesJson || '[]');
    return arr[0]?.amount || '';
  } catch { return ''; }
}

export default function Events() {
  const [events, setEvents] = useState<FullEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    listPublishedEvents()
      .then(setEvents)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.title.toLowerCase().includes(q) ||
      e.shortDescription.toLowerCase().includes(q);
    const matchCat = category === 'All' || e.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">Hackathon Events</h1>
          <p className="text-cyber-gray">Discover and join the most exciting hackathons</p>
        </div>

        {/* Search + category filter */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…" className="cyber-input pl-12 w-full" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors border ${category === cat
                    ? 'bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/40'
                    : 'text-cyber-gray border-cyber-cyan/20 hover:border-cyber-cyan/40'
                  }`}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="cyber-card p-16 text-center">
            <Trophy className="w-14 h-14 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray text-lg">No events found</p>
            <p className="text-cyber-gray/50 text-sm mt-1">
              {search ? 'Try a different search term' : 'Check back soon for new hackathons'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => {
              const banner = event.bannerFileId
                ? getEventBannerUrl(event.bannerFileId)
                : '/event_neon_build.jpg';
              const prize = topPrize(event.prizes);
              const dur = durationHrs(event.startDate, event.endDate);

              return (
                <Link key={event.$id} to={`/events/${event.$id}`}
                  className="cyber-card overflow-hidden hover:border-cyber-cyan/50 transition-all group block">
                  {/* Banner */}
                  <div className="relative h-48 overflow-hidden bg-cyber-darker">
                    <img src={banner} alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/event_neon_build.jpg'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark/80 via-transparent" />
                    <span className={`absolute top-3 right-3 px-2 py-0.5 rounded text-xs font-medium ${statusBadge(event.status)}`}>
                      {statusLabel(event.status)}
                    </span>
                    <span className="absolute top-3 left-3 px-2 py-0.5 bg-black/50 rounded text-xs text-cyber-gray">
                      {event.category}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <h3 className="text-lg font-heading font-semibold text-white mb-2 group-hover:text-cyber-cyan transition-colors line-clamp-1">
                      {event.title}
                    </h3>
                    <p className="text-cyber-gray text-sm mb-4 line-clamp-2">
                      {event.shortDescription}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div className="flex items-center gap-1.5 text-cyber-gray">
                        <Clock className="w-4 h-4" /><span>{dur}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-cyber-gray">
                        <Users className="w-4 h-4" /><span>{event.maxParticipants.toLocaleString()} max</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {prize ? (
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-semibold text-sm">{prize}</span>
                        </div>
                      ) : <span />}
                      <div className="flex items-center gap-1 text-cyber-cyan text-sm">
                        <span>Details</span><ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-cyber-gray/50 text-xs mt-3">
                      {formatDate(event.startDate)} → {formatDate(event.endDate)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
