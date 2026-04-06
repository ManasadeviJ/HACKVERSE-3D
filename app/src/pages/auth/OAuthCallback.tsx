import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

const ROLES = [
  { value: 'participant' as UserRole, label: 'Participant', desc: 'Join hackathons and build amazing projects' },
  { value: 'judge' as UserRole, label: 'Judge', desc: 'Evaluate submissions and provide feedback' },
  { value: 'organizer' as UserRole, label: 'Organizer', desc: 'Create and manage hackathon events' },
];

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();

  const [phase, setPhase] = useState<'checking' | 'pick-role' | 'creating' | 'done' | 'error'>('checking');
  const [selectedRole, setRole] = useState<UserRole>('participant');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // ── Try to complete OAuth on mount ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const tryComplete = async () => {
      try {
        // handleOAuthCallback already retries internally (3×500ms backoff)
        await completeOAuth('participant');
        if (!cancelled) {
          setPhase('done');
          navigate('/dashboard', { replace: true });
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg: string = err?.message || '';

        // "missing scopes" = session not yet ready (happens on first OAuth attempt)
        // "guest" = same thing
        // "document_not_found" = new user, need role
        const isNewUser =
          msg.includes('document_not_found') ||
          msg.includes('Document with the requested ID could not be found');

        const isSessionPending =
          msg.includes('missing scopes') ||
          msg.includes('guests') ||
          msg.includes('Guest session');

        if (isNewUser) {
          // Genuinely new user — show role picker
          setPhase('pick-role');
        } else if (isSessionPending && attempt < 2) {
          // Session still being established — wait 1.5s and retry
          setTimeout(() => {
            if (!cancelled) setAttempt((a) => a + 1);
          }, 1500);
        } else {
          // Exceeded retries or unknown error
          setError(
            isSessionPending
              ? 'Sign-in timed out. The OAuth session took too long. Please try again.'
              : msg || 'OAuth sign-in failed. Please try again.'
          );
          setPhase('error');
        }
      }
    };

    if (phase === 'checking') tryComplete();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ── Confirm role (new OAuth user) ─────────────────────────────────────────
  const handleRoleConfirm = async () => {
    setPhase('creating');
    try {
      await completeOAuth(selectedRole);
      setPhase('done');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to create account. Please try again.');
      setPhase('error');
    }
  };

  // ── Retry (error state) ───────────────────────────────────────────────────
  const handleRetry = () => {
    setError('');
    setAttempt(0);
    setPhase('checking');
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'checking' || phase === 'done') return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-cyber-cyan animate-spin" />
        <p className="text-cyber-gray font-mono text-sm">
          {attempt > 0 ? `ESTABLISHING SESSION… (attempt ${attempt + 1}/3)` : 'COMPLETING SIGN IN…'}
        </p>
        {attempt > 0 && (
          <p className="text-cyber-gray/60 text-xs max-w-xs text-center">
            OAuth sessions can take a moment to activate. Hang tight…
          </p>
        )}
      </div>
    </div>
  );

  if (phase === 'creating') return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-cyber-cyan animate-spin" />
        <p className="text-cyber-gray font-mono text-sm">SETTING UP YOUR ACCOUNT…</p>
      </div>
    </div>
  );

  if (phase === 'error') return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center px-4">
      <div className="cyber-card p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-2xl">!</span>
        </div>
        <p className="text-red-400 font-semibold mb-2">Sign-in failed</p>
        <p className="text-cyber-gray text-sm mb-6">{error}</p>
        <div className="flex gap-3">
          <button onClick={handleRetry}
            className="flex-1 cyber-button flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" />Try Again
          </button>
          <a href="/auth/signin" className="flex-1 cyber-button-primary text-center py-3 block">
            Back to Sign In
          </a>
        </div>
      </div>
    </div>
  );

  // ── Role picker (new OAuth user) ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center px-4">
      <div className="cyber-card p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <CheckCircle className="w-12 h-12 text-cyber-cyan mx-auto mb-3" />
          <h1 className="text-2xl font-heading font-bold text-white mb-1">One Last Step</h1>
          <p className="text-cyber-gray text-sm">Choose your role to complete sign-up</p>
        </div>

        <div className="space-y-3 mb-8">
          {ROLES.map((r) => (
            <label key={r.value}
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === r.value
                  ? 'border-cyber-cyan bg-cyber-cyan/10'
                  : 'border-cyber-cyan/30 hover:border-cyber-cyan/50'
                }`}>
              <input type="radio" name="role" value={r.value}
                checked={selectedRole === r.value}
                onChange={() => setRole(r.value)}
                className="w-4 h-4 text-cyber-cyan" />
              <div className="ml-3 flex-1">
                <p className="text-white font-medium">{r.label}</p>
                <p className="text-cyber-gray text-sm">{r.desc}</p>
              </div>
              {selectedRole === r.value && (
                <CheckCircle className="w-5 h-5 text-cyber-cyan flex-shrink-0" />
              )}
            </label>
          ))}
        </div>

        <button onClick={handleRoleConfirm}
          className="w-full cyber-button-primary text-base py-3">
          Continue as {ROLES.find((r) => r.value === selectedRole)?.label}
        </button>
      </div>
    </div>
  );
}
