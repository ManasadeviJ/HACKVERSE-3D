// ─── OAuthCallback.tsx ────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function OAuthCallback() {
  const navigate = useNavigate();
  const { completeOAuth } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    completeOAuth()
      .then(() => navigate('/dashboard'))
      .catch((err) => setError(err?.message || 'OAuth failed'));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
        <div className="cyber-card p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/auth/signin" className="text-cyber-cyan hover:underline">Back to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cyber-dark flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyber-cyan" />
        <p className="text-cyber-gray font-mono text-sm">COMPLETING SIGN IN...</p>
      </div>
    </div>
  );
}

export default OAuthCallback;
