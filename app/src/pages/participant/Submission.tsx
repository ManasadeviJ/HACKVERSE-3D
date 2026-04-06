import { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, Github, Globe, CheckCircle,
  AlertCircle, X, Send, Loader2, Video,
  Link as LinkIcon, Lock, Clock, ChevronDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserTeams } from '../../services/teamService';
import { isRegistered } from '../../services/registrationService';
import { getEvent } from '../../services/eventService';
import { databases, storage, DB_ID, COLLECTIONS, BUCKETS } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Team, Submission, FullEvent } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-cyber-cyan/20 text-cyber-cyan',
  evaluated: 'bg-green-500/20 text-green-400',
  draft: 'bg-yellow-500/20 text-yellow-400',
  under_review: 'bg-blue-500/20 text-blue-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getTeamSubmission(teamId: string, eventId: string): Promise<Submission | null> {
  const res = await databases.listDocuments<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, [
    Query.equal('teamId', teamId),
    Query.equal('eventId', eventId),
    Query.limit(1),
  ]);
  return res.documents[0] || null;
}

async function upsertSubmission(
  eventId: string, teamId: string, leaderId: string,
  data: {
    projectName: string; description: string; techStack: string[];
    githubUrl: string; demoUrl: string; videoUrl: string; presentationUrl: string;
  }
): Promise<Submission> {
  const existing = await getTeamSubmission(teamId, eventId);
  const payload = { eventId, teamId, leaderId, ...data, techStack: JSON.stringify(data.techStack), status: 'draft' };
  if (existing) {
    return databases.updateDocument<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, existing.$id, payload);
  }
  return databases.createDocument<Submission>(DB_ID, COLLECTIONS.SUBMISSIONS, ID.unique(), {
    ...payload, fileIds: '[]', submittedAt: '',
  });
}

function getFileViewUrl(fileId: string): string {
  return storage.getFileView(BUCKETS.SUBMISSIONS, fileId).toString();
}

// ─── Check if an event's submission window is open ────────────────────────────
function checkSubmissionOpen(event: FullEvent): { open: boolean; msg: string } {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (now < start) return { open: false, msg: `Submissions open on ${new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` };
  if (now > end) return { open: false, msg: `Submission window closed on ${new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` };
  return { open: true, msg: '' };
}

interface TeamWithEvent { team: Team; event: FullEvent; registered: boolean }

