import { useState, useRef, useEffect } from 'react';
import {
  Upload, FileText, Github, Globe, CheckCircle,
  AlertCircle, X, Send, Loader2, Video, Link as LinkIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { getUserTeams } from '../../services/teamService';
import {
  upsertSubmission, uploadSubmissionFile, removeSubmissionFile,
  finalizeSubmission, getTeamSubmission, getSubmissionFileUrl
} from '../../services/submissionService';
import type { Team, Submission } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  submitted:    'bg-cyber-cyan/20 text-cyber-cyan',
  evaluated:    'bg-green-500/20 text-green-400',
  draft:        'bg-yellow-500/20 text-yellow-400',
  under_review: 'bg-blue-500/20 text-blue-400',
};

export default function SubmissionPage() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    projectName: '',
    description: '',
    techStack: '',
    githubUrl: '',
    demoUrl: '',
    videoUrl: '',
    presentationUrl: '',
  });

  useEffect(() => {
    if (!profile) return;
    getUserTeams(profile.$id).then(async (t) => {
      setTeams(t);
      if (t.length) {
        setActiveTeam(t[0]);
        const sub = await getTeamSubmission(t[0].$id, t[0].eventId);
        if (sub) {
          setSubmission(sub);
          const techArr: string[] = JSON.parse(sub.techStack || '[]');
          setForm({
            projectName: sub.projectName,
            description: sub.description,
            techStack: techArr.join(', '),
            githubUrl: sub.githubUrl,
            demoUrl: sub.demoUrl,
            videoUrl: sub.videoUrl,
            presentationUrl: sub.presentationUrl,
          });
        }
      }
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const handleSaveDraft = async () => {
    if (!activeTeam || !profile || isSaving) return;
    setIsSaving(true);
    try {
      const techStack = form.techStack.split(',').map((s) => s.trim()).filter(Boolean);
      const saved = await upsertSubmission(activeTeam.eventId, activeTeam.$id, profile.$id, {
        projectName: form.projectName,
        description: form.description,
        techStack,
        githubUrl: form.githubUrl,
        demoUrl: form.demoUrl,
        videoUrl: form.videoUrl,
        presentationUrl: form.presentationUrl,
      });
      setSubmission(saved);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!submission) {
      // auto-save first
      await handleSaveDraft();
    }
    if (!submission) return;
    setUploadingFile(true);
    try {
      await uploadSubmissionFile(submission.$id, file);
      const updated = await getTeamSubmission(activeTeam!.$id, activeTeam!.eventId);
      if (updated) setSubmission(updated);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!submission) return;
    await removeSubmissionFile(submission.$id, fileId);
    const updated = await getTeamSubmission(activeTeam!.$id, activeTeam!.eventId);
    if (updated) setSubmission(updated);
  };

  const handleFinalSubmit = async () => {
    if (!submission || !profile) return;
    setIsSubmitting(true);
    try {
      const final = await finalizeSubmission(submission.$id, profile.$id);
      setSubmission(final);
      setShowDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const isDraft = !submission || submission.status === 'draft';
  const fileIds: string[] = submission ? JSON.parse(submission.fileIds || '[]') : [];

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  if (!activeTeam) return (
    <div className="min-h-screen py-16 flex items-center justify-center">
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
        <p className="text-cyber-gray">Join a team first to submit a project</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Project Submission</h1>
            <p className="text-cyber-gray">Team: <span className="text-cyber-cyan">{activeTeam.name}</span></p>
          </div>
          {submission && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[submission.status]}`}>
              {submission.status.replace('_', ' ')}
            </span>
          )}
        </div>

        <div className="cyber-card p-6 space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm text-cyber-gray mb-2">Project Name *</label>
            <input type="text" value={form.projectName}
              onChange={(e) => setForm({ ...form, projectName: e.target.value })}
              placeholder="What's your project called?" className="cyber-input"
              disabled={!isDraft} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-cyber-gray mb-2">Description *</label>
            <textarea value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your project, the problem it solves, and how it works..."
              rows={4} className="cyber-input resize-none" disabled={!isDraft} />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-sm text-cyber-gray mb-2">Tech Stack</label>
            <input type="text" value={form.techStack}
              onChange={(e) => setForm({ ...form, techStack: e.target.value })}
              placeholder="React, Node.js, Python, TensorFlow (comma separated)"
              className="cyber-input" disabled={!isDraft} />
          </div>

          {/* Links */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-cyber-gray mb-2">GitHub Repository</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                <input type="url" value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  placeholder="https://github.com/..." className="cyber-input pl-9" disabled={!isDraft} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Live Demo URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                <input type="url" value={form.demoUrl}
                  onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
                  placeholder="https://..." className="cyber-input pl-9" disabled={!isDraft} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Demo Video URL</label>
              <div className="relative">
                <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                <input type="url" value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  placeholder="YouTube / Loom link" className="cyber-input pl-9" disabled={!isDraft} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Presentation URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                <input type="url" value={form.presentationUrl}
                  onChange={(e) => setForm({ ...form, presentationUrl: e.target.value })}
                  placeholder="Google Slides / Canva link" className="cyber-input pl-9" disabled={!isDraft} />
              </div>
            </div>
          </div>

          {/* File Upload */}
          {isDraft && (
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Upload Files (PDF, ZIP, PPT, up to 100MB)</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-cyber-cyan/30 hover:border-cyber-cyan/50'
                }`}>
                {uploadingFile
                  ? <Loader2 className="w-12 h-12 text-cyber-cyan mx-auto mb-4 animate-spin" />
                  : <Upload className="w-12 h-12 text-cyber-cyan mx-auto mb-4" />}
                <p className="text-white mb-1">Drop files here or click to upload</p>
                <p className="text-cyber-gray text-sm">PDF, PPT, ZIP supported</p>
                <input ref={fileInputRef} type="file" className="hidden" multiple
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
              </div>
            </div>
          )}

          {/* Uploaded Files */}
          {fileIds.length > 0 && (
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Uploaded Files ({fileIds.length})</label>
              <div className="space-y-2">
                {fileIds.map((fileId) => (
                  <div key={fileId}
                    className="flex items-center justify-between p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
                      <div>
                        <a href={getSubmissionFileUrl(fileId)} target="_blank" rel="noopener noreferrer"
                          className="text-white text-sm hover:text-cyber-cyan transition-colors">
                          File {fileId.slice(-8)}
                        </a>
                      </div>
                    </div>
                    {isDraft && (
                      <button onClick={() => handleRemoveFile(fileId)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors">
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Judge Feedback */}
          {submission?.status === 'evaluated' && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                <span className="text-green-400 font-semibold">Judge Feedback</span>
              </div>
              <p className="text-cyber-gray">Check the leaderboard for your scores and judge comments.</p>
            </div>
          )}

          {/* Actions */}
          {isDraft && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleSaveDraft} disabled={isSaving}
                className="flex-1 cyber-button flex items-center justify-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" />
                  : savedOk ? <CheckCircle className="w-4 h-4 text-green-400" /> : null}
                {savedOk ? 'Saved!' : isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button onClick={() => { handleSaveDraft(); setShowDialog(true); }}
                disabled={!form.projectName || !form.description}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                <Send className="w-4 h-4" />Submit Project
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">
                Once submitted, you cannot modify your project. Please review everything before confirming.
              </p>
            </div>
            <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg space-y-2">
              {[
                { label: 'Project', value: form.projectName },
                { label: 'Team', value: activeTeam.name },
                { label: 'Files', value: `${fileIds.length} uploaded` },
                { label: 'GitHub', value: form.githubUrl || 'Not provided' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-cyber-gray">{label}</span>
                  <span className="text-white text-sm truncate max-w-[200px]">{value}</span>
                </div>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Review
              </button>
              <button onClick={handleFinalSubmit} disabled={isSubmitting}
                className="flex-1 cyber-button-primary flex items-center justify-center disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Confirm Submit
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
