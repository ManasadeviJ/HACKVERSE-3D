// ─── ManageTeams.tsx ─────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Search, Users, Download, Loader2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listOrganizerEvents } from '../../services/eventService';
import { getEventTeams, getTeamMembers } from '../../services/teamService';
import { getProfileById } from '../../services/authService';
import type { HackEvent, Team, TeamMember, Profile } from '../../types';

interface EnrichedTeam extends Team {
  members: (TeamMember & { profile: Profile })[];
}

export function ManageTeams() {
  const { profile } = useAuth();
  const [params] = useSearchParams();
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(params.get('event') || '');
  const [teams, setTeams] = useState<EnrichedTeam[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    listOrganizerEvents(profile.$id).then((evs) => {
      setEvents(evs);
      if (!selectedEvent && evs.length) setSelectedEvent(evs[0].$id);
    });
  }, [profile?.$id]);

  useEffect(() => {
    if (!selectedEvent) return;
    setIsLoading(true);
    getEventTeams(selectedEvent).then(async (rawTeams) => {
      const enriched = await Promise.all(
        rawTeams.map(async (team) => {
          const mems = await getTeamMembers(team.$id);
          const membersWithProfiles = await Promise.all(
            mems.map(async (m) => ({ ...m, profile: await getProfileById(m.userId) }))
          );
          return { ...team, members: membersWithProfiles };
        })
      );
      setTeams(enriched);
    }).finally(() => setIsLoading(false));
  }, [selectedEvent]);

  const filtered = teams.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.members.some((m) => m.profile.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/organizer/dashboard" className="flex items-center text-cyber-gray hover:text-cyber-cyan mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Manage Teams</h1>
            <p className="text-cyber-gray">{filtered.length} teams registered</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search teams or members..." className="cyber-input pl-12 w-full" />
          </div>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="cyber-input sm:w-56">
            {events.map((ev) => <option key={ev.$id} value={ev.$id}>{ev.title}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Users className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No teams yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((team) => (
              <div key={team.$id} className="cyber-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-heading font-semibold text-white">{team.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${team.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {team.status}
                      </span>
                    </div>
                    <p className="text-cyber-gray text-sm">{team.description}</p>
                    <p className="text-cyber-gray/60 text-xs mt-0.5">{team.members.length}/{team.maxMembers} members · Code: {team.inviteCode}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {team.members.map((m) => (
                    <div key={m.$id} className="flex items-center gap-3 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-cyber-dark font-bold text-xs">{m.profile.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">{m.profile.name}</p>
                        <p className="text-cyber-gray text-xs capitalize">{m.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageTeams;
