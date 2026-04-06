import { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Users, FileText,
  Check, CheckCheck, FolderOpen, Loader2,
  Wifi, WifiOff, Coffee, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserTeams, getTeamMembers } from '../../services/teamService';
import { getProfileById } from '../../services/authService';
import { databases, realtime, storage, DB_ID, COLLECTIONS, BUCKETS } from '../../lib/appwrite';
import { ID, Query } from 'appwrite';
import type { Team, Message, Availability } from '../../types';

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  online: 'bg-green-500', away: 'bg-yellow-400',
  busy: 'bg-red-500', offline: 'bg-gray-500',
};
const STATUS_LABEL: Record<string, string> = {
  online: 'Online', away: 'Away', busy: 'Busy', offline: 'Offline',
};

// ─── Direct Appwrite calls (avoids stale imports) ─────────────────────────────
async function fetchMessages(teamId: string): Promise<Message[]> {
  const res = await databases.listDocuments<Message>(DB_ID, COLLECTIONS.MESSAGES, [
    Query.equal('teamId', teamId),
    Query.orderAsc('$createdAt'),
    Query.limit(100),
  ]);
  return res.documents;
}

async function postMessage(
  teamId: string, senderId: string, senderName: string, content: string
): Promise<Message> {
  return databases.createDocument<Message>(DB_ID, COLLECTIONS.MESSAGES, ID.unique(), {
    teamId, senderId, senderName, content,
    type: 'text', fileName: '', fileId: '', fileSize: '', status: 'sent',
  });
}

async function postFileMessage(
  teamId: string, senderId: string, senderName: string, file: File
): Promise<Message> {
  const uploaded = await storage.createFile(BUCKETS.SUBMISSIONS, ID.unique(), file);
  return databases.createDocument<Message>(DB_ID, COLLECTIONS.MESSAGES, ID.unique(), {
    teamId, senderId, senderName, content: '',
    type: 'file',
    fileName: file.name,
    fileId: uploaded.$id,
    fileSize: `${(uploaded.sizeOriginal / 1024).toFixed(0)} KB`,
    status: 'sent',
  });
}

async function fetchAvailability(teamId: string): Promise<Availability[]> {
  const res = await databases.listDocuments<Availability>(DB_ID, COLLECTIONS.AVAILABILITY, [
    Query.equal('teamId', teamId), Query.limit(30),
  ]);
  return res.documents;
}

async function upsertAvailability(
  userId: string, teamId: string, status: string
): Promise<void> {
  const existing = await databases.listDocuments<Availability>(DB_ID, COLLECTIONS.AVAILABILITY, [
    Query.equal('userId', userId), Query.equal('teamId', teamId), Query.limit(1),
  ]);
  const payload = { userId, teamId, status, lastSeen: new Date().toISOString(), customMessage: '' };
  if (existing.documents.length) {
    await databases.updateDocument(DB_ID, COLLECTIONS.AVAILABILITY, existing.documents[0].$id, payload);
  } else {
    await databases.createDocument(DB_ID, COLLECTIONS.AVAILABILITY, ID.unique(), payload);
  }
}

function getFileUrl(fileId: string): string {
  return storage.getFileView(BUCKETS.SUBMISSIONS, fileId).toString();
}

const msgTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface MemberRow { userId: string; name: string }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Collaboration() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [avMap, setAvMap] = useState<Record<string, Availability>>({});
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [myStatus, setMyStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<(() => void) | null>(null);   // store unsub
  const avRealtimeRef = useRef<(() => void) | null>(null);

  // ── Load teams ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    getUserTeams(profile.$id).then((t) => {
      setTeams(t);
      if (t.length) setActiveTeam(t[0]);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  // ── When team switches: load data + subscribe ─────────────────────────────
  useEffect(() => {
    if (!activeTeam || !profile) return;

    // Cleanup old subs
    if (realtimeRef.current) { try { realtimeRef.current(); } catch { } realtimeRef.current = null; }
    if (avRealtimeRef.current) { try { avRealtimeRef.current(); } catch { } avRealtimeRef.current = null; }
    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }

    setMessages([]);
    setMembers([]);
    setAvMap({});

    // Load messages
    fetchMessages(activeTeam.$id).then(setMessages);

    // Load members
    getTeamMembers(activeTeam.$id).then(async (mems) => {
      const rows = await Promise.all(
        mems.map(async (m) => {
          const p = await getProfileById(m.userId);
          return { userId: m.userId, name: p.name };
        })
      );
      setMembers(rows);
    });

    // Load availability
    fetchAvailability(activeTeam.$id).then((avs) => {
      const map: Record<string, Availability> = {};
      avs.forEach((a) => { map[a.userId] = a; });
      setAvMap(map);
    });

    // Set self online
    upsertAvailability(profile.$id, activeTeam.$id, 'online').catch(() => { });

    // Heartbeat every 25s
    heartbeatRef.current = setInterval(() => {
      upsertAvailability(profile.$id, activeTeam.$id, myStatus).catch(() => { });
    }, 25_000);

    // ── Realtime: messages ───────────────────────────────────────────
    // FIX: Use the raw `realtime.subscribe` return value directly.
    // We store it and call it on cleanup. This fixes "not a function" issue
    // because we never pass it through useState (which can serialize).
    try {
      const unsub = realtime.subscribe(
        `databases.${DB_ID}.collections.${COLLECTIONS.MESSAGES}.documents`,
        (response) => {
          if (!response.events.some(e => e.includes('.create'))) return;
          const msg = response.payload as Message;
          if (msg.teamId !== activeTeam.$id) return;
          // Add message without requiring a refresh
          setMessages((prev) => {
            if (prev.find((m) => m.$id === msg.$id)) return prev;  // dedup
            return [...prev, msg];
          });
        }
      );
      if (typeof unsub === 'function') realtimeRef.current = unsub;
    } catch { /* realtime optional */ }

    // ── Realtime: availability ───────────────────────────────────────
    try {
      const unsubAv = realtime.subscribe(
        `databases.${DB_ID}.collections.${COLLECTIONS.AVAILABILITY}.documents`,
        (response) => {
          const av = response.payload as Availability;
          if (av.teamId !== activeTeam.$id) return;
          setAvMap((prev) => ({ ...prev, [av.userId]: av }));
        }
      );
      if (typeof unsubAv === 'function') avRealtimeRef.current = unsubAv;
    } catch { /* optional */ }

    // ── Tab visibility → presence ────────────────────────────────────
    const onVisibility = () => {
      const s = document.hidden ? 'away' : 'online';
      setMyStatus(s);
      upsertAvailability(profile.$id, activeTeam.$id, s).catch(() => { });
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (realtimeRef.current) { try { realtimeRef.current(); } catch { } realtimeRef.current = null; }
      if (avRealtimeRef.current) { try { avRealtimeRef.current(); } catch { } avRealtimeRef.current = null; }
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      // Set offline on leave
      upsertAvailability(profile.$id, activeTeam.$id, 'offline').catch(() => { });
    };
  }, [activeTeam?.$id, profile?.$id]);

  // ── Auto-scroll on new messages ───────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Send text ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || !activeTeam || !profile || isSending) return;
    const content = newMessage.trim();
    setNewMessage('');           // clear immediately for snappy UX
    setIsSending(true);
    try {
      await postMessage(activeTeam.$id, profile.$id, profile.name, content);
      // Realtime will add the message; no need to setMessages manually
    } finally {
      setIsSending(false);
    }
  };

  // ── Send file ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    if (!activeTeam || !profile) return;
    setUploadingFile(true);
    try {
      await postFileMessage(activeTeam.$id, profile.$id, profile.name, file);
    } catch (e) { console.error('File send error:', e); }
    finally { setUploadingFile(false); }
  };

  const msgStatusIcon = (msg: Message) => {
    if (msg.senderId !== profile?.$id) return null;
    if (msg.status === 'read') return <CheckCheck className="w-3 h-3 text-cyber-cyan" />;
    if (msg.status === 'delivered') return <CheckCheck className="w-3 h-3 text-cyber-gray" />;
    return <Check className="w-3 h-3 text-cyber-gray" />;
  };

  const fileMessages = messages.filter((m) => m.type === 'file');
  const onlineCount = Object.values(avMap).filter((a) => a.status === 'online').length;

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );
  if (!activeTeam) return (
    <div className="flex justify-center items-center h-64 px-4">
      <div className="text-center">
        <Users className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
        <p className="text-cyber-gray">Join or create a team first.</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div className="w-64 bg-cyber-darker border-r border-cyber-cyan/20 flex flex-col flex-shrink-0">
        {/* Team picker (per-event teams) */}
        <div className="p-4 border-b border-cyber-cyan/20">
          {teams.length > 1 ? (
            <select value={activeTeam.$id}
              onChange={(e) => setActiveTeam(teams.find((t) => t.$id === e.target.value) || null)}
              className="w-full bg-transparent text-white font-heading font-semibold text-sm border-none outline-none cursor-pointer">
              {teams.map((t) => <option key={t.$id} value={t.$id}>{t.name}</option>)}
            </select>
          ) : (
            <h2 className="text-lg font-heading font-semibold text-white truncate">{activeTeam.name}</h2>
          )}
          <p className="text-cyber-gray text-xs mt-0.5">{onlineCount} online · team chat</p>
        </div>

        {/* My status */}
        <div className="px-4 py-3 border-b border-cyber-cyan/10">
          <p className="text-cyber-gray/60 text-xs mb-2 uppercase tracking-wider">My Status</p>
          <div className="flex gap-2 flex-wrap">
            {(['online', 'away', 'busy', 'offline'] as const).map((s) => (
              <button key={s} onClick={() => {
                setMyStatus(s);
                if (profile && activeTeam) upsertAvailability(profile.$id, activeTeam.$id, s).catch(() => { });
              }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${myStatus === s ? 'border-cyber-cyan/50 bg-cyber-cyan/10 text-white' : 'border-cyber-cyan/10 text-cyber-gray hover:border-cyber-cyan/30'
                  }`}>
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyber-cyan/20">
          {(['chat', 'files'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-cyber-gray hover:text-white'
                }`}>{tab}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' && (
            <div>
              <p className="text-xs text-cyber-gray/60 uppercase tracking-wider mb-3">Team Members</p>
              <div className="space-y-2">
                {members.map((m) => {
                  const av = avMap[m.userId];
                  const skey = av?.status || 'offline';
                  const isMe = m.userId === profile?.$id;
                  return (
                    <div key={m.userId} className="flex items-center gap-3 p-2 hover:bg-cyber-cyan/5 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center">
                          <span className="text-cyber-dark font-bold text-sm">{m.name.charAt(0).toUpperCase()}</span>
                        </div>
                        {skey === 'online' ? (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-50" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-cyber-darker bg-green-500" />
                          </span>
                        ) : (
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-cyber-darker ${STATUS_DOT[skey]}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {m.name}{isMe && <span className="text-cyber-gray text-xs ml-1">(you)</span>}
                        </p>
                        <p className="text-cyber-gray text-xs capitalize">{skey}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div>
              <p className="text-xs text-cyber-gray/60 uppercase tracking-wider mb-3">Shared Files</p>
              {fileMessages.length === 0
                ? <p className="text-cyber-gray text-sm">No files shared yet</p>
                : fileMessages.map((msg) => (
                  <a key={msg.$id} href={msg.fileId ? getFileUrl(msg.fileId) : '#'}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 hover:bg-cyber-cyan/5 rounded-lg cursor-pointer mb-2">
                    <div className="w-9 h-9 bg-cyber-cyan/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-cyber-cyan" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{msg.fileName || 'File'}</p>
                      <p className="text-cyber-gray text-xs">{msg.fileSize} · click to open</p>
                    </div>
                  </a>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-cyber-dark min-w-0">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-cyber-cyan/20">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-cyber-dark" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{activeTeam.name} — Team Chat</h3>
            <p className="text-cyber-gray text-sm">{onlineCount} of {members.length} online</p>
          </div>
        </div>

        {/* Messages — no refresh needed, realtime pushes directly */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === profile?.$id;
            return (
              <div key={msg.$id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <p className="text-cyber-gray text-xs mb-1">{msg.senderName}</p>}
                  <div className={`p-3 rounded-lg ${isMe ? 'bg-cyber-cyan/20 border border-cyber-cyan/30' : 'bg-cyber-cyan/5 border border-cyber-cyan/20'
                    }`}>
                    {msg.type === 'file' ? (
                      <a href={msg.fileId ? getFileUrl(msg.fileId) : '#'}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 bg-cyber-cyan/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-5 h-5 text-cyber-cyan" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{msg.fileName || 'File'}</p>
                          <p className="text-cyber-gray text-xs">{msg.fileSize} · Click to open</p>
                        </div>
                      </a>
                    ) : (
                      <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-cyber-gray text-xs">{msgTime(msg.$createdAt)}</span>
                    {msgStatusIcon(msg)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-cyber-cyan/20">
          {uploadingFile && (
            <div className="flex items-center gap-2 mb-2 text-cyber-gray text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />Uploading…
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
              className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50">
              <Paperclip className="w-5 h-5 text-cyber-gray" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
            <input type="text" value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message… (Enter to send)"
              className="flex-1 cyber-input" />
            <button onClick={handleSend} disabled={isSending || !newMessage.trim()}
              className="p-3 bg-cyber-cyan text-cyber-dark rounded-lg hover:shadow-neon transition-all disabled:opacity-50 flex-shrink-0">
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
