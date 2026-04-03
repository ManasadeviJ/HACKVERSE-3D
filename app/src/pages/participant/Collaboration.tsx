import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, MoreVertical, Users, FileText,
  Check, CheckCheck, Smile, FolderOpen, Loader2, Circle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserTeams, getTeamMembers } from '../../services/teamService';
import {
  getTeamMessages, sendMessage, sendFileMessage,
  subscribeToMessages, markMessagesRead,
  getTeamAvailability, setAvailability, subscribeToAvailability
} from '../../services/chatService';
import { getProfileById } from '../../services/authService';
import type { Team, Message, Availability, Profile } from '../../types';

interface EnrichedMember { userId: string; name: string; availability?: Availability }

const statusColor = (s?: string) => {
  if (s === 'online') return 'bg-green-500';
  if (s === 'away') return 'bg-yellow-500';
  if (s === 'busy') return 'bg-red-500';
  return 'bg-gray-500';
};

const msgTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function Collaboration() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [teamMembers, setTeamMembers] = useState<EnrichedMember[]>([]);
  const [availability, setAvailabilityMap] = useState<Record<string, Availability>>({});
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load teams
  useEffect(() => {
    if (!profile) return;
    getUserTeams(profile.$id).then((t) => {
      setTeams(t);
      if (t.length) setActiveTeam(t[0]);
    }).finally(() => setIsLoading(false));
  }, [profile?.$id]);

  // Set self online
  useEffect(() => {
    if (!profile || !activeTeam) return;
    setAvailability(profile.$id, activeTeam.$id, 'online');
    return () => { setAvailability(profile.$id, activeTeam.$id, 'offline'); };
  }, [activeTeam?.$id, profile?.$id]);

  // Load messages + members + availability on team switch
  useEffect(() => {
    if (!activeTeam || !profile) return;
    setMessages([]);
    setTeamMembers([]);

    getTeamMessages(activeTeam.$id).then(setMessages);
    markMessagesRead(activeTeam.$id, profile.$id);

    getTeamMembers(activeTeam.$id).then(async (mems) => {
      const enriched = await Promise.all(
        mems.map(async (m) => {
          const p = await getProfileById(m.userId);
          return { userId: m.userId, name: p.name };
        })
      );
      setTeamMembers(enriched);
    });

    getTeamAvailability(activeTeam.$id).then((avs) => {
      const map: Record<string, Availability> = {};
      avs.forEach((a) => { map[a.userId] = a; });
      setAvailabilityMap(map);
    });
  }, [activeTeam?.$id]);

  // Real-time subscriptions
  useEffect(() => {
    if (!activeTeam || !profile) return;
    const unsubMsg = subscribeToMessages(activeTeam.$id, (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId !== profile.$id) markMessagesRead(activeTeam.$id, profile.$id);
    });
    const unsubAv = subscribeToAvailability(activeTeam.$id, (av) => {
      setAvailabilityMap((prev) => ({ ...prev, [av.userId]: av }));
    });
    return () => { unsubMsg(); unsubAv(); };
  }, [activeTeam?.$id, profile?.$id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !activeTeam || !profile || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(activeTeam.$id, profile.$id, profile.name, newMessage.trim());
      setNewMessage('');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeTeam || !profile) return;
    await sendFileMessage(activeTeam.$id, profile.$id, profile.name, file);
    e.target.value = '';
  };

  const getMsgStatusIcon = (msg: Message) => {
    if (msg.senderId !== profile?.$id) return null;
    if (msg.status === 'read') return <CheckCheck className="w-3 h-3 text-cyber-cyan" />;
    if (msg.status === 'delivered') return <CheckCheck className="w-3 h-3 text-cyber-gray" />;
    return <Check className="w-3 h-3 text-cyber-gray" />;
  };

  const fileMessages = messages.filter((m) => m.type === 'file');
  const onlineCount = Object.values(availability).filter((a) => a.status === 'online').length;

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 text-cyber-cyan animate-spin" />
    </div>
  );

  if (!activeTeam) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-center">
        <Users className="w-12 h-12 text-cyber-gray/30 mx-auto mb-4" />
        <p className="text-cyber-gray">Join or create a team to start collaborating</p>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Sidebar */}
      <div className="w-64 bg-cyber-darker border-r border-cyber-cyan/20 flex flex-col flex-shrink-0">
        {/* Team Header */}
        <div className="p-4 border-b border-cyber-cyan/20">
          {teams.length > 1 ? (
            <select value={activeTeam.$id}
              onChange={(e) => setActiveTeam(teams.find((t) => t.$id === e.target.value) || null)}
              className="w-full bg-transparent text-white font-heading font-semibold text-sm border-none outline-none cursor-pointer">
              {teams.map((t) => <option key={t.$id} value={t.$id}>{t.name}</option>)}
            </select>
          ) : (
            <h2 className="text-lg font-heading font-semibold text-white">{activeTeam.name}</h2>
          )}
          <p className="text-cyber-gray text-xs mt-0.5">{onlineCount} online</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyber-cyan/20">
          {(['chat', 'files'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'text-cyber-cyan border-b-2 border-cyber-cyan' : 'text-cyber-gray hover:text-white'
              }`}>{tab}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'chat' && (
            <div>
              <h3 className="text-xs text-cyber-gray/60 font-mono mb-3 uppercase tracking-wider">Members</h3>
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const av = availability[member.userId];
                  return (
                    <div key={member.userId}
                      className="flex items-center space-x-3 p-2 hover:bg-cyber-cyan/5 rounded-lg">
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center">
                          <span className="text-cyber-dark font-bold text-sm">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-cyber-darker ${statusColor(av?.status)}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm">{member.name}</p>
                        <p className="text-cyber-gray text-xs capitalize">{av?.status || 'offline'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'files' && (
            <div>
              <h3 className="text-xs text-cyber-gray/60 font-mono mb-3 uppercase tracking-wider">Shared Files</h3>
              {fileMessages.length === 0 ? (
                <p className="text-cyber-gray text-sm">No files shared yet</p>
              ) : (
                <div className="space-y-2">
                  {fileMessages.map((msg) => (
                    <div key={msg.$id}
                      className="flex items-center space-x-3 p-2 hover:bg-cyber-cyan/5 rounded-lg cursor-pointer">
                      <div className="w-10 h-10 bg-cyber-cyan/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-cyber-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{msg.fileName}</p>
                        <p className="text-cyber-gray text-xs">{msg.fileSize}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-cyber-dark min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-cyan/20">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5 text-cyber-dark" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Team Chat</h3>
              <p className="text-cyber-gray text-sm">{onlineCount} members online</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === profile?.$id;
            return (
              <div key={msg.$id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <p className="text-cyber-gray text-xs mb-1">{msg.senderName}</p>}
                  <div className={`p-3 rounded-lg ${
                    isMe ? 'bg-cyber-cyan/20 border border-cyber-cyan/30' : 'bg-cyber-cyan/5 border border-cyber-cyan/20'
                  }`}>
                    {msg.type === 'file' ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-cyber-cyan/20 rounded-lg flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-cyber-cyan" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{msg.fileName}</p>
                          <p className="text-cyber-gray text-xs">{msg.fileSize}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className="text-cyber-gray text-xs">{msgTime(msg.$createdAt)}</span>
                    {getMsgStatusIcon(msg)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-cyber-cyan/20">
          <div className="flex items-center space-x-3">
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-cyber-cyan/10 rounded-lg transition-colors flex-shrink-0">
              <Paperclip className="w-5 h-5 text-cyber-gray" />
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <input type="text" value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type a message... (Enter to send)"
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
