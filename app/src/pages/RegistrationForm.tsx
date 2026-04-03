import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, User, Mail, Building2, GraduationCap,
  Plus, Trash2, CheckCircle, Send, Phone, Loader2, AlertCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { getEvent } from '../services/eventService';
import { createTeam } from '../services/teamService';
import { registerForEvent, isRegistered } from '../services/registrationService';
import type { HackEvent } from '../types';

interface MemberRow {
  tempId: string;
  name: string;
  email: string;
  college: string;
  year: string;
  role: string;
  phone: string;
}

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate', 'Professional'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'] as const;
const TSHIRTS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function RegistrationForm() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [event, setEvent] = useState<HackEvent | null>(null);
  const [step, setStep] = useState(1);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyReg, setAlreadyReg] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    teamName: '',
    collegeName: '',
    projectIdea: '',
    motivation: '',
    experienceLevel: 'beginner' as typeof EXPERIENCE[number],
    tShirtSize: 'M',
    dietaryRequirements: '',
    emergencyContact: '',
    emergencyPhone: '',
    members: [
      { tempId: '1', name: profile?.name || '', email: profile?.email || '', college: '', year: '', role: 'Team Leader', phone: '' },
    ] as MemberRow[],
  });

  useEffect(() => {
    if (!eventId || !profile) return;
    getEvent(eventId).then(setEvent);
    isRegistered(profile.$id, eventId).then((reg) => {
      if (reg) setAlreadyReg(true);
    });
  }, [eventId, profile?.$id]);

  const addMember = () => {
    if (!event || form.members.length >= event.teamSizeMax) return;
    setForm({
      ...form,
      members: [
        ...form.members,
        { tempId: Date.now().toString(), name: '', email: '', college: '', year: '', role: 'Team Member', phone: '' },
      ],
    });
  };

  const removeMember = (tempId: string) => {
    if (form.members.length <= 1) return;
    setForm({ ...form, members: form.members.filter((m) => m.tempId !== tempId) });
  };

  const updateMember = (tempId: string, field: keyof MemberRow, value: string) => {
    setForm({
      ...form,
      members: form.members.map((m) => m.tempId === tempId ? { ...m, [field]: value } : m),
    });
  };

  const handleSubmit = async () => {
    if (!profile || !eventId || !event) return;
    setIsSubmitting(true);
    setError('');
    try {
      // 1. Create team
      const team = await createTeam(
        eventId, profile.$id,
        form.teamName, form.projectIdea, event.teamSizeMax
      );

      // 2. Register leader
      await registerForEvent(eventId, profile.$id, team.$id, {
        participantName: profile.name,
        participantEmail: profile.email,
        collegeName: form.collegeName,
        yearOfStudy: form.members[0].year,
        phone: form.members[0].phone,
        tShirtSize: form.tShirtSize,
        dietaryRequirements: form.dietaryRequirements,
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
        linkedinUrl: profile.linkedin || '',
        githubUrl: profile.github || '',
        experienceLevel: form.experienceLevel,
        motivation: form.motivation,
        projectIdea: form.projectIdea,
      });

      setShowSuccessDialog(true);
    } catch (e: any) {
      setError(e?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (alreadyReg) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="cyber-card p-10 text-center max-w-md">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-heading font-bold text-white mb-2">Already Registered</h2>
        <p className="text-cyber-gray mb-6">You're already registered for this event.</p>
        <Link to="/participant/my-events" className="cyber-button-primary">View My Events</Link>
      </div>
    </div>
  );

  const steps = ['Team Info', 'Personal Details', 'Review'];
  const canProceed1 = form.teamName && form.collegeName && form.members.every((m) => m.name && m.email);
  const canProceed2 = form.motivation && form.experienceLevel;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/events/${eventId}`} className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-cyber-gray" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white">Event Registration</h1>
            <p className="text-cyber-gray text-sm">{event?.title}</p>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > i+1 ? 'bg-green-500 text-white' : step === i+1 ? 'bg-cyber-cyan text-cyber-dark' : 'bg-cyber-cyan/20 text-cyber-gray'
              }`}>{step > i+1 ? '✓' : i+1}</div>
              <span className={`hidden sm:block ml-2 text-sm ${step === i+1 ? 'text-white' : 'text-cyber-gray'}`}>{s}</span>
              {i < steps.length-1 && <div className={`w-8 sm:w-16 h-px mx-2 ${step > i+1 ? 'bg-green-500' : 'bg-cyber-cyan/20'}`} />}
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
          {/* Step 1: Team Info */}
          {step === 1 && (
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
                <label className="block text-sm text-cyber-gray mb-2">Project Idea (Optional)</label>
                <textarea value={form.projectIdea}
                  onChange={(e) => setForm({ ...form, projectIdea: e.target.value })}
                  placeholder="Briefly describe what you plan to build..." rows={3}
                  className="cyber-input resize-none" />
              </div>

              {/* Team Members */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-white font-medium">
                    Team Members ({form.members.length}/{event?.teamSizeMax || 4})
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
                            placeholder="Email *" className="cyber-input pl-9"
                            disabled={idx === 0} />
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

          {/* Step 2: Personal Details */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Why do you want to participate? *</label>
                <textarea value={form.motivation}
                  onChange={(e) => setForm({ ...form, motivation: e.target.value })}
                  placeholder="Tell us your motivation..." rows={4} className="cyber-input resize-none" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Experience Level *</label>
                  <select value={form.experienceLevel}
                    onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as any })}
                    className="cyber-input">
                    {EXPERIENCE.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">T-Shirt Size</label>
                  <select value={form.tShirtSize}
                    onChange={(e) => setForm({ ...form, tShirtSize: e.target.value })}
                    className="cyber-input">
                    {TSHIRTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Dietary Requirements</label>
                <input type="text" value={form.dietaryRequirements}
                  onChange={(e) => setForm({ ...form, dietaryRequirements: e.target.value })}
                  placeholder="e.g. Vegetarian, Vegan, None" className="cyber-input" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Emergency Contact Name</label>
                  <input type="text" value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    placeholder="Full name" className="cyber-input" />
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Emergency Contact Phone</label>
                  <input type="tel" value={form.emergencyPhone}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                    placeholder="Phone number" className="cyber-input" />
                </div>
              </div>
            </>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-white font-heading font-semibold">Review Your Registration</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Team Name', value: form.teamName },
                  { label: 'College', value: form.collegeName },
                  { label: 'Experience', value: form.experienceLevel },
                  { label: 'T-Shirt', value: form.tShirtSize },
                  { label: 'Team Members', value: `${form.members.length} member(s)` },
                  { label: 'Event', value: event?.title },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/10 rounded-lg">
                    <span className="text-cyber-gray">{label}</span>
                    <span className="text-white font-medium truncate ml-2">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                <p className="text-cyber-gray text-sm font-medium mb-2">Team Members:</p>
                {form.members.map((m) => (
                  <div key={m.tempId} className="flex items-center gap-2 py-1">
                    <User className="w-3 h-3 text-cyber-cyan" />
                    <span className="text-white text-sm">{m.name}</span>
                    <span className="text-cyber-gray text-xs">({m.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canProceed1) || (step === 2 && !canProceed2)}
                className="flex-1 cyber-button-primary disabled:opacity-50">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30 text-center">
          <CheckCircle className="w-16 h-16 text-cyber-cyan mx-auto mt-4" />
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white text-center mt-2">
              Registration Successful!
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-cyber-gray text-center">
            You're registered for <span className="text-cyber-cyan">{event?.title}</span>. Your team invite link has been created.
          </DialogDescription>
          <div className="flex flex-col gap-3 mt-4 pb-2">
            <button onClick={() => navigate('/invite')} className="w-full cyber-button-primary">
              Invite Teammates
            </button>
            <button onClick={() => navigate('/participant/my-events')} className="w-full cyber-button">
              View My Events
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