export default function SubmissionPage() {
  const { profile } = useAuth();

  // All team+event combos the user has
  const [teamEvents, setTeamEvents] = useState<TeamWithEvent[]>([]);
  // The currently selected one (defaults to the ongoing event)
  const [selected, setSelected] = useState<TeamWithEvent | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    projectName: '', description: '', techStack: '',
    githubUrl: '', demoUrl: '', videoUrl: '', presentationUrl: '',
  });

  // ── Load all teams → enrich with event + registration ─────────────────────
  useEffect(() => {
    if (!profile) return;
    getUserTeams(profile.$id).then(async (teams) => {
      const enriched = await Promise.all(
        teams.map(async (team) => {
          const [event, registered] = await Promise.all([
            getEvent(team.eventId),
            isRegistered(profile.$id, team.eventId),
          ]);
          return { team, event, registered };
        })
      );

      setTeamEvents(enriched);

      // ── AUTO-SELECT the ongoing event (or most recently started) ───────────
      const now = Date.now();
      const ongoing = enriched.filter(({ event, registered }) => {
        if (!registered) return false;
        const start = new Date(event.startDate).getTime();
        const end = new Date(event.endDate).getTime();
        return now >= start && now <= end;
      });

      // Pick first ongoing; fall back to most-recently-started registered event
      const pick = ongoing[0] || enriched
        .filter(e => e.registered)
        .sort((a, b) =>
          new Date(b.event.startDate).getTime() - new Date(a.event.startDate).getTime()
        )[0] || null;

      if (pick) {
        setSelected(pick);
        const sub = await getTeamSubmission(pick.team.$id, pick.event.$id);
        if (sub) {
          setSubmission(sub);
          loadFormFromSub(sub);
        }
      }
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  // ── When user switches event → reload submission ───────────────────────────
  const switchEvent = async (te: TeamWithEvent) => {
    setSelected(te);
    setSubmission(null);
    setError('');
    setForm({ projectName: '', description: '', techStack: '', githubUrl: '', demoUrl: '', videoUrl: '', presentationUrl: '' });
    const sub = await getTeamSubmission(te.team.$id, te.event.$id);
    if (sub) { setSubmission(sub); loadFormFromSub(sub); }
  };

  function loadFormFromSub(sub: Submission) {
    setForm({
      projectName: sub.projectName,
      description: sub.description,
      techStack: (() => { try { return JSON.parse(sub.techStack || '[]').join(', '); } catch { return ''; } })(),
      githubUrl: sub.githubUrl,
      demoUrl: sub.demoUrl,
      videoUrl: sub.videoUrl,
      presentationUrl: sub.presentationUrl,
    });
  }

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!selected || !profile || isSaving) return;
    setIsSaving(true); setError('');
    try {
      const saved = await upsertSubmission(selected.event.$id, selected.team.$id, profile.$id, {
        projectName: form.projectName,
        description: form.description,
        techStack: form.techStack.split(',').map(s => s.trim()).filter(Boolean),
        githubUrl: form.githubUrl,
        demoUrl: form.demoUrl,
        videoUrl: form.videoUrl,
        presentationUrl: form.presentationUrl,
      });
      setSubmission(saved);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally { setIsSaving(false); }
  };

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!selected || !submissionWindow.open) return;
    let sub = submission;
    if (!sub) { await handleSaveDraft(); sub = await getTeamSubmission(selected.team.$id, selected.event.$id); }
    if (!sub) return;
    setUploading(true);
    try {
      const uploaded = await storage.createFile(BUCKETS.SUBMISSIONS, ID.unique(), file);
      const ids: string[] = JSON.parse(sub.fileIds || '[]');
      ids.push(uploaded.$id);
      await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, sub.$id, { fileIds: JSON.stringify(ids) });
      const updated = await getTeamSubmission(selected.team.$id, selected.event.$id);
      if (updated) setSubmission(updated);
    } catch (e: any) { setError(e?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!submission || !selected) return;
    try { await storage.deleteFile(BUCKETS.SUBMISSIONS, fileId); } catch { /* ignore */ }
    const ids: string[] = JSON.parse(submission.fileIds || '[]').filter((id: string) => id !== fileId);
    await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submission.$id, { fileIds: JSON.stringify(ids) });
    const updated = await getTeamSubmission(selected.team.$id, selected.event.$id);
    if (updated) setSubmission(updated);
  };

  const handleFinalSubmit = async () => {
    if (!submission || !profile || !submissionWindow.open) return;
    setIsSubmitting(true);
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.SUBMISSIONS, submission.$id, {
        status: 'submitted', submittedAt: new Date().toISOString(),
      });
      setSubmission({ ...submission, status: 'submitted', submittedAt: new Date().toISOString() });
      setShowDialog(false);
    } catch (e: any) { setError(e?.message || 'Submit failed'); }
    finally { setIsSubmitting(false); }
  };

  const submissionWindow = selected ? checkSubmissionOpen(selected.event) : { open: false, msg: '' };
  const isDraft = !submission || submission.status === 'draft';
  const canEdit = isDraft && submissionWindow.open;
  const fileIds: string[] = (() => { try { return JSON.parse(submission?.fileIds || '[]'); } catch { return []; } })();

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>;

  const registeredEvents = teamEvents.filter(te => te.registered);

  if (registeredEvents.length === 0) return (
    <div className="min-h-screen py-16 flex items-center justify-center px-4">
      <div className="cyber-card p-10 text-center max-w-md">
        <Lock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-xl font-heading font-bold text-white mb-2">Registration Required</h2>
        <p className="text-cyber-gray mb-6">Register for an event before submitting a project.</p>
        <div className="flex gap-3">
          <Link to="/events" className="flex-1 cyber-button-primary text-center">Browse Events</Link>
          <Link to="/participant/my-events" className="flex-1 cyber-button text-center">My Events</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* ── Event Selector ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-3">Project Submission</h1>

          {registeredEvents.length > 1 ? (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <p className="text-cyber-gray text-sm flex-shrink-0">Submitting for:</p>
              <div className="flex flex-wrap gap-2">
                {registeredEvents.map((te) => {
                  const { open } = checkSubmissionOpen(te.event);
                  const isSel = selected?.team.$id === te.team.$id;
                  return (
                    <button key={te.team.$id} onClick={() => switchEvent(te)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all ${isSel
                          ? 'border-cyber-cyan bg-cyber-cyan/10 text-white'
                          : 'border-cyber-cyan/30 text-cyber-gray hover:border-cyber-cyan/50'
                        }`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${open ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <span className="font-medium">{te.event.title}</span>
                      <span className="text-xs opacity-60">({te.team.name})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : selected ? (
            <p className="text-cyber-gray">
              Team: <span className="text-cyber-cyan">{selected.team.name}</span>
              <span className="text-cyber-gray/60 ml-2">· {selected.event.title}</span>
            </p>
          ) : null}
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3 mb-6">
          {submission && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[submission.status]}`}>
              {submission.status.replace('_', ' ')}
            </span>
          )}
          {selected && (
            <span className={`px-3 py-1 rounded-full text-xs border ${submissionWindow.open
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400'
              }`}>
              {submissionWindow.open ? '🟢 Submission window open' : '🔴 Submission window closed'}
            </span>
          )}
        </div>

        {/* Window closed banner */}
        {selected && !submissionWindow.open && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-400 text-sm">{submissionWindow.msg}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {selected && (
          <div className="cyber-card p-6 space-y-6">
            {/* Fields */}
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Project Name *</label>
              <input type="text" value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                placeholder="What's your project called?" className="cyber-input"
                disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Description *</label>
              <textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your project, the problem it solves, and how it works..."
                rows={4} className="cyber-input resize-none" disabled={!canEdit} />
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Tech Stack</label>
              <input type="text" value={form.techStack}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="React, Node.js, Python… (comma separated)"
                className="cyber-input" disabled={!canEdit} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: Github, key: 'githubUrl', label: 'GitHub Repository', ph: 'https://github.com/…' },
                { icon: Globe, key: 'demoUrl', label: 'Live Demo URL', ph: 'https://…' },
                { icon: Video, key: 'videoUrl', label: 'Demo Video URL', ph: 'YouTube / Loom' },
                { icon: LinkIcon, key: 'presentationUrl', label: 'Presentation URL', ph: 'Google Slides / Canva' },
              ].map(({ icon: Icon, key, label, ph }) => (
                <div key={key}>
                  <label className="block text-sm text-cyber-gray mb-2">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                    <input type="url" value={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={ph} className="cyber-input pl-9" disabled={!canEdit} />
                  </div>
                </div>
              ))}
            </div>

            {/* File upload */}
            {canEdit && (
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Upload Files (PDF, ZIP, PPT — max 100 MB)</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-cyber-cyan/30 hover:border-cyber-cyan/50'
                    }`}>
                  {uploading
                    ? <Loader2 className="w-12 h-12 text-cyber-cyan mx-auto mb-4 animate-spin" />
                    : <Upload className="w-12 h-12 text-cyber-cyan mx-auto mb-4" />}
                  <p className="text-white mb-1">Drop files here or click to upload</p>
                  <p className="text-cyber-gray text-sm">PDF, PPT, ZIP — max 100 MB</p>
                  <input ref={fileInputRef} type="file" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                </div>
              </div>
            )}

            {/* Uploaded files */}
            {fileIds.length > 0 && (
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Uploaded Files ({fileIds.length})</label>
                <div className="space-y-2">
                  {fileIds.map((fid) => (
                    <div key={fid} className="flex items-center justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
                        <a href={getFileViewUrl(fid)} target="_blank" rel="noopener noreferrer"
                          className="text-white text-sm hover:text-cyber-cyan transition-colors">
                          File {fid.slice(-8)}
                        </a>
                      </div>
                      {canEdit && (
                        <button onClick={() => handleRemoveFile(fid)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors">
                          <X className="w-4 h-4 text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evaluated */}
            {submission?.status === 'evaluated' && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-400 inline mr-2" />
                <span className="text-green-400 font-semibold">Evaluated — </span>
                <span className="text-cyber-gray text-sm">Check the leaderboard for your scores.</span>
              </div>
            )}

            {/* Actions */}
            {canEdit && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleSaveDraft} disabled={isSaving}
                  className="flex-1 cyber-button flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : savedOk ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                  {savedOk ? 'Saved!' : isSaving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  onClick={() => { handleSaveDraft(); setShowDialog(true); }}
                  disabled={!form.projectName || !form.description}
                  className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" />Submit Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">Once submitted you cannot modify your project.</p>
            </div>
            <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg space-y-2">
              {[
                { label: 'Project', value: form.projectName },
                { label: 'Event', value: selected?.event.title },
                { label: 'Team', value: selected?.team.name },
                { label: 'Files', value: `${fileIds.length} uploaded` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-cyber-gray">{label}</span>
                  <span className="text-white text-sm">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan transition-colors">
                Review
              </button>
              <button onClick={handleFinalSubmit} disabled={isSubmitting}
                className="flex-1 cyber-button-primary flex items-center justify-center disabled:opacity-50">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Confirm Submit
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
