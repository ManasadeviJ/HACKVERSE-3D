import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, User, Mail, Building2, GraduationCap,
  Plus, Trash2, CheckCircle, Send, Phone, Loader2,
  AlertCircle, Users, Key
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { getEvent } from '../services/eventService';
import {
  createTeam, getTeamByInviteCode, joinTeamByCode,
  getUserTeamForEvent, getTeamMembers
} from '../services/teamService';
import { registerForEvent, isRegistered } from '../services/registrationService';
import type { FullEvent, Team } from '../types';

interface MemberRow {
  tempId: string; name: string; email: string;
  college: string; year: string; role: string; phone: string;
}

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate', 'Professional'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;

// ── mode: 'new' = create team, 'existing' = join by invite code
type TeamMode = 'new' | 'existing';

export default function RegistrationForm() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [event, setEvent] = useState<FullEvent | null>(null);
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyReg, setAlreadyReg] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Team mode
  const [teamMode, setTeamMode] = useState<TeamMode>('new');
  const [existingCode, setExistingCode] = useState('');
  const [existingTeam, setExistingTeam] = useState<Team | null>(null);
  const [lookingUpCode, setLookingUpCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [form, setForm] = useState({
    teamName: '',
    collegeName: '',
    projectIdea: '',
    motivation: '',
    experienceLevel: 'beginner' as typeof EXPERIENCE[number],
    members: [{
      tempId: '1',
      name: profile?.name || '',
      email: profile?.email || '',
      college: '', year: '', role: 'Team Leader', phone: '',
    }] as MemberRow[],
  });

  // ── Load event ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventId || !profile) return;
    setIsLoading(true);
    Promise.all([getEvent(eventId), isRegistered(profile.$id, eventId)])
      .then(([ev, reg]) => { setEvent(ev); setAlreadyReg(reg); })
      .catch((e) => setError(e?.message || 'Failed to load event'))
      .finally(() => setIsLoading(false));
  }, [eventId, profile?.$id]);

  // ── Look up existing team code ────────────────────────────────────────────
  const lookupExistingCode = async () => {
    if (!existingCode.trim()) return;
    setLookingUpCode(true);
    setCodeError('');
    setExistingTeam(null);
    try {
      const t = await getTeamByInviteCode(existingCode.toUpperCase().trim());
      if (!t) { setCodeError('Invalid invite code'); return; }
      if (t.eventId !== eventId) { setCodeError('This team is for a different event'); return; }
      if (t.status !== 'open') { setCodeError('This team is full or closed'); return; }
      setExistingTeam(t);
    } catch { setCodeError('Could not find team'); }
    finally { setLookingUpCode(false); }
  };

  // ── Member helpers ────────────────────────────────────────────────────────
  const addMember = () => {
    if (!event || form.members.length >= event.teamSizeMax) return;
    setForm({
      ...form, members: [...form.members, {
        tempId: Date.now().toString(), name: '', email: '',
        college: '', year: '', role: 'Team Member', phone: '',
      }]
    });
  };
  const removeMember = (id: string) => {
    if (form.members.length <= 1) return;
    setForm({ ...form, members: form.members.filter((m) => m.tempId !== id) });
  };
  const updateMember = (id: string, field: keyof MemberRow, val: string) =>
    setForm({ ...form, members: form.members.map((m) => m.tempId === id ? { ...m, [field]: val } : m) });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile || !eventId || !event) return;
    setIsSubmitting(true);
    setError('');
    try {
      let teamId: string;

      if (teamMode === 'existing' && existingTeam) {
        // Join existing team
        await joinTeamByCode(existingCode.toUpperCase().trim(), profile.$id);
        teamId = existingTeam.$id;
      } else {
        // Create new team
        const team = await createTeam(
          eventId, profile.$id,
          form.teamName, form.projectIdea,
          event.teamSizeMax
        );
        teamId = team.$id;
      }

      // Register for event
      await registerForEvent(eventId, profile.$id, teamId, {
        participantName: profile.name,
        participantEmail: profile.email,
        collegeName: form.collegeName,
        yearOfStudy: form.members[0].year,
        phone: form.members[0].phone,
        tShirtSize: 'M',        // default, field removed from UI
        dietaryRequirements: '',
        emergencyContact: '',
        emergencyPhone: '',
        linkedinUrl: profile.linkedin || '',
        githubUrl: profile.github || '',
        experienceLevel: form.experienceLevel,
        motivation: form.motivation,
        projectIdea: form.projectIdea,
      });

      setShowSuccess(true);
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );
  if (error && !event) return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center px-4">
      <div className="cyber-card p-8 text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/events" className="cyber-button-primary">Back to Events</Link>
      </div>
    </div>
  );
  if (alreadyReg) return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center px-4">
      <div className="cyber-card p-10 text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Already Registered</h2>
        <p className="text-cyber-gray mb-6">You're already registered for <span className="text-cyber-cyan">{event?.title}</span>.</p>
        <div className="flex gap-3">
          <Link to="/participant/my-events" className="flex-1 cyber-button-primary text-center">My Events</Link>
          <Link to="/participant/team" className="flex-1 cyber-button text-center">My Team</Link>
        </div>
      </div>
    </div>
  );

  const steps = ['Team Setup', 'Personal Details', 'Review'];
  const canNext1 = teamMode === 'existing'
    ? !!existingTeam
    : form.teamName.trim() && form.collegeName.trim() && form.members.every(m => m.name && m.email);
  const canNext2 = form.motivation.trim();
  const canSubmit = canNext1 && canNext2;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/events/${eventId}`} className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-cyber-gray" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Event Registration</h1>
            <p className="text-cyber-gray text-sm">{event?.title}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step > i + 1 ? 'bg-green-500 text-white'
                  : step === i + 1 ? 'bg-cyber-cyan text-cyber-dark'
                    : 'bg-cyber-cyan/20 text-cyber-gray'
                }`}>{step > i + 1 ? '✓' : i + 1}</div>
              <span className={`hidden sm:block ml-2 mr-2 text-sm ${step === i + 1 ? 'text-white' : 'text-cyber-gray'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`w-6 sm:w-12 h-px ${step > i + 1 ? 'bg-green-500' : 'bg-cyber-cyan/20'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="cyber-card p-6 space-y-6">

          {/* ── Step 1: Team Setup ────────────────────────────────────── */}
          {step === 1 && (
            <>
              {/* Team mode toggle */}
              <div>
                <label className="block text-sm text-cyber-gray mb-3">Team Option</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { mode: 'new' as TeamMode, icon: Plus, label: 'Create New Team', desc: 'Start a new team for this event' },
                    { mode: 'existing' as TeamMode, icon: Users, label: 'Join Existing Team', desc: 'Use an invite code from a teammate' },
                  ].map(({ mode, icon: Icon, label, desc }) => (
                    <button key={mode} type="button"
                      onClick={() => { setTeamMode(mode); setExistingTeam(null); setCodeError(''); }}
                      className={`p-4 border rounded-xl text-left transition-all ${teamMode === mode
                          ? 'border-cyber-cyan bg-cyber-cyan/10'
                          : 'border-cyber-cyan/30 hover:border-cyber-cyan/50'
                        }`}>
                      <Icon className={`w-5 h-5 mb-2 ${teamMode === mode ? 'text-cyber-cyan' : 'text-cyber-gray'}`} />
                      <p className={`font-medium text-sm ${teamMode === mode ? 'text-white' : 'text-cyber-gray'}`}>{label}</p>
                      <p className="text-cyber-gray/70 text-xs mt-0.5">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Existing team: enter code */}
              {teamMode === 'existing' && (
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Team Invite Code</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                      <input type="text" value={existingCode}
                        onChange={(e) => setExistingCode(e.target.value.toUpperCase())}
                        placeholder="e.g. NINJA26"
                        className="cyber-input pl-9 font-mono tracking-widest uppercase"
                        onKeyDown={(e) => { if (e.key === 'Enter') lookupExistingCode(); }} />
                    </div>
                    <button onClick={lookupExistingCode}
                      disabled={lookingUpCode || !existingCode.trim()}
                      className="cyber-button px-4 disabled:opacity-50">
                      {lookingUpCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find'}
                    </button>
                  </div>
                  {codeError && <p className="text-red-400 text-xs mt-2">{codeError}</p>}
                  {existingTeam && (
                    <div className="mt-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-semibold text-sm">Team Found!</span>
                      </div>
                      <p className="text-white font-medium">{existingTeam.name}</p>
                      <p className="text-cyber-gray text-sm">{existingTeam.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* New team fields */}
              {teamMode === 'new' && (
                <>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Team Name *</label>
                    <input type="text" value={form.teamName}
                      onChange={(e) => setForm({ ...form, teamName: e.target.value })}
                      placeholder="Your awesome team name" className="cyber-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">College / Organisation *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                      <input type="text" value={form.collegeName}
                        onChange={(e) => setForm({ ...form, collegeName: e.target.value })}
                        placeholder="Institution name" className="cyber-input pl-9" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Project Idea (optional)</label>
                    <textarea value={form.projectIdea}
                      onChange={(e) => setForm({ ...form, projectIdea: e.target.value })}
                      placeholder="Briefly describe what you plan to build..." rows={3}
                      className="cyber-input resize-none" />
                  </div>

                  {/* Team members */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-white font-medium">
                        Add Teammates <span className="text-cyber-gray text-sm">({form.members.length}/{event?.teamSizeMax || 4})</span>
                      </label>
                      {event && form.members.length < event.teamSizeMax && (
                        <button onClick={addMember}
                          className="flex items-center gap-1 text-sm text-cyber-cyan hover:underline">
                          <Plus className="w-4 h-4" />Add Member
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {form.members.map((member, idx) => (
                        <div key={member.tempId} className="p-4 border border-cyber-cyan/20 rounded-lg bg-cyber-cyan/5">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-cyber-cyan text-sm font-medium">{member.role}</span>
                            {idx > 0 && (
                              <button onClick={() => removeMember(member.tempId)}
                                className="p-1 hover:bg-red-500/10 rounded transition-colors">
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                              <input type="text" value={member.name}
                                onChange={(e) => updateMember(member.tempId, 'name', e.target.value)}
                                placeholder="Full name *" className="cyber-input pl-9" />
                            </div>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                              <input type="email" value={member.email}
                                onChange={(e) => updateMember(member.tempId, 'email', e.target.value)}
                                placeholder="Email *" className="cyber-input pl-9" disabled={idx === 0} />
                            </div>
                            <div className="relative">
                              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                              <input type="text" value={member.college}
                                onChange={(e) => updateMember(member.tempId, 'college', e.target.value)}
                                placeholder="College" className="cyber-input pl-9" />
                            </div>
                            <select value={member.year}
                              onChange={(e) => updateMember(member.tempId, 'year', e.target.value)}
                              className="cyber-input">
                              <option value="">Year of study</option>
                              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {idx === 0 && (
                              <div className="relative sm:col-span-2">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                                <input type="tel" value={member.phone}
                                  onChange={(e) => updateMember(member.tempId, 'phone', e.target.value)}
                                  placeholder="Phone number" className="cyber-input pl-9" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Step 2: Personal Details ──────────────────────────────── */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Why do you want to participate? *</label>
                <textarea value={form.motivation}
                  onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                  placeholder="Tell us your motivation..." rows={4} className="cyber-input resize-none" />
              </div>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Experience Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {EXPERIENCE.map((lvl) => (
                    <button key={lvl} type="button"
                      onClick={() => setForm({ ...form, experienceLevel: lvl })}
                      className={`py-2.5 rounded-lg border text-sm capitalize transition-colors ${form.experienceLevel === lvl
                          ? 'border-cyber-cyan bg-cyber-cyan/20 text-cyber-cyan'
                          : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
                        }`}>{lvl}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Review ────────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-white font-heading font-semibold">Review Your Registration</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Team', value: teamMode === 'existing' ? existingTeam?.name : form.teamName },
                  { label: 'Mode', value: teamMode === 'existing' ? 'Joining existing team' : 'Creating new team' },
                  { label: 'Experience', value: form.experienceLevel },
                  { label: 'Event', value: event?.title },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/10 rounded-lg">
                    <span className="text-cyber-gray">{label}</span>
                    <span className="text-white font-medium truncate ml-2">{value || '—'}</span>
                  </div>
                ))}
              </div>
              {teamMode === 'new' && (
                <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                  <p className="text-cyber-gray text-sm font-medium mb-2">Team Members ({form.members.length}):</p>
                  {form.members.map((m) => (
                    <div key={m.tempId} className="flex items-center gap-2 py-0.5">
                      <User className="w-3 h-3 text-cyber-cyan" />
                      <span className="text-white text-sm">{m.name}</span>
                      <span className="text-cyber-gray text-xs">({m.role})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ───────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Back
              </button>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                className="flex-1 cyber-button-primary disabled:opacity-50">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting || !canSubmit}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? 'Registering…' : 'Complete Registration'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30 text-center">
          <CheckCircle className="w-16 h-16 text-cyber-cyan mx-auto mt-4" />
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white text-center mt-2">
              Registration Successful!
            </DialogTitle>
          </DialogHeader>
          <p className="text-cyber-gray text-sm mb-4">
            You're registered for <span className="text-cyber-cyan">{event?.title}</span>.
            {teamMode === 'new' && ' Your invite link has been created.'}
          </p>
          <div className="flex flex-col gap-3 pb-2">
            {teamMode === 'new' && (
              <button onClick={() => navigate('/participant/team')} className="w-full cyber-button-primary">
                View My Team & Share Invite
              </button>
            )}
            <button onClick={() => navigate('/participant/my-events')} className="w-full cyber-button">
              View My Events
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
