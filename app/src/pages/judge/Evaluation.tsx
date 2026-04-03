import { useState, useEffect } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Github, Globe, FileText, CheckCircle, Loader2, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { submitEvaluation, getEvaluationByJudge } from '../../services/evaluationService';
import { getSubmissionFileUrl } from '../../services/submissionService';
import type { Submission, Evaluation } from '../../types';

const CRITERIA = [
  { key: 'innovation', label: 'Innovation', description: 'Originality and creativity of the solution' },
  { key: 'execution', label: 'Execution', description: 'Technical implementation and code quality' },
  { key: 'presentation', label: 'Presentation', description: 'Clarity of demo and documentation' },
  { key: 'impact', label: 'Impact', description: 'Potential real-world impact and usefulness' },
] as const;

type ScoreKey = typeof CRITERIA[number]['key'];

export default function Evaluation() {
  const { submissionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const submission: Submission = location.state?.submission;
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    innovation: 0, execution: 0, presentation: 0, impact: 0,
  });
  const [feedback, setFeedback] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEval, setExistingEval] = useState<Evaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile || !submission) { setIsLoading(false); return; }
    getEvaluationByJudge(submission.$id, profile.$id).then((ev) => {
      if (ev) {
        setExistingEval(ev);
        setScores({ innovation: ev.innovation, execution: ev.execution, presentation: ev.presentation, impact: ev.impact });
        setFeedback(ev.feedback);
      }
    }).finally(() => setIsLoading(false));
  }, [profile?.$id, submission?.$id]);

  const totalScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4);

  const handleSubmitEval = async () => {
    if (!profile || !submission) return;
    setIsSubmitting(true);
    try {
      await submitEvaluation(
        profile.$id, submission.$id, submission.eventId, submission.teamId, scores, feedback
      );
      setShowDialog(false);
      navigate('/judge/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const techStack: string[] = (() => {
    try { return JSON.parse(submission?.techStack || '[]'); } catch { return []; }
  })();
  const fileIds: string[] = (() => {
    try { return JSON.parse(submission?.fileIds || '[]'); } catch { return []; }
  })();

  if (!submission) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-cyber-gray mb-4">No submission data. Go back to the dashboard.</p>
        <Link to="/judge/dashboard" className="cyber-button">Back to Dashboard</Link>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/judge/dashboard" className="flex items-center text-cyber-gray hover:text-cyber-cyan mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />Back to Dashboard
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Submission Details */}
          <div className="space-y-6">
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-heading font-bold text-white">{submission.projectName}</h1>
                  <p className="text-cyber-cyan text-sm">Team: {(submission as any).teamName || submission.teamId}</p>
                </div>
                {existingEval && (
                  <div className="text-center">
                    <p className="text-cyber-cyan font-bold text-2xl">{existingEval.totalScore}</p>
                    <p className="text-cyber-gray text-xs">Previous Score</p>
                  </div>
                )}
              </div>
              <p className="text-cyber-gray leading-relaxed">{submission.description}</p>

              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {techStack.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-cyber-cyan/20 text-cyber-cyan text-xs rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="cyber-card p-6 space-y-3">
              <h3 className="text-lg font-heading font-semibold text-white mb-2">Links</h3>
              {submission.githubUrl && (
                <a href={submission.githubUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                  <Github className="w-5 h-5 text-cyber-cyan" />
                  <span className="text-white text-sm">GitHub Repository</span>
                </a>
              )}
              {submission.demoUrl && (
                <a href={submission.demoUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                  <Globe className="w-5 h-5 text-cyber-cyan" />
                  <span className="text-white text-sm">Live Demo</span>
                </a>
              )}
              {fileIds.length > 0 && fileIds.map((fid) => (
                <a key={fid} href={getSubmissionFileUrl(fid)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg hover:border-cyber-cyan transition-colors">
                  <FileText className="w-5 h-5 text-cyber-cyan" />
                  <span className="text-white text-sm">File {fid.slice(-8)}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Right: Scoring */}
          <div className="space-y-6">
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-heading font-semibold text-white">Evaluation</h2>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${totalScore >= 80 ? 'text-green-400' : totalScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {totalScore}
                  </div>
                  <div className="text-cyber-gray text-xs">/ 100</div>
                </div>
              </div>

              <div className="space-y-6">
                {CRITERIA.map(({ key, label, description }) => (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <label className="text-white font-medium text-sm">{label}</label>
                        <p className="text-cyber-gray text-xs">{description}</p>
                      </div>
                      <span className="text-cyber-cyan font-bold w-8 text-right">{scores[key]}</span>
                    </div>
                    <input type="range" min={0} max={100} step={1}
                      value={scores[key]}
                      onChange={(e) => setScores({ ...scores, [key]: Number(e.target.value) })}
                      className="w-full h-2 appearance-none bg-cyber-cyan/20 rounded-full outline-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyber-cyan" />
                    <div className="flex justify-between text-xs text-cyber-gray/50 mt-1">
                      <span>0</span><span>50</span><span>100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div className="cyber-card p-6">
              <label className="block text-white font-medium mb-2">Judge Feedback *</label>
              <p className="text-cyber-gray text-sm mb-3">Provide constructive feedback for the team</p>
              <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the strengths, weaknesses, and suggestions for improvement..."
                rows={5} className="cyber-input resize-none" />
            </div>

            <button
              onClick={() => setShowDialog(true)}
              disabled={!feedback.trim() || Object.values(scores).every((s) => s === 0)}
              className="w-full cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {existingEval ? 'Update Evaluation' : 'Submit Evaluation'}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Confirm Evaluation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-lg space-y-2">
              {CRITERIA.map(({ key, label }) => (
                <div key={key} className="flex justify-between">
                  <span className="text-cyber-gray">{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-1.5 bg-cyber-cyan/20 rounded-full">
                      <div className="h-1.5 bg-cyber-cyan rounded-full" style={{ width: `${scores[key]}%` }} />
                    </div>
                    <span className="text-cyber-cyan font-bold w-8 text-right">{scores[key]}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-cyber-cyan/20 pt-2 mt-2">
                <span className="text-white font-semibold">Total Score</span>
                <span className="text-cyber-cyan font-bold text-lg">{totalScore}/100</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Review
              </button>
              <button onClick={handleSubmitEval} disabled={isSubmitting}
                className="flex-1 cyber-button-primary flex items-center justify-center disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Confirm
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
