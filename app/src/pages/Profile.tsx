import { useState, useRef } from 'react';
import { User, Camera, Save, Lock, Github, Linkedin, Twitter, Globe, MapPin, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { profile, updateProfile, uploadAvatar, getAvatarUrl, changePassword, verifyEmail } = useAuth();

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
    website: profile?.website || '',
    github: profile?.github || '',
    linkedin: profile?.linkedin || '',
    twitter: profile?.twitter || '',
    skills: (typeof profile?.skills === 'string'
      ? JSON.parse(profile.skills || '[]')
      : profile?.skills) as string[],
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwOk, setPwOk] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const avatarUrl = profile.avatarFileId ? getAvatarUrl(profile.avatarFileId) : '';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ ...formData, skills: formData.skills });
      setSaveOk(true);
      setIsEditing(false);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadAvatar(file);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (passwords.new !== passwords.confirm) { setPwError('Passwords do not match'); return; }
    if (passwords.new.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    try {
      await changePassword(passwords.current, passwords.new);
      setPwOk(true);
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => { setPwOk(false); setShowPasswordForm(false); }, 2000);
    } catch (err: any) {
      setPwError(err?.message || 'Password change failed');
    }
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !formData.skills.includes(s)) {
      setFormData({ ...formData, skills: [...formData.skills, s] });
    }
    setNewSkill('');
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-cyber-gray">Manage your account information and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Avatar */}
            <div className="cyber-card p-6 text-center">
              <div className="relative inline-block mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.name}
                    className="w-32 h-32 rounded-full object-cover mx-auto border-2 border-cyber-cyan/30" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center mx-auto">
                    <span className="text-4xl font-bold text-cyber-dark">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <button onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-cyber-cyan rounded-full text-cyber-dark hover:shadow-neon transition-all">
                  <Camera className="w-5 h-5" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <h2 className="text-xl font-heading font-semibold text-white">{profile.name}</h2>
              <p className="text-cyber-cyan capitalize">{profile.role}</p>
              {profile.location && <p className="text-cyber-gray text-sm mt-1 flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</p>}

              {!profile.emailVerification && (
                <button onClick={verifyEmail}
                  className="mt-3 text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-400/30 rounded px-3 py-1">
                  Verify Email
                </button>
              )}
              {profile.emailVerification && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-400">
                  <CheckCircle className="w-3 h-3" /> Email Verified
                </div>
              )}

              <div className="flex justify-center space-x-3 mt-4">
                {profile.github && (
                  <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 bg-cyber-cyan/10 rounded-lg text-cyber-cyan hover:bg-cyber-cyan/20 transition-colors">
                    <Github className="w-5 h-5" />
                  </a>
                )}
                {profile.linkedin && (
                  <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 bg-cyber-cyan/10 rounded-lg text-cyber-cyan hover:bg-cyber-cyan/20 transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {profile.twitter && (
                  <a href={`https://twitter.com/${profile.twitter}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 bg-cyber-cyan/10 rounded-lg text-cyber-cyan hover:bg-cyber-cyan/20 transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-heading font-semibold text-white mb-4">Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Hackathons', value: profile.hackathonsCount },
                  { label: 'Projects', value: profile.projectsCount },
                  { label: 'Wins', value: profile.winsCount, highlight: true },
                  { label: 'Teams', value: profile.teamsCount },
                ].map(({ label, value, highlight }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-cyber-gray">{label}</span>
                    <span className={`font-semibold ${highlight ? 'text-cyber-cyan' : 'text-white'}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-heading font-semibold text-white">Personal Information</h3>
                <button onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                  disabled={isSaving}
                  className="cyber-button flex items-center space-x-2 text-sm disabled:opacity-50">
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                  ) : saveOk ? (
                    <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-green-400">Saved!</span></>
                  ) : isEditing ? (
                    <><Save className="w-4 h-4" /><span>Save</span></>
                  ) : (
                    <><User className="w-4 h-4" /><span>Edit</span></>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Full Name</label>
                    <input type="text" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!isEditing} className="cyber-input" />
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Email</label>
                    <input type="email" value={profile.email} disabled className="cyber-input opacity-60 cursor-not-allowed" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-cyber-gray mb-2">Bio</label>
                  <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!isEditing} rows={3} className="cyber-input resize-none"
                    placeholder="Tell people about yourself..." />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                      <input type="text" value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        disabled={!isEditing} className="cyber-input pl-9" placeholder="City, Country" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-gray/50" />
                      <input type="url" value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        disabled={!isEditing} className="cyber-input pl-9" placeholder="https://your.site" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-heading font-semibold text-white mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 bg-cyber-cyan/20 text-cyber-cyan rounded-full text-sm flex items-center">
                    {skill}
                    {isEditing && (
                      <button onClick={() => setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) })}
                        className="ml-2 hover:text-red-400 leading-none">×</button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <input type="text" value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                    onBlur={addSkill}
                    placeholder="Add skill + Enter" className="cyber-input w-36 text-sm" />
                )}
              </div>
            </div>

            {/* Social Links */}
            <div className="cyber-card p-6">
              <h3 className="text-lg font-heading font-semibold text-white mb-4">Social Links</h3>
              <div className="space-y-4">
                {[
                  { icon: Github, key: 'github', placeholder: 'GitHub username', prefix: '' },
                  { icon: Linkedin, key: 'linkedin', placeholder: 'LinkedIn username', prefix: '' },
                  { icon: Twitter, key: 'twitter', placeholder: 'Twitter handle', prefix: '' },
                ].map(({ icon: Icon, key, placeholder }) => (
                  <div key={key} className="flex items-center space-x-3">
                    <Icon className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
                    <input type="text" value={(formData as any)[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      disabled={!isEditing} placeholder={placeholder} className="cyber-input flex-1" />
                  </div>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="cyber-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-heading font-semibold text-white">Password</h3>
                <button onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="cyber-button text-sm flex items-center space-x-2">
                  <Lock className="w-4 h-4" /><span>Change Password</span>
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
                  {pwOk && <p className="text-green-400 text-sm">Password changed successfully!</p>}
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Current Password</label>
                    <input type="password" value={passwords.current}
                      onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                      className="cyber-input" required />
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">New Password</label>
                    <input type="password" value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="cyber-input" required />
                  </div>
                  <div>
                    <label className="block text-sm text-cyber-gray mb-2">Confirm New Password</label>
                    <input type="password" value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="cyber-input" required />
                  </div>
                  <div className="flex space-x-3">
                    <button type="button" onClick={() => setShowPasswordForm(false)}
                      className="flex-1 py-2 border border-cyber-cyan/30 text-cyber-gray rounded-lg hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 cyber-button-primary">Update Password</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
