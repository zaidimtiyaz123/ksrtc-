import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { NotificationItem, UserRole } from '../types';
import {
  Bus,
  MapPin,
  PhoneCall,
  Radio,
  ShieldCheck,
  Smartphone,
  Bell,
  Heart,
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Languages,
  Check,
  Ticket,
  Activity,
  Navigation2
} from 'lucide-react';
import { TransitCopilotModal } from './TransitCopilotModal';

export const Navbar: React.FC = () => {
  const { user, role, logout, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Close menus on route change
  useEffect(() => {
    setIsAuthMenuOpen(false);
    setIsNotifOpen(false);
    setIsLangMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    api.getNotifications(user?.id).then(res => {
      setNotifications(res.notifications || []);
    }).catch(() => {});
  }, [user?.id]);

  const unreadCount = notifications.filter(n => !n.read_status).length;
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const languagesList: { code: Language; label: string; sub: string }[] = [
    { code: 'en', label: 'English', sub: 'Default' },
    { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
    { code: 'hi', label: 'हिंदी', sub: 'Hindi' }
  ];

  const currentLangObj = languagesList.find(l => l.code === language) || languagesList[0];

  return (
    <header className="sticky top-0 z-50 bg-[#0A0D15] text-[#E0E0E0] border-b border-[#1A2233] shadow-2xl">
      {/* Main navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Clean Title */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-700 via-red-600 to-blue-700 flex items-center justify-center shadow-lg shadow-red-900/30 ring-1 ring-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
              <Bus className="w-5 h-5 text-white drop-shadow" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-white">KSRTC</span>
              <span className="font-bold text-xs tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-600/30 text-blue-300 border border-blue-500/30">SmartTrack</span>
            </div>
          </Link>

          {/* Desktop Nav Links - Strictly Role Governed */}
          {user && role === 'driver' ? (
            /* Driver can see ONLY driver dash cockpit */
            <nav className="hidden md:flex items-center gap-2 text-sm font-medium">
              <Link
                to="/driver"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  isActive('/driver')
                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Smartphone className="w-4 h-4 text-white" />
                <span>Driver GPS Cockpit</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Driver Duty Session Active</span>
              </div>
            </nav>
          ) : user && role === 'passenger' ? (
            /* User/Passenger can see ONLY user views */
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/passenger"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/passenger') || isActive('/dashboard')
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Ticket className="w-4 h-4 text-purple-400" />
                <span>{t('nav.passenger_dashboard', 'Passenger Dashboard')}</span>
              </Link>
              <Link
                to="/planner"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/planner') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                <span>Trip Planner</span>
              </Link>
              <Link
                to="/track"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/track') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map')}</span>
              </Link>
              <Link
                to="/routes"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/routes') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>{t('nav.routes', 'Routes')}</span>
              </Link>
              <Link
                to="/stops"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/stops') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops & QR')}</span>
              </Link>
              <Link
                to="/ivr"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/ivr') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>{t('nav.ivr', 'IVR Voice')}</span>
              </Link>
            </nav>
          ) : user && role === 'admin' ? (
            /* Admin has ALL application access */
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/admin')
                    ? 'bg-amber-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>{t('nav.admin', 'Admin Fleet')}</span>
              </Link>
              <Link
                to="/driver"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/driver')
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-blue-400 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>{t('nav.driver', 'Driver Cockpit')}</span>
              </Link>
              <Link
                to="/passenger"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/passenger') || isActive('/dashboard')
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Ticket className="w-4 h-4 text-purple-400" />
                <span>Passenger View</span>
              </Link>
              <Link
                to="/planner"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/planner') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                <span>Trip Planner</span>
              </Link>
              <Link
                to="/track"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/track') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map')}</span>
              </Link>
              <Link
                to="/routes"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/routes') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>{t('nav.routes', 'Routes')}</span>
              </Link>
              <Link
                to="/stops"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/stops') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops')}</span>
              </Link>
            </nav>
          ) : (
            /* Unauthenticated default navigation */
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                to="/planner"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/planner') || isActive('/trip-planner')
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                <span>Trip Planner</span>
              </Link>
              <Link
                to="/track"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/track') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map')}</span>
              </Link>
              <Link
                to="/routes"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/routes') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <Bus className="w-4 h-4" />
                <span>{t('nav.routes', 'Routes')}</span>
              </Link>
              <Link
                to="/stops"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/stops') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops & QR')}</span>
              </Link>
              <Link
                to="/ivr"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  isActive('/ivr') ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-300 hover:text-white hover:bg-[#1A1D24]'
                }`}
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>{t('nav.ivr', 'IVR Voice')}</span>
              </Link>
            </nav>
          )}

          {/* Right Action Icons & Role Switcher */}
          <div className="hidden lg:flex items-center gap-2">
            {/* AI Transit Copilot Trigger */}
            <button
              type="button"
              onClick={() => setIsCopilotOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Ask KSRTC AI Transit Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>AI Copilot</span>
            </button>

            {/* Language Dropdown Selector */}
            <div className="relative">
              <button
                id="language-selector-button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 bg-[#121722] hover:bg-[#1A2232] text-xs font-bold px-2.5 py-1.5 rounded-xl border border-[#1E2536] text-slate-200 transition-colors shadow-sm"
                title="Change Application Language"
              >
                <Languages className="w-3.5 h-3.5 text-blue-400" />
                <span>{currentLangObj.label}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-[#121722] border border-[#1E2536] rounded-2xl shadow-2xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t('lang.select', 'Select Language')}
                  </div>
                  {languagesList.map(item => (
                    <button
                      key={item.code}
                      onClick={() => {
                        setLanguage(item.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        language === item.code ? 'bg-blue-600/20 text-blue-300 font-bold' : 'text-slate-200 hover:bg-[#1A2232]'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.sub}</div>
                      </div>
                      {language === item.code && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                id="notification-bell-btn"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-300 hover:text-white hover:bg-[#161D2C] rounded-xl relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-[#0A0D15]"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#121722] border border-[#1E2536] rounded-2xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2536]">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">{t('nav.notifications', 'Service Notifications')}</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-semibold">{unreadCount} unread</span>
                  </div>
                  <div className="divide-y divide-[#1E2536] max-h-60 overflow-y-auto mt-2">
                    {notifications.length === 0 ? (
                      <div className="text-xs text-slate-400 py-3 text-center">{t('nav.no_notifications', 'No new notifications')}</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="py-2 text-xs">
                          <div className="font-semibold text-white mb-0.5">{n.title}</div>
                          <div className="text-slate-300 text-[11px] leading-relaxed">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Favorites link */}
            <Link
              to="/favorites"
              className="p-2 text-slate-300 hover:text-rose-400 hover:bg-[#161D2C] rounded-xl transition-colors"
              title={t('nav.favorites', 'Saved Favorites')}
            >
              <Heart className="w-4 h-4" />
            </Link>

            {/* PREEMINENT SHAPED OFFICIAL LOGIN / ACCOUNT BUTTON ON THE OUTER RIGHT */}
            {user ? (
              <div className="relative pl-2.5 border-l border-[#1E2536]">
                <button
                  id="header-user-profile-button"
                  onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                  className="flex items-center gap-2.5 bg-[#121724] hover:bg-[#1A2234] text-slate-200 px-3 py-1.5 rounded-full border border-blue-500/30 shadow-md transition-all cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center ring-2 ring-blue-400/40 shrink-0">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden xl:block leading-tight">
                    <div className="text-xs font-bold text-white truncate max-w-[100px]">{user.name}</div>
                    <div className="text-[9px] font-mono uppercase text-blue-400 font-bold">{role}</div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAuthMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAuthMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#121724] border border-[#1E2536] rounded-2xl shadow-2xl p-2.5 z-50 space-y-1">
                    <div className="px-3 py-2 border-b border-[#1E2536]">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{role} Account</div>
                    </div>
                    <Link
                      to={role === 'passenger' ? '/passenger' : role === 'driver' ? '/driver' : '/admin'}
                      onClick={() => setIsAuthMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-colors"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Open {role === 'driver' ? 'Driver Cockpit' : role === 'admin' ? 'Fleet Admin' : 'Passenger Portal'}</span>
                    </Link>
                    <button
                      onClick={() => {
                        setIsAuthMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-600/20 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t('nav.logout', 'Sign Out')}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative pl-2.5 border-l border-[#1E2536]">
                <button
                  id="header-official-login-button"
                  onClick={() => setIsAuthMenuOpen(!isAuthMenuOpen)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-full border border-blue-400/40 shadow-lg shadow-blue-900/30 transition-all cursor-pointer group"
                  title="Official KSRTC Authentication Gateway"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="whitespace-nowrap">Official Sign In</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform ${isAuthMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAuthMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#121724] border border-[#1E2536] rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                    <div className="px-3 py-1.5 border-b border-[#1E2536] text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>KSRTC Duty & Portal Access</span>
                    </div>

                    <Link
                      to="/login/passenger"
                      onClick={() => setIsAuthMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1A2234] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">Passenger Portal</div>
                        <div className="text-[10px] text-slate-400">Email ID & Booking Pass</div>
                      </div>
                    </Link>

                    <Link
                      to="/login/driver"
                      onClick={() => setIsAuthMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1A2234] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Driver Cockpit Duty</div>
                        <div className="text-[10px] text-slate-400">Driver Code & Shift PIN</div>
                      </div>
                    </Link>

                    <Link
                      to="/login/admin"
                      onClick={() => setIsAuthMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#1A2234] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">Fleet Dispatch Admin</div>
                        <div className="text-[10px] text-slate-400">Control Room Operations</div>
                      </div>
                    </Link>

                    <div className="pt-2 border-t border-[#1E2536]">
                      <Link
                        to="/login"
                        onClick={() => setIsAuthMenuOpen(false)}
                        className="block text-center py-2 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        All Authentication Options ➔
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Right Bar: Shaped Login Button + Menu Toggle */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Auth Button */}
            {user ? (
              <Link
                to={role === 'passenger' ? '/passenger' : role === 'driver' ? '/driver' : '/admin'}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-blue-400/40 shadow"
                title={user.name}
              >
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1 bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-full border border-blue-400/40 shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Sign In</span>
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#161D2C] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#0F1115] border-b border-[#1E222B] px-4 pt-2 pb-4 space-y-2">
          {/* Language bar in mobile menu */}
          <div className="flex items-center justify-between bg-[#161920] p-2 rounded-xl border border-[#222732] mb-2">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
              <Languages className="w-3.5 h-3.5 text-blue-400" />
              <span>Language:</span>
            </span>
            <div className="flex gap-1">
              {languagesList.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    language === l.code ? 'bg-blue-600 text-white' : 'bg-[#0F1115] text-slate-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Navigation Links - Strictly Role Governed */}
          {user && role === 'driver' ? (
            /* Driver only sees driver cockpit */
            <div className="space-y-2">
              <Link
                to="/driver"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-sm"
              >
                <Smartphone className="w-5 h-5 text-white" />
                <span>Driver GPS Cockpit</span>
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Shift: Driver Cockpit Mode</span>
              </div>
            </div>
          ) : user && role === 'passenger' ? (
            /* User/Passenger only sees passenger views */
            <div className="space-y-1">
              <Link
                to="/passenger"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-purple-300 hover:bg-[#1A1D24] font-semibold"
              >
                <Ticket className="w-4 h-4" />
                <span>{t('nav.passenger_dashboard', 'Passenger Dashboard')}</span>
              </Link>
              <Link
                to="/planner"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-cyan-300 hover:bg-[#1A1D24] font-semibold"
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                <span>Trip Planner</span>
              </Link>
              <Link
                to="/track"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map Tracking')}</span>
              </Link>
              <Link
                to="/routes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Bus className="w-4 h-4 text-blue-400" />
                <span>{t('nav.routes', 'Routes & Timetables')}</span>
              </Link>
              <Link
                to="/stops"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops & QR Codes')}</span>
              </Link>
              <Link
                to="/ivr"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>{t('nav.ivr', 'IVR Voice Accessibility')}</span>
              </Link>
            </div>
          ) : user && role === 'admin' ? (
            /* Admin sees all application views */
            <div className="space-y-1">
              <Link
                to="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-amber-300 hover:bg-[#1A1D24] font-semibold"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t('nav.admin', 'Admin Fleet Management')}</span>
              </Link>
              <Link
                to="/driver"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-blue-300 hover:bg-[#1A1D24] font-semibold"
              >
                <Smartphone className="w-4 h-4" />
                <span>{t('nav.driver', 'Driver GPS Cockpit')}</span>
              </Link>
              <Link
                to="/passenger"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-purple-300 hover:bg-[#1A1D24] font-semibold"
              >
                <Ticket className="w-4 h-4" />
                <span>{t('nav.passenger_dashboard', 'Passenger Dashboard')}</span>
              </Link>
              <Link
                to="/track"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map Tracking')}</span>
              </Link>
              <Link
                to="/routes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Bus className="w-4 h-4 text-blue-400" />
                <span>{t('nav.routes', 'Routes & Timetables')}</span>
              </Link>
              <Link
                to="/stops"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops & QR Codes')}</span>
              </Link>
              <Link
                to="/ivr"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>{t('nav.ivr', 'IVR Voice Accessibility')}</span>
              </Link>
            </div>
          ) : (
            /* Unauthenticated */
            <div className="space-y-1">
              <Link
                to="/planner"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-cyan-300 hover:bg-[#1A1D24] font-semibold"
              >
                <Navigation2 className="w-4 h-4 text-cyan-400" />
                <span>Trip Planner (A-to-B)</span>
              </Link>
              <Link
                to="/track"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>{t('nav.live_map', 'Live Map Tracking')}</span>
              </Link>
              <Link
                to="/routes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <Bus className="w-4 h-4 text-blue-400" />
                <span>{t('nav.routes', 'Routes & Timetables')}</span>
              </Link>
              <Link
                to="/stops"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <MapPin className="w-4 h-4 text-blue-400" />
                <span>{t('nav.stops', 'Stops & QR Codes')}</span>
              </Link>
              <Link
                to="/ivr"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-200 hover:bg-[#1A1D24]"
              >
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>{t('nav.ivr', 'IVR Voice Accessibility')}</span>
              </Link>
            </div>
          )}

          <div className="pt-3 border-t border-[#1E222B] flex items-center justify-between">
            {user ? (
              <div className="flex items-center justify-between w-full">
                <div className="text-xs">
                  <span className="text-slate-400">Signed in as </span>
                  <span className="text-white font-bold">{user.name}</span>
                  <span className="ml-2 text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/40">{role}</span>
                </div>
                <button onClick={logout} className="text-xs text-rose-400 font-semibold hover:text-rose-300 transition-colors">{t('nav.logout', 'Logout')}</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login/passenger"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs bg-[#161920] border border-[#262B3A] text-blue-400 px-2 py-1 rounded-md font-bold"
                >
                  Passenger Login
                </Link>
                <Link
                  to="/login/driver"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded-md font-bold"
                >
                  Driver Login
                </Link>
              </div>
            )}
          </div>

          {/* Quick Mobile Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsCopilotOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Transit Copilot</span>
            </button>
          </div>
        </div>
      )}

      {/* Mounted Interactive Modals */}
      <TransitCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
      />
    </header>
  );
};
