import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Trophy, MapPin, ChevronLeft, Share2,
  CheckCircle, AlertCircle, ArrowRight, Users, Loader2, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getEvent, getEventBannerUrl } from '../services/eventService';
import { isRegistered } from '../services/registrationService';
import type { FullEvent } from '../types';

function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
function durationHrs(start: string, end: string) {
  if (!start || !end) return 0;
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 3600000);
}

const STATUS_BADGE: Record<string, string> = {
  published: 'bg-cyber-cyan/20 text-cyber-cyan',
  ongoing: 'bg-green-500/20 text-green-400',
  completed: 'bg-gray-500/20 text-gray-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
};

// ─── Default sponsors shown when no custom sponsors exist ─────────────────────
// In production you'd store sponsors in event_details; for now use sensible defaults
const DEFAULT_SPONSORS = [
  { name: 'Google Cloud', tier: 'platinum', logo: '🟦' },
  { name: 'AWS', tier: 'gold', logo: '🟧' },
  { name: 'GitHub', tier: 'gold', logo: '⬛' },
  { name: 'Vercel', tier: 'silver', logo: '⬜' },
  { name: 'Appwrite', tier: 'silver', logo: '🟥' },
  { name: 'Devfolio', tier: 'bronze', logo: '🟪' },
];

const TIER_STYLE: Record<string, string> = {
  platinum: 'border-purple-400/40 bg-purple-500/5 text-purple-300',
  gold: 'border-yellow-400/40 bg-yellow-500/5 text-yellow-300',
  silver: 'border-gray-400/40  bg-gray-500/5   text-gray-300',
  bronze: 'border-orange-400/40 bg-orange-500/5 text-orange-300',
};

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAuthenticated } = useAuth();

  const [event, setEvent] = useState<FullEvent | null>(null);
  const [alreadyRegistered, setAlreadyReg] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getEvent(id)
      .then((ev) => {
        setEvent(ev);
        if (profile) return isRegistered(profile.$id, id).then(setAlreadyReg);
      })
      .catch(() => setLoadError('Event not found'))
      .finally(() => setIsLoading(false));
  }, [id, profile?.$id]);

  if (isLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  if (loadError || !event) return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <div className="cyber-card p-8 text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-cyber-gray mb-4">{loadError || 'Event not found'}</p>
        <Link to="/events" className="cyber-button-primary">Browse Events</Link>
      </div>
    </div>
  );

  // Parse JSON fields from event_details
  const prizes = (() => { try { return JSON.parse(event.prizes || '[]'); } catch { return []; } })();
  const rules = (() => { try { return JSON.parse(event.rules || '[]'); } catch { return []; } })();
  const eligibility = (() => { try { return JSON.parse(event.eligibility || '[]'); } catch { return []; } })();
  const judgeIds = (() => { try { return JSON.parse(event.judgeIds || '[]'); } catch { return []; } })();

  const bannerUrl = event.bannerFileId
    ? getEventBannerUrl(event.bannerFileId)
    : '/event_neon_build.jpg';

  const now = Date.now();
  const regDeadlinePassed = new Date(event.registrationDeadline).getTime() < now;
  const eventEnded = new Date(event.endDate).getTime() < now;
  const canRegister =
    isAuthenticated &&
    profile?.role === 'participant' &&
    !alreadyRegistered &&
    !regDeadlinePassed &&
    !eventEnded &&
    event.status !== 'draft';

  const share = () => {
    if (navigator.share) navigator.share({ title: event.title, url: window.location.href }).catch(() => { });
    else navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="min-h-screen">
      {/* Hero banner */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img src={bannerUrl} alt={event.title} className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/event_neon_build.jpg'; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark via-cyber-dark/60 to-transparent" />
        <div className="absolute top-6 left-6">
          <Link to="/events" className="flex items-center gap-1 text-white/80 hover:text-cyber-cyan text-sm transition-colors">
            <ChevronLeft className="w-4 h-4" />Back to Events
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[event.status]}`}>
              {event.status === 'published' ? 'Upcoming' : event.status}
            </span>
            <span className="px-2 py-0.5 bg-black/40 rounded text-xs text-cyber-gray">{event.category}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white drop-shadow">{event.title}</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Clock, label: 'Duration', value: `${durationHrs(event.startDate, event.endDate)} hrs` },
                { icon: Users, label: 'Max Teams', value: event.maxParticipants.toLocaleString() },
                { icon: MapPin, label: 'Location', value: event.location },
                { icon: Users, label: 'Team Size', value: `${event.teamSizeMin}–${event.teamSizeMax}` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="cyber-card p-4 text-center">
                  <Icon className="w-5 h-5 text-cyber-cyan mx-auto mb-1" />
                  <p className="text-cyber-gray text-xs">{label}</p>
                  <p className="text-white text-sm font-medium truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* About */}
            {event.description && (
              <div className="cyber-card p-6">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">About This Hackathon</h2>
                <p className="text-cyber-gray leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Key dates */}
            <div className="cyber-card p-6">
              <h2 className="text-xl font-heading font-semibold text-white mb-4">Key Dates</h2>
              <div className="space-y-4">
                {[
                  { label: 'Registration Deadline', date: event.registrationDeadline },
                  { label: 'Hackathon Start', date: event.startDate },
                  { label: 'Hackathon End', date: event.endDate },
                ].map(({ label, date }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-cyber-cyan/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-cyber-cyan" />
                    </div>
                    <div>
                      <p className="text-cyber-gray text-sm">{label}</p>
                      <p className="text-white font-medium">{fmtDate(date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prizes */}
            {prizes.length > 0 && (
              <div className="cyber-card p-6">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">
                  <Trophy className="w-5 h-5 text-yellow-400 inline mr-2" />Prizes
                </h2>
                <div className="space-y-3">
                  {prizes.map((p: any, i: number) => (
                    <div key={i}
                      className="flex items-center justify-between p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                      <div>
                        <p className="text-white font-semibold">{p.place}</p>
                        {p.description && <p className="text-cyber-gray text-sm">{p.description}</p>}
                      </div>
                      <span className="text-yellow-400 font-bold text-lg">{p.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            {rules.length > 0 && (
              <div className="cyber-card p-6">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">Rules</h2>
                <ul className="space-y-2">
                  {rules.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-cyber-gray">
                      <CheckCircle className="w-4 h-4 text-cyber-cyan mt-0.5 flex-shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Eligibility */}
            {eligibility.length > 0 && (
              <div className="cyber-card p-6">
                <h2 className="text-xl font-heading font-semibold text-white mb-4">Eligibility</h2>
                <ul className="space-y-2">
                  {eligibility.map((item: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-cyber-gray">
                      <CheckCircle className="w-4 h-4 text-cyber-cyan mt-0.5 flex-shrink-0" />{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Sponsors ───────────────────────────────────────────── */}
            <div className="cyber-card p-6">
              <h2 className="text-xl font-heading font-semibold text-white mb-6 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />Sponsors & Partners
              </h2>

              {/* Platinum */}
              <div className="mb-6">
                <p className="text-xs text-purple-400 font-mono uppercase tracking-widest mb-3">Platinum</p>
                <div className="flex flex-wrap gap-3">
                  {DEFAULT_SPONSORS.filter(s => s.tier === 'platinum').map((s) => (
                    <div key={s.name}
                      className={`flex items-center gap-3 px-5 py-3 border rounded-xl ${TIER_STYLE[s.tier]}`}>
                      <span className="text-2xl">{s.logo}</span>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gold */}
              <div className="mb-6">
                <p className="text-xs text-yellow-400 font-mono uppercase tracking-widest mb-3">Gold</p>
                <div className="flex flex-wrap gap-3">
                  {DEFAULT_SPONSORS.filter(s => s.tier === 'gold').map((s) => (
                    <div key={s.name}
                      className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg ${TIER_STYLE[s.tier]}`}>
                      <span className="text-xl">{s.logo}</span>
                      <span className="font-medium">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Silver + Bronze */}
              <div>
                <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mb-3">Silver & Bronze</p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_SPONSORS.filter(s => s.tier === 'silver' || s.tier === 'bronze').map((s) => (
                    <div key={s.name}
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${TIER_STYLE[s.tier]}`}>
                      <span>{s.logo}</span>
                      <span className="text-sm">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: registration card ─────────────────────────── */}
          <div>
            <div className="cyber-card p-6 sticky top-24 space-y-5">
              <div>
                <p className="text-cyber-gray text-sm mb-1">Registration closes</p>
                <p className="text-white font-semibold">{fmtDate(event.registrationDeadline)}</p>
                {regDeadlinePassed && <p className="text-red-400 text-xs mt-1">Registration has closed</p>}
              </div>

              {alreadyRegistered ? (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-semibold">You're Registered!</p>
                  <Link to="/participant/my-events" className="text-cyber-cyan text-sm hover:underline mt-1 inline-block">
                    View in My Events →
                  </Link>
                </div>
              ) : canRegister ? (
                <button onClick={() => navigate(`/register/${event.$id}`)}
                  className="w-full cyber-button-primary flex items-center justify-center gap-2">
                  Register Now <ArrowRight className="w-4 h-4" />
                </button>
              ) : !isAuthenticated ? (
                <Link to="/auth/signin"
                  className="w-full cyber-button-primary flex items-center justify-center gap-2">
                  Sign In to Register <ArrowRight className="w-4 h-4" />
                </Link>
              ) : eventEnded ? (
                <div className="p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg text-center">
                  <p className="text-gray-400 text-sm">This event has ended</p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
                  <p className="text-yellow-400 text-sm">
                    {event.status === 'draft' ? 'Not yet published' : 'Registration unavailable'}
                  </p>
                </div>
              )}

              <button onClick={share}
                className="w-full cyber-button flex items-center justify-center gap-2">
                <Share2 className="w-4 h-4" />Share Event
              </button>

              <div className="space-y-3 text-sm pt-2 border-t border-cyber-cyan/10">
                {[
                  { label: 'Judges', value: `${judgeIds.length} assigned` },
                  { label: 'Team Size', value: `${event.teamSizeMin}–${event.teamSizeMax} members` },
                  {
                    label: 'Results', value: event.resultsPublished ? 'Published' : 'Pending',
                    cls: event.resultsPublished ? 'text-green-400' : 'text-cyber-gray'
                  },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-cyber-gray">{label}</span>
                    <span className={`font-medium ${cls || 'text-white'}`}>{value}</span>
                  </div>
                ))}
              </div>

              {event.resultsPublished && (
                <Link to={`/leaderboard?event=${event.$id}`}
                  className="w-full cyber-button flex items-center justify-center gap-2 mt-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />View Leaderboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
