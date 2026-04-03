import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  User, Bell, HelpCircle, LogOut, Menu, X, ChevronDown,
  LayoutDashboard, Calendar, Users, Trophy, MessageSquare,
  Megaphone, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MainLayout() {
  const { profile, isAuthenticated, signOut, getAvatarUrl, unreadCount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navLinks = (() => {
    if (!profile) return [
      { path: '/events', label: 'Events', icon: Calendar },
      { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ];
    switch (profile.role) {
      case 'participant': return [
        { path: '/participant/my-events', label: 'My Events', icon: Calendar },
        { path: '/events', label: 'Browse Events', icon: LayoutDashboard },
        { path: '/participant/team', label: 'My Team', icon: Users },
        { path: '/invite', label: 'Invite', icon: MessageSquare },
        { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
        { path: '/town', label: '3D Town', icon: Zap },
      ];
      case 'judge': return [
        { path: '/judge/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/judge/evaluation', label: 'Evaluate', icon: Trophy },
        { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      ];
      case 'organizer': return [
        { path: '/organizer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/organizer/create-event', label: 'Create Event', icon: Calendar },
        { path: '/organizer/manage-teams', label: 'Teams', icon: Users },
        { path: '/organizer/results', label: 'Results', icon: Trophy },
        { path: '/organizer/announcements', label: 'Announce', icon: Megaphone },
      ];
      default: return [];
    }
  })();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const avatarUrl = profile?.avatarFileId ? getAvatarUrl(profile.avatarFileId) : '';

  return (
    <div className="min-h-screen bg-cyber-dark">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-cyber-darker/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-cyber-cyan rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyber-dark" />
              </div>
              <span className="text-white font-heading font-bold text-xl">Hackverse</span>
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map(({ path, label, icon: Icon }) => (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(path)
                      ? 'bg-cyber-cyan/20 text-cyber-cyan'
                      : 'text-cyber-gray hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            {/* Right: Auth controls */}
            <div className="flex items-center space-x-2">
              {isAuthenticated && profile ? (
                <>
                  {/* Notifications Bell */}
                  <Link
                    to="/notifications"
                    className="relative p-2 text-cyber-gray hover:text-cyber-cyan transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                      className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={profile.name} className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyber-cyan to-blue-600 flex items-center justify-center text-xs font-bold text-cyber-dark">
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="hidden md:block text-sm text-white font-medium max-w-[100px] truncate">
                        {profile.name}
                      </span>
                      <ChevronDown className="w-4 h-4 text-cyber-gray" />
                    </button>

                    {isProfileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-cyber-darker border border-cyber-cyan/20 rounded-xl shadow-xl py-1 z-50">
                        <div className="px-3 py-2 border-b border-cyber-cyan/10">
                          <p className="text-white text-sm font-medium truncate">{profile.name}</p>
                          <p className="text-cyber-gray text-xs capitalize">{profile.role}</p>
                        </div>
                        <Link
                          to="/profile"
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-cyber-gray hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <User className="w-4 h-4" /> <span>Profile</span>
                        </Link>
                        <Link
                          to="/help"
                          className="flex items-center space-x-2 px-3 py-2 text-sm text-cyber-gray hover:text-white hover:bg-white/5 transition-colors"
                        >
                          <HelpCircle className="w-4 h-4" /> <span>Help</span>
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> <span>Sign Out</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    to="/auth/signin"
                    className="text-sm text-cyber-gray hover:text-white transition-colors px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <Link to="/auth/signup" className="cyber-button-primary text-sm px-4 py-2">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-cyber-gray hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-cyber-darker/98 border-t border-cyber-cyan/20 px-4 py-3 space-y-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm ${
                  isActive(path) ? 'bg-cyber-cyan/20 text-cyber-cyan' : 'text-cyber-gray hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> <span>{label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* ── Page Content ────────────────────────────────────────────────── */}
      <div className="pt-16">
        <Outlet />
      </div>
    </div>
  );
}
