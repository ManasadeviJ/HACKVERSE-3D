import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, Calendar, Trophy, TrendingUp, Star, Loader2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { listJudgeEvents } from '../../services/eventService';
import { getEventSubmissions } from '../../services/submissionService';
import { getJudgeEvaluations, toggleEvaluationVisibility } from '../../services/evaluationService';
import { getTeam } from '../../services/teamService';
import type { HackEvent, Submission, Evaluation } from '../../types';

interface EnrichedSub extends Submission { teamName: string; evaluated: boolean; evaluation?: Evaluation }

export default function JudgeDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [submissions, setSubmissions] = useState<EnrichedSub[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      listJudgeEvents(profile.$id),
      getJudgeEvaluations(profile.$id),
    ]).then(async ([evs, evals]) => {
      setEvents(evs);
      setEvaluations(evals);
      if (evs.length) setSelectedEvent(evs[0].$id);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  useEffect(() => {
    if (!selectedEvent || !profile) return;
    getEventSubmissions(selectedEvent).then(async (subs) => {
      const enriched = await Promise.all(
        subs.map(async (sub) => {
          const team = await getTeam(sub.teamId).catch(() => ({ name: 'Unknown' }));
          const ev = evaluations.find((e) => e.submissionId === sub.$id && e.judgeId === profile.$id);
          return { ...sub, teamName: team.name, evaluated: !!ev, evaluation: ev };
        })
      );
      setSubmissions(enriched);
    });
  }, [selectedEvent, evaluations]);

  const handleToggleVisibility = async (evalId: string) => {
    if (!profile) return;
    const updated = await toggleEvaluationVisibility(evalId, profile.$id);
    setEvaluations((prev) => prev.map((e) => (e.$id === evalId ? updated : e)));
  };

  const pending = submissions.filter((s) => !s.evaluated).length;
  const done = submissions.filter((s) => s.evaluated).length;
  const avgScore = evaluations.length
    ? Math.round(evaluations.reduce((a, e) => a + e.totalScore, 0) / evaluations.length)
    : 0;

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">Judge Dashboard</h1>
          <p className="text-cyber-gray">Review and evaluate hackathon submissions</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Clock, label: 'Pending', value: pending, color: 'text-yellow-400' },
            { icon: CheckCircle, label: 'Evaluated', value: done, color: 'text-green-400' },
            { icon: TrendingUp, label: 'Avg Score', value: avgScore, color: 'text-cyber-cyan' },
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

        {/* Event Selector */}
        {events.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {events.map((ev) => (
              <button key={ev.$id} onClick={() => setSelectedEvent(ev.$id)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedEvent === ev.$id
                    ? 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30'
                    : 'text-cyber-gray hover:text-white border border-cyber-cyan/20'
                }`}>{ev.title}</button>
            ))}
          </div>
        )}

        {/* Submissions List */}
        {events.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Trophy className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">You have not been assigned to any events yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-heading font-semibold text-white">
              Submissions — {events.find(e => e.$id === selectedEvent)?.title}
            </h2>
            {submissions.length === 0 && (
              <div className="cyber-card p-8 text-center">
                <p className="text-cyber-gray">No submissions yet for this event</p>
              </div>
            )}
            {submissions.map((sub) => (
              <div key={sub.$id} className="cyber-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    sub.evaluated ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    {sub.evaluated
                      ? <CheckCircle className="w-5 h-5 text-green-400" />
                      : <Clock className="w-5 h-5 text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{sub.projectName}</p>
                    <p className="text-cyber-gray text-sm">Team: {sub.teamName}</p>
                    <p className="text-cyber-gray text-xs">
                      Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {sub.evaluated && sub.evaluation && (
                    <>
                      <span className="flex items-center gap-1 text-cyber-cyan font-bold">
                        <Star className="w-4 h-4" />{sub.evaluation.totalScore}/100
                      </span>
                      <button
                        onClick={() => handleToggleVisibility(sub.evaluation!.$id)}
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          sub.evaluation.isVisible
                            ? 'border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/10'
                            : 'border-gray-500/30 text-gray-400 hover:bg-gray-500/10'
                        }`}>
                        <Eye className="w-3 h-3" />
                        {sub.evaluation.isVisible ? 'Visible' : 'Hidden'}
                      </button>
                    </>
                  )}
                  <Link
                    to={`/judge/evaluation/${sub.$id}`}
                    state={{ submission: sub }}
                    className="flex items-center gap-1 cyber-button text-sm">
                    {sub.evaluated ? 'Edit' : 'Evaluate'}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
