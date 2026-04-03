import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const userId = params.get('userId') || '';
  const secret = params.get('secret') || '';

  useEffect(() => {
    if (!userId || !secret) {
      setError('Invalid or expired reset link.');
    }
  }, [userId, secret]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError('');
    setIsLoading(true);
    try {
      await resetPassword(userId, secret, password);
      setDone(true);
      setTimeout(() => navigate('/auth/signin'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (done) {
    return (
      <div className="w-full">
        <div className="cyber-card p-8 text-center">
          <CheckCircle className="w-16 h-16 text-cyber-cyan mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Password Reset!</h1>
          <p className="text-cyber-gray">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="cyber-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">New Password</h1>
          <p className="text-cyber-gray">Choose a strong password</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: 'New Password', value: password, setter: setPassword },
            { label: 'Confirm Password', value: confirm, setter: setConfirm },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-sm font-medium text-cyber-gray mb-2">{label}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
                <input type={show ? 'text' : 'password'} value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="cyber-input pl-12 pr-12" placeholder={label} required />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-gray/50 hover:text-cyber-cyan">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={isLoading || !userId}
            className="w-full cyber-button-primary disabled:opacity-50 flex items-center justify-center">
            {isLoading
              ? <div className="w-5 h-5 border-2 border-cyber-dark border-t-transparent rounded-full animate-spin" />
              : 'Reset Password'}
          </button>
        </form>

        <p className="mt-4 text-center">
          <Link to="/auth/signin" className="text-cyber-cyan text-sm hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
