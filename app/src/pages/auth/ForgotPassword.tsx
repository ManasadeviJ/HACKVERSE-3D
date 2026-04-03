import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full">
        <div className="cyber-card p-8 text-center">
          <CheckCircle className="w-16 h-16 text-cyber-cyan mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-cyber-gray mb-6">
            We sent a password reset link to <span className="text-cyber-cyan">{email}</span>
          </p>
          <Link to="/auth/signin" className="text-cyber-cyan hover:underline">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="cyber-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Reset Password</h1>
          <p className="text-cyber-gray">Enter your email to receive a reset link</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-cyber-gray mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="cyber-input pl-12" placeholder="Enter your email" required />
            </div>
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full cyber-button-primary flex items-center justify-center space-x-2 disabled:opacity-50">
            {isLoading
              ? <div className="w-5 h-5 border-2 border-cyber-dark border-t-transparent rounded-full animate-spin" />
              : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="mt-6 text-center text-cyber-gray">
          <Link to="/auth/signin" className="text-cyber-cyan hover:underline">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
