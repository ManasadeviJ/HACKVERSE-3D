import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'participant' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return; }
      if (formData.password.length < 8) { setError('Password must be at least 8 characters'); return; }
      setStep(2);
      return;
    }

    setIsLoading(true);
    try {
      await signUp(formData.name, formData.email, formData.password, formData.role);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('already exists') || msg.includes('conflict')) {
        setError('An account with this email already exists.');
      } else {
        setError(msg || 'Registration failed. Please try again.');
      }
      setStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { value: 'participant' as UserRole, label: 'Participant', description: 'Join hackathons and build projects' },
    { value: 'judge' as UserRole, label: 'Judge', description: 'Evaluate submissions and provide feedback' },
    { value: 'organizer' as UserRole, label: 'Organizer', description: 'Create and manage hackathon events' },
  ];

  return (
    <div className="w-full">
      <div className="cyber-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-heading font-bold text-white mb-2">Create Account</h1>
          <p className="text-cyber-gray">Join the Hackverse community today</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-cyber-cyan text-cyber-dark' : 'bg-cyber-cyan/20 text-cyber-gray'
              }`}>{s}</div>
              {s < 2 && <div className={`w-16 h-px ${step >= 2 ? 'bg-cyber-cyan' : 'bg-cyber-cyan/20'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm font-medium text-cyber-gray mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="cyber-input pl-12" placeholder="Enter your full name" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-cyber-gray mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="cyber-input pl-12" placeholder="Enter your email" required autoComplete="email" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-cyber-gray mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="cyber-input pl-12 pr-12" placeholder="Create a password (8+ chars)" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cyber-gray/50 hover:text-cyber-cyan transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-cyber-gray mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyber-gray/50" />
                  <input type={showPassword ? 'text' : 'password'} value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="cyber-input pl-12" placeholder="Confirm your password" required />
                </div>
              </div>
              <label className="flex items-start space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 mt-0.5 rounded border-cyber-cyan/30 bg-cyber-darker text-cyber-cyan" required />
                <span className="text-sm text-cyber-gray">
                  I agree to the <Link to="/terms" className="text-cyber-cyan hover:underline">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="text-cyber-cyan hover:underline">Privacy Policy</Link>
                </span>
              </label>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-cyber-gray mb-4">Select Your Role</label>
              <div className="space-y-3">
                {roles.map((role) => (
                  <label key={role.value} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    formData.role === role.value ? 'border-cyber-cyan bg-cyber-cyan/10' : 'border-cyber-cyan/30 hover:border-cyber-cyan/50'
                  }`}>
                    <input type="radio" name="role" value={role.value} checked={formData.role === role.value}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-4 h-4 text-cyber-cyan" />
                    <div className="ml-3 flex-1">
                      <p className="text-white font-medium">{role.label}</p>
                      <p className="text-cyber-gray text-sm">{role.description}</p>
                    </div>
                    {formData.role === role.value && <CheckCircle className="w-5 h-5 text-cyber-cyan" />}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            {step === 2 && (
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 py-3 border border-cyber-cyan/30 text-cyber-gray rounded hover:border-cyber-cyan hover:text-cyber-cyan transition-colors">
                Back
              </button>
            )}
            <button type="submit" disabled={isLoading}
              className="flex-1 cyber-button-primary flex items-center justify-center space-x-2 disabled:opacity-50">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-cyber-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <><span>{step === 1 ? 'Continue' : 'Create Account'}</span><ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-cyber-gray">
          Already have an account?{' '}
          <Link to="/auth/signin" className="text-cyber-cyan hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
