// ─── ResultsManagement.tsx ────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Medal, AlertCircle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { listOrganizerEvents, publishResults } from '../../services/eventService';
import { getLeaderboard } from '../../services/evaluationService';
import type { HackEvent, LeaderboardEntry } from '../../types';

export function ResultsManagement() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedEvent, setPublishedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    listOrganizerEvents(profile.$id).then((evs) => {
      setEvents(evs);
      if (evs.length) setSelectedEvent(evs[0].$id);
    });
  }, [profile?.$id]);

  useEffect(() => {
    if (!selectedEvent) return;
    setIsLoading(true);
    getLeaderboard(selectedEvent, false).then(setEntries).finally(() => setIsLoading(false));
  }, [selectedEvent]);

  const handlePublish = async () => {
    if (!selectedEvent) return;
    setIsPublishing(true);
    try {
      await publishResults(selectedEvent);
      setEvents((prev) => prev.map((ev) => ev.$id === selectedEvent ? { ...ev, resultsPublished: true, status: 'completed' } : ev));
      setPublishedEvent(selectedEvent);
      setShowPublishDialog(false);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentEvent = events.find((e) => e.$id === selectedEvent);
  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-orange-400'];

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/organizer/dashboard" className="flex items-center text-cyber-gray hover:text-cyber-cyan mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Results Management</h1>
            <p className="text-cyber-gray">Review evaluations and publish leaderboard</p>
          </div>
          <div className="flex gap-3 mt-4 sm:mt-0">
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="cyber-input w-48">
              {events.map((ev) => <option key={ev.$id} value={ev.$id}>{ev.title}</option>)}
            </select>
            {currentEvent && !currentEvent.resultsPublished && entries.length > 0 && (
              <button onClick={() => setShowPublishDialog(true)} className="cyber-button-primary flex items-center gap-2">
                <Medal className="w-4 h-4" />Publish Results
              </button>
            )}
          </div>
        </div>

        {currentEvent?.resultsPublished && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400">Results are published and visible on the leaderboard.</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Medal className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No evaluations yet. Judges need to score submissions first.</p>
          </div>
        ) : (
          <div className="cyber-card overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-cyber-cyan/20">
                <tr>
                  {['Rank','Team','Project','Innovation','Execution','Presentation','Impact','Total','Visible'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-cyber-gray text-sm">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.$id} className="border-b border-cyber-cyan/10 hover:bg-cyber-cyan/5">
                    <td className={`px-4 py-3 text-lg font-bold ${rankColors[idx] || 'text-white'}`}>#{entry.rank}</td>
                    <td className="px-4 py-3 text-white font-medium">{entry.teamName}</td>
                    <td className="px-4 py-3 text-cyber-gray text-sm">{entry.projectName}</td>
                    {[entry.innovation, entry.execution, entry.presentation, entry.impact].map((s, i) => (
                      <td key={i} className="px-4 py-3 text-white text-sm">{s}</td>
                    ))}
                    <td className="px-4 py-3 text-cyber-cyan font-bold">{entry.totalScore}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${entry.isVisible ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {entry.isVisible ? 'Yes' : 'Hidden'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">Publish Results?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-yellow-400 text-sm">Results will be public and all participants will be notified. This action cannot be undone.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPublishDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan transition-colors">
                Cancel
              </button>
              <button onClick={handlePublish} disabled={isPublishing}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Medal className="w-4 h-4" />}
                Publish
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResultsManagement;
