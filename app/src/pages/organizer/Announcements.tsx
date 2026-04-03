import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Send, Trash2, Bell, Clock, CheckCircle, Loader2, Pin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { listOrganizerEvents } from '../../services/eventService';
import {
  createAnnouncement, getOrganizerAnnouncements,
  deleteAnnouncement, pinAnnouncement
} from '../../services/announcementService';
import type { HackEvent, Announcement } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  general:   'bg-cyber-cyan/20 text-cyber-cyan',
  urgent:    'bg-red-500/20 text-red-400',
  result:    'bg-yellow-500/20 text-yellow-400',
  schedule:  'bg-blue-500/20 text-blue-400',
};

export default function Announcements() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<HackEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    eventId: '',
    title: '',
    content: '',
    type: 'general' as Announcement['type'],
    targetAudience: 'all' as Announcement['targetAudience'],
    isPinned: false,
  });

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      listOrganizerEvents(profile.$id),
      getOrganizerAnnouncements(profile.$id),
    ]).then(([evs, anns]) => {
      setEvents(evs);
      setAnnouncements(anns);
      if (evs.length) setForm((f) => ({ ...f, eventId: evs[0].$id }));
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  const handleSend = async () => {
    if (!profile || !form.title || !form.content || !form.eventId) return;
    setIsSending(true);
    try {
      const ann = await createAnnouncement(form.eventId, profile.$id, {
        title: form.title,
        content: form.content,
        type: form.type,
        targetAudience: form.targetAudience,
        isPinned: form.isPinned,
      });
      setAnnouncements((prev) => [ann, ...prev]);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setShowDialog(false);
        setForm((f) => ({ ...f, title: '', content: '' }));
      }, 1500);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAnnouncement(id);
    setAnnouncements((prev) => prev.filter((a) => a.$id !== id));
  };

  const handlePin = async (id: string, pinned: boolean) => {
    const updated = await pinAnnouncement(id, !pinned);
    setAnnouncements((prev) => prev.map((a) => a.$id === id ? updated : a));
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/organizer/dashboard" className="flex items-center text-cyber-gray hover:text-cyber-cyan mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" />Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Announcements</h1>
            <p className="text-cyber-gray">Notify your participants and judges</p>
          </div>
          <button onClick={() => setShowDialog(true)}
            className="mt-4 sm:mt-0 cyber-button-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />New Announcement
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" /></div>
        ) : announcements.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Bell className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No announcements yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pinned first */}
            {[...announcements].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)).map((ann) => (
              <div key={ann.$id} className={`cyber-card p-5 ${ann.isPinned ? 'border-cyber-cyan/40' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {ann.isPinned && <Pin className="w-3 h-3 text-cyber-cyan" />}
                      <span className={`px-2 py-0.5 rounded text-xs ${TYPE_COLORS[ann.type]}`}>{ann.type}</span>
                      <span className="text-cyber-gray text-xs capitalize">→ {ann.targetAudience}</span>
                      <span className="text-cyber-gray/60 text-xs">
                        {events.find(e => e.$id === ann.eventId)?.title}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{ann.title}</h3>
                    <p className="text-cyber-gray text-sm line-clamp-2">{ann.content}</p>
                    <p className="text-cyber-gray/50 text-xs mt-2">
                      {new Date(ann.$createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handlePin(ann.$id, ann.isPinned)}
                      className={`p-2 rounded-lg transition-colors ${ann.isPinned ? 'text-cyber-cyan hover:bg-cyber-cyan/10' : 'text-cyber-gray hover:bg-cyber-cyan/10'}`}
                      title={ann.isPinned ? 'Unpin' : 'Pin'}>
                      <Pin className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(ann.$id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-cyber-darker border border-cyber-cyan/30 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold text-white">New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {sent && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <p className="text-green-400 text-sm">Announcement sent!</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Event</label>
                <select value={form.eventId} onChange={(e) => setForm({...form, eventId: e.target.value})} className="cyber-input">
                  {events.map((ev) => <option key={ev.$id} value={ev.$id}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-cyber-gray mb-2">Type</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as any})} className="cyber-input">
                  {['general','urgent','result','schedule'].map((t) => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Send To</label>
              <select value={form.targetAudience} onChange={(e) => setForm({...form, targetAudience: e.target.value as any})} className="cyber-input">
                <option value="all">All (participants + judges)</option>
                <option value="participants">Participants only</option>
                <option value="judges">Judges only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                placeholder="Announcement title" className="cyber-input" />
            </div>
            <div>
              <label className="block text-sm text-cyber-gray mb-2">Message *</label>
              <textarea value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
                placeholder="Write your announcement..." rows={4} className="cyber-input resize-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({...form, isPinned: e.target.checked})}
                className="w-4 h-4 rounded border-cyber-cyan/30 bg-cyber-darker text-cyber-cyan" />
              <span className="text-sm text-cyber-gray">Pin this announcement</span>
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowDialog(false)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Cancel
              </button>
              <button onClick={handleSend} disabled={isSending || !form.title || !form.content}
                className="flex-1 cyber-button-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
