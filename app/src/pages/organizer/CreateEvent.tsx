import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Plus, X, Loader2, Upload, Image } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { createEvent } from '../../services/eventService';

const CATEGORIES = [
  'Open Innovation', 'AI/ML', 'Web3/Blockchain', 'Cybersecurity',
  'Sustainability', 'Healthcare', 'Gaming', 'Fintech', 'Education', 'Social Impact',
];

interface Prize { place: string; amount: string; description: string }

export default function CreateEvent() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState('');

  const [form, setForm] = useState({
    title:                '',
    shortDescription:     '',
    description:          '',
    startDate:            '',
    endDate:              '',
    registrationDeadline: '',
    maxParticipants:      500,
    teamSizeMin:          2,
    teamSizeMax:          4,
    category:             '',
    location:             'Online',
    prizes: [
      { place: '1st Place', amount: '', description: '' },
      { place: '2nd Place', amount: '', description: '' },
      { place: '3rd Place', amount: '', description: '' },
    ] as Prize[],
    rules:       [''] as string[],
    eligibility: [''] as string[],
  });

  // ── Banner ──────────────────────────────────────────────────────────────────
  const handleBanner = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('Banner must be under 10 MB'); return; }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setError('');
  };

  // ── Prizes / lists helpers ───────────────────────────────────────────────────
  const updatePrize = (i: number, field: keyof Prize, val: string) => {
    const prizes = [...form.prizes];
    prizes[i] = { ...prizes[i], [field]: val };
    setForm({ ...form, prizes });
  };
  const addPrize = () => setForm({ ...form, prizes: [...form.prizes, { place: '', amount: '', description: '' }] });
  const removePrize = (i: number) => setForm({ ...form, prizes: form.prizes.filter((_, j) => j !== i) });

  const updateList = (key: 'rules' | 'eligibility', i: number, val: string) => {
    const list = [...form[key]];
    list[i] = val;
    setForm({ ...form, [key]: list });
  };
  const addListItem = (key: 'rules' | 'eligibility') =>
    setForm({ ...form, [key]: [...form[key], ''] });
  const removeListItem = (key: 'rules' | 'eligibility', i: number) =>
    setForm({ ...form, [key]: form[key].filter((_, j) => j !== i) });

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!profile) return;
    setError('');

    // Validate required fields
    if (!form.title.trim())                { setError('Event title is required'); return; }
    if (!form.shortDescription.trim())     { setError('Short description is required'); return; }
    if (!form.startDate)                   { setError('Start date is required'); return; }
    if (!form.endDate)                     { setError('End date is required'); return; }
    if (!form.registrationDeadline)        { setError('Registration deadline is required'); return; }
    if (!form.category)                    { setError('Category is required'); return; }

    setIsSubmitting(true);
    try {
      await createEvent(
        profile.$id,
        {
          title:                form.title.trim(),
          shortDescription:     form.shortDescription.trim(),
          description:          form.description.trim(),
          startDate:            form.startDate,
          endDate:              form.endDate,
          registrationDeadline: form.registrationDeadline,
          maxParticipants:      form.maxParticipants,
          teamSizeMin:          form.teamSizeMin,
          teamSizeMax:          form.teamSizeMax,
          category:             form.category,
          location:             form.location,
          prizes:               form.prizes,
          rules:                form.rules,
          eligibility:          form.eligibility,
        },
        bannerFile ?? undefined
      );
      setShowSuccess(true);
    } catch (e: any) {
      console.error('Create event error:', e);
      setError(e?.message || 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = ['Basic Info', 'Dates & Size', 'Prizes & Rules', 'Review'];

  const canNext1 = form.title.trim() && form.shortDescription.trim() && form.category;
  const canNext2 = form.startDate && form.endDate && form.registrationDeadline;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to="/organizer/dashboard"
          className="flex items-center text-cyber-gray hover:text-cyber-cyan mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />Back to Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Create Event</h1>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-4 flex-wrap">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > i + 1 ? 'bg-green-500 text-white'
                  : step === i + 1 ? 'bg-cyber-cyan text-cyber-dark'
                  : 'bg-cyber-cyan/20 text-cyber-gray'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`hidden sm:block ml-1 mr-2 text-sm ${step === i + 1 ? 'text-white' : 'text-cyber-gray'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-4 sm:w-8 h-px mr-1 ${step > i + 1 ? 'bg-green-500' : 'bg-cyber-cyan/20'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="cyber-card p-6 space-y-5">

          {/* ── Step 1: Basic Info ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Event Title *</label>
                <input type="text" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Neon Buildathon 2026" className="cyber-input" />
              </div>

              <div>
                <label className="block text-sm text-cyber-gray mb-2">Short Description * (shown on cards)</label>
                <input type="text" value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  placeholder="One-line summary of your event"
                  className="cyber-input" maxLength={255} />
                <p className="text-cyber-gray/50 text-xs mt-1">{form.shortDescription.length}/255</p>
              </div>

              <div>
                <label className="block text-sm text-cyber-gray mb-2">Full Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5} className="cyber-input resize-none"
                  placeholder="Describe the hackathon theme, goals, and what makes it special..." />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Category *</label>
                  <select value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="cyber-input">
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Location</label>
                  <input type="text" value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="cyber-input" placeholder="Online / City, Country" />
                </div>
              </div>

              {/* Banner Upload */}
              <div>
                <label className="block text-sm text-cyber-gray mb-2">
                  Event Banner (max 10 MB — stored in Appwrite Storage)
                </label>
                {bannerPreview ? (
                  <div className="relative mb-3">
                    <img src={bannerPreview} alt="Banner preview"
                      className="w-full h-44 object-cover rounded-lg border border-cyber-cyan/20" />
                    <button
                      onClick={() => { setBannerFile(null); setBannerPreview(''); }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-cyber-cyan/30 rounded-lg cursor-pointer hover:border-cyber-cyan/60 transition-colors"
                    onClick={() => bannerInputRef.current?.click()}>
                    <Image className="w-8 h-8 text-cyber-cyan/60" />
                    <span className="text-cyber-gray text-sm">Click to upload banner image</span>
                    <span className="text-cyber-gray/50 text-xs">JPG, PNG, WEBP — max 10 MB</span>
                  </label>
                )}
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden"
                  onChange={handleBanner} />
              </div>
            </>
          )}

          {/* ── Step 2: Dates & Team Size ──────────────────────────────────── */}
          {step === 2 && (
            <>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Registration Deadline *</label>
                  <input type="datetime-local" value={form.registrationDeadline}
                    onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                    className="cyber-input" />
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Start Date *</label>
                  <input type="datetime-local" value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="cyber-input" />
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">End Date *</label>
                  <input type="datetime-local" value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="cyber-input" />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Max Participants</label>
                  <input type="number" value={form.maxParticipants} min={10} max={10000}
                    onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                    className="cyber-input" />
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Min Team Size</label>
                  <input type="number" value={form.teamSizeMin} min={1} max={form.teamSizeMax}
                    onChange={(e) => setForm({ ...form, teamSizeMin: Number(e.target.value) })}
                    className="cyber-input" />
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Max Team Size</label>
                  <input type="number" value={form.teamSizeMax} min={form.teamSizeMin} max={10}
                    onChange={(e) => setForm({ ...form, teamSizeMax: Number(e.target.value) })}
                    className="cyber-input" />
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Prizes & Rules ─────────────────────────────────────── */}
          {step === 3 && (
            <>
              {/* Prizes */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white font-medium">Prizes</label>
                  <button onClick={addPrize}
                    className="flex items-center gap-1 text-sm text-cyber-cyan hover:underline">
                    <Plus className="w-4 h-4" />Add Prize
                  </button>
                </div>
                <div className="space-y-3">
                  {form.prizes.map((p, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <input value={p.place}
                        onChange={(e) => updatePrize(i, 'place', e.target.value)}
                        placeholder="Place (e.g. 1st)" className="cyber-input text-sm" />
                      <input value={p.amount}
                        onChange={(e) => updatePrize(i, 'amount', e.target.value)}
                        placeholder="Amount (e.g. $5000)" className="cyber-input text-sm" />
                      <input value={p.description}
                        onChange={(e) => updatePrize(i, 'description', e.target.value)}
                        placeholder="Details" className="cyber-input text-sm" />
                      {i > 0 && (
                        <button onClick={() => removePrize(i)} className="text-red-400 hover:text-red-300 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white font-medium">Rules</label>
                  <button onClick={() => addListItem('rules')}
                    className="flex items-center gap-1 text-sm text-cyber-cyan hover:underline">
                    <Plus className="w-4 h-4" />Add Rule
                  </button>
                </div>
                <div className="space-y-2">
                  {form.rules.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={r} onChange={(e) => updateList('rules', i, e.target.value)}
                        placeholder={`Rule ${i + 1}`} className="cyber-input flex-1 text-sm" />
                      {i > 0 && (
                        <button onClick={() => removeListItem('rules', i)} className="text-red-400 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white font-medium">Eligibility</label>
                  <button onClick={() => addListItem('eligibility')}
                    className="flex items-center gap-1 text-sm text-cyber-cyan hover:underline">
                    <Plus className="w-4 h-4" />Add Criteria
                  </button>
                </div>
                <div className="space-y-2">
                  {form.eligibility.map((e, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={e} onChange={(ev) => updateList('eligibility', i, ev.target.value)}
                        placeholder={`Criteria ${i + 1}`} className="cyber-input flex-1 text-sm" />
                      {i > 0 && (
                        <button onClick={() => removeListItem('eligibility', i)} className="text-red-400 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Step 4: Review ──────────────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-white font-heading font-semibold text-lg">Review Before Creating</h3>
              {bannerPreview && (
                <img src={bannerPreview} alt="Banner" className="w-full h-40 object-cover rounded-lg" />
              )}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: 'Title',            value: form.title },
                  { label: 'Category',         value: form.category },
                  { label: 'Location',         value: form.location },
                  { label: 'Max Participants', value: form.maxParticipants },
                  { label: 'Team Size',        value: `${form.teamSizeMin}–${form.teamSizeMax}` },
                  { label: 'Reg. Deadline',    value: form.registrationDeadline ? new Date(form.registrationDeadline).toLocaleDateString() : '—' },
                  { label: 'Start',            value: form.startDate ? new Date(form.startDate).toLocaleDateString() : '—' },
                  { label: 'End',              value: form.endDate ? new Date(form.endDate).toLocaleDateString() : '—' },
                  { label: 'Prizes',           value: `${form.prizes.filter(p => p.amount).length} defined` },
                  { label: 'Rules',            value: `${form.rules.filter(Boolean).length} rules` },
                  { label: 'Banner',           value: bannerFile ? `${bannerFile.name} (${(bannerFile.size / 1024 / 1024).toFixed(1)} MB)` : 'None' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/10 rounded-lg">
                    <span className="text-cyber-gray">{label}</span>
                    <span className="text-white font-medium truncate ml-2 max-w-[160px]">{value || '—'}</span>
                  </div>
                ))}
              </div>
              <p className="text-cyber-gray text-sm">
                The event will be saved as a <span className="text-cyber-cyan font-semibold">Draft</span>.
                Publish it from the dashboard when ready.
              </p>
            </div>
          )}

          {/* ── Navigation buttons ──────────────────────────────────────────── */}
          <div className="flex gap-3 pt-4 border-t border-cyber-cyan/10">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => { setError(''); setStep(step + 1); }}
                disabled={
                  (step === 1 && !canNext1) ||
                  (step === 2 && !canNext2)
                }
                className="flex-1 cyber-button-primary disabled:opacity-50">
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isSubmitting}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                  : 'Create as Draft'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Success dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30 text-center">
          <CheckCircle className="w-16 h-16 text-cyber-cyan mx-auto mt-4" />
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white text-center mt-2">
              Event Created!
            </DialogTitle>
          </DialogHeader>
          <p className="text-cyber-gray text-sm mb-4">
            Saved as Draft in both <span className="text-cyber-cyan">events</span> and{' '}
            <span className="text-cyber-cyan">event_details</span> collections.
            {bannerFile && ' Banner uploaded to Storage.'}
          </p>
          <button
            onClick={() => { setShowSuccess(false); navigate('/organizer/dashboard'); }}
            className="w-full cyber-button-primary">
            Go to Dashboard
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
