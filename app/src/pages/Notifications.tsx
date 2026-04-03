import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Calendar, MessageSquare, Trophy, AlertCircle, Info, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';
import type { Notification } from '../types';

const typeConfig: Record<Notification['type'], { icon: typeof Bell; color: string; bg: string }> = {
  invite:       { icon: MessageSquare, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  submission:   { icon: Calendar,      color: 'text-cyber-cyan', bg: 'bg-cyber-cyan/10' },
  result:       { icon: Trophy,        color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  announcement: { icon: AlertCircle,   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  system:       { icon: Info,          color: 'text-cyber-gray', bg: 'bg-white/5' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  const { profile, setUnreadCount } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!profile) return;
    getUserNotifications(profile.$id)
      .then((data) => {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.isRead).length);
      })
      .finally(() => setIsLoading(false));
  }, [profile]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.$id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    if (!profile) return;
    await markAllNotificationsRead(profile.$id);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Notifications</h1>
            <p className="text-cyber-gray">{unread} unread notification{unread !== 1 ? 's' : ''}</p>
          </div>
          {unread > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center space-x-2 text-sm text-cyber-cyan hover:text-white transition-colors">
              <CheckCheck className="w-4 h-4" /><span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-2 mb-6">
          {(['all', 'unread'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-cyber-gray hover:text-white'
              }`}>
              {f === 'all' ? 'All' : 'Unread'}{f === 'unread' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyber-cyan" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Bell className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
            <p className="text-cyber-gray">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.system;
              const Icon = cfg.icon;
              return (
                <div key={n.$id}
                  className={`cyber-card p-4 flex items-start space-x-4 transition-all ${
                    !n.isRead ? 'border-cyber-cyan/30 bg-cyber-cyan/5' : ''
                  }`}>
                  <div className={`p-2 rounded-lg ${cfg.bg} flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${!n.isRead ? 'text-white' : 'text-cyber-gray'}`}>{n.title}</p>
                    <p className="text-cyber-gray text-sm mt-0.5">{n.body}</p>
                    <p className="text-cyber-gray/60 text-xs mt-1">{timeAgo(n.$createdAt)}</p>
                  </div>
                  {!n.isRead && (
                    <button onClick={() => handleMarkRead(n.$id)}
                      className="p-2 text-cyber-gray hover:text-cyber-cyan transition-colors flex-shrink-0"
                      title="Mark as read">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {n.isRead && <div className="w-2 h-2 rounded-full bg-cyber-gray/20 flex-shrink-0 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
