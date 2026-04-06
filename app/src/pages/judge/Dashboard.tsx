import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, ChevronRight, Calendar, Trophy,
  TrendingUp, Star, Loader2, Eye, EyeOff, Shield,
  AlertCircle, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listJudgeEvents, getEventBannerUrl } from '../../services/eventService';
import { getEventSubmissions } from '../../services/submissionService';
import { getJudgeEvaluations, toggleEvaluationVisibility } from '../../services/evaluationService';
import { getTeam } from '../../services/teamService';
import type { FullEvent, Submission, Evaluation } from '../../types';

interface EnrichedSub extends Submission {
  teamName: string;
  evaluated: boolean;
  evaluation?: Evaluation;
}

export default function JudgeDashboard() {
  const { profile } = useAuth();

  const [events, setEvents] = useState<FullEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FullEvent | null>(null);
  const [submissions, setSubmissions] = useState<EnrichedSub[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── Load judge's assigned events ──────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    Promise.all([
      listJudgeEvents(profile.$id),
      getJudgeEvaluations(profile.$id),
    ]).then(([evs, evals]) => {
      setEvents(evs);
      setEvaluations(evals);
      if (evs.length) setSelectedEvent(evs[0]);
    }).finally(() => setIsLoadingEvents(false));
  }, [profile?.$id]);

  // ── Load submissions when event changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedEvent || !profile) return;
    setIsLoadingSubmissions(true);
    setSubmissions([]);

    getEventSubmissions(selectedEvent.$id).then(async (subs) => {
      const enriched = await Promise.all(
        subs.map(async (sub) => {
          const team = await getTeam(sub.teamId).catch(() => null);
          const ev = evaluations.find(
            (e) => e.submissionId === sub.$id && e.judgeId === profile.$id
          );
          return {
            ...sub,
            teamName: team?.name || 'Unknown Team',
            evaluated: !!ev,
            evaluation: ev,
          };
        })
      );
      setSubmissions(enriched);
    }).finally(() => setIsLoadingSubmissions(false));
  }, [selectedEvent?.$id, evaluations]);

  // ── Toggle leaderboard visibility ─────────────────────────────────────────
  const handleToggleVisibility = async (evalId: string) => {
    if (!profile) return;
    setTogglingId(evalId);
    try {
      const updated = await toggleEvaluationVisibility(evalId, profile.$id);
      setEvaluations((prev) => prev.map((e) => (e.$id === evalId ? updated : e)));
      setSubmissions((prev) =>
        prev.map((s) =>
          s.evaluation?.$id === evalId ? { ...s, evaluation: updated } : s
        )
      );
    } finally {
      setTogglingId(null);
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const pending = submissions.filter((s) => !s.evaluated).length;
  const done = submissions.filter((s) => s.evaluated).length;
  const avgScore = evaluations.length
    ? Math.round(evaluations.reduce((a, e) => a + e.totalScore, 0) / evaluations.length)
    : 0;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoadingEvents) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  // ── Not assigned to any events ────────────────────────────────────────────
  if (events.length === 0) return (
    <div className="min-h-screen py-16 px-4 flex items-center justify-center">
      <div className="cyber-card p-10 text-center max-w-lg">
        <Shield className="w-16 h-16 text-cyber-gray/30 mx-auto mb-6" />
        <h1 className="text-2xl font-heading font-bold text-white mb-3">
          No Events Assigned Yet
        </h1>
        <p className="text-cyber-gray mb-4">
          You haven't been assigned to judge any hackathon yet.
        </p>
        <div className="p-4 bg-cyber-cyan/5 border border-cyber-cyan/20 rounded-xl mb-6 text-left">
          <p className="text-cyber-cyan font-semibold text-sm mb-2">How to get assigned:</p>
          <ol className="space-y-1 text-cyber-gray text-sm">
            <li className="flex items-start gap-2">
              <span className="text-cyber-cyan font-bold mt-0.5">1.</span>
              An organizer searches for you in <strong className="text-white">Manage Judges</strong>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyber-cyan font-bold mt-0.5">2.</span>
              They click <strong className="text-white">Assign</strong> — you'll receive a notification
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyber-cyan font-bold mt-0.5">3.</span>
              Come back here and your event + submissions will appear
            </li>
          </ol>
        </div>
        <p className="text-cyber-gray/60 text-sm">
          Make sure your profile name is searchable and your role is set to <span className="text-cyber-cyan">Judge</span>.
        </p>
        <Link to="/profile" className="mt-4 cyber-button inline-flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />View My Profile
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">Judge Dashboard</h1>
          <p className="text-cyber-gray">
            You are assigned to judge <span className="text-cyber-cyan font-semibold">{events.length}</span> event{events.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: 'Pending', value: pending, color: 'text-yellow-400' },
            { icon: CheckCircle, label: 'Evaluated', value: done, color: 'text-green-400' },
            { icon: TrendingUp, label: 'Avg Score', value: avgScore || '—', color: 'text-cyber-cyan' },
            { icon: Calendar, label: 'My Events', value: events.length, color: 'text-purple-400' },
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

        <div className="grid lg:grid-cols-4 gap-8">

          {/* ── Left: Event list ──────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="cyber-card p-4">
              <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                My Events
              </h2>
              <div className="space-y-2">
                {events.map((ev) => {
                  const banner = ev.bannerFileId ? getEventBannerUrl(ev.bannerFileId) : null;
                  const isSelected = selectedEvent?.$id === ev.$id;
                  return (
                    <button key={ev.$id}
                      onClick={() => setSelectedEvent(ev)}
                      className={`w-full text-left rounded-lg border overflow-hidden transition-all ${isSelected
                          ? 'border-cyber-cyan shadow-neon'
                          : 'border-cyber-cyan/20 hover:border-cyber-cyan/40'
                        }`}>
                      {banner && (
                        <div className="h-16 overflow-hidden">
                          <img src={banner} alt={ev.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className={`font-medium text-sm truncate ${isSelected ? 'text-cyber-cyan' : 'text-white'}`}>
                          {ev.title}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs capitalize ${ev.status === 'ongoing' ? 'text-green-400' :
                              ev.status === 'published' ? 'text-cyber-cyan' : 'text-cyber-gray'
                            }`}>{ev.status}</span>
                          <span className="text-xs text-cyber-gray">
                            {new Date(ev.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right: Submissions ────────────────────────────────── */}
          <div className="lg:col-span-3">
            {selectedEvent && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-heading font-semibold text-white">
                    Submissions — {selectedEvent.title}
                  </h2>
                  <span className="text-cyber-gray text-sm">
                    {done}/{submissions.length} evaluated
                  </span>
                </div>

                {isLoadingSubmissions ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="cyber-card p-12 text-center">
                    <Trophy className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
                    <p className="text-cyber-gray">No submissions yet for this event.</p>
                    <p className="text-cyber-gray/60 text-sm mt-1">
                      Submissions will appear here once participants submit their projects.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {submissions.map((sub) => (
                      <div key={sub.$id} className="cyber-card p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-start gap-4">
                            {/* Status indicator */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${sub.evaluated ? 'bg-green-500/20' : 'bg-yellow-500/20'
                              }`}>
                              {sub.evaluated
                                ? <CheckCircle className="w-5 h-5 text-green-400" />
                                : <Clock className="w-5 h-5 text-yellow-400" />}
                            </div>

                            <div>
                              <p className="text-white font-semibold">{sub.projectName || 'Untitled Project'}</p>
                              <p className="text-cyber-gray text-sm">Team: <span className="text-white">{sub.teamName}</span></p>
                              <p className="text-cyber-gray/60 text-xs mt-0.5">
                                Submitted {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'recently'}
                              </p>

                              {/* Tech stack */}
                              {sub.techStack && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(() => {
                                    try {
                                      return JSON.parse(sub.techStack).slice(0, 4).map((t: string) => (
                                        <span key={t} className="px-2 py-0.5 bg-cyber-cyan/10 text-cyber-cyan text-xs rounded">
                                          {t}
                                        </span>
                                      ));
                                    } catch { return null; }
                                  })()}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                            {/* Score badge */}
                            {sub.evaluated && sub.evaluation && (
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span className="text-cyber-cyan font-bold text-lg">
                                  {sub.evaluation.totalScore}
                                </span>
                                <span className="text-cyber-gray text-sm">/100</span>
                              </div>
                            )}

                            {/* Visibility toggle */}
                            {sub.evaluated && sub.evaluation && (
                              <button
                                onClick={() => handleToggleVisibility(sub.evaluation!.$id)}
                                disabled={togglingId === sub.evaluation.$id}
                                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${sub.evaluation.isVisible
                                    ? 'border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10'
                                    : 'border-gray-500/30 text-gray-400 hover:bg-gray-500/10'
                                  }`}>
                                {togglingId === sub.evaluation.$id
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : sub.evaluation.isVisible
                                    ? <Eye className="w-3 h-3" />
                                    : <EyeOff className="w-3 h-3" />}
                                {sub.evaluation.isVisible ? 'Visible' : 'Hidden'}
                              </button>
                            )}

                            {/* Evaluate / Edit button */}
                            <Link
                              to={`/judge/evaluation/${sub.$id}`}
                              state={{ submission: sub }}
                              className="flex items-center gap-1.5 cyber-button text-sm px-4 py-2">
                              {sub.evaluated ? 'Edit Score' : 'Evaluate'}
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>

                        {/* Previous feedback preview */}
                        {sub.evaluated && sub.evaluation?.feedback && (
                          <div className="mt-4 pt-4 border-t border-cyber-cyan/10">
                            <p className="text-cyber-gray text-xs mb-1">Your feedback:</p>
                            <p className="text-cyber-gray/80 text-sm line-clamp-2">{sub.evaluation.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
