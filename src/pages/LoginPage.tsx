import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import {
  Smartphone,
  ShieldCheck,
  User as UserIcon,
  Mail,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  MapPin,
  AlertCircle,
  Clock,
  Phone,
  Radio,
  Ticket
} from 'lucide-react';

interface DriverRosterItem {
  id: string;
  driver_code: string;
  name: string;
  phone: string;
  status: string;
  assigned_bus_id: string;
  bus_registration: string;
  bus_model: string;
  assigned_route_id: string;
  route_name: string;
  default_password: string;
}

interface LoginPageProps {
  initialTab?: 'passenger' | 'driver' | 'admin';
}

export const LoginPage: React.FC<LoginPageProps> = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, role, isAuthenticated, login, loginDriver, loginWithGoogle, loginWithOtp, requestOtp, signup, isLoading } = useAuth();

  // If already authenticated, redirect directly to role-specific dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (role === 'driver') {
        navigate('/driver', { replace: true });
      } else if (role === 'passenger') {
        navigate('/passenger', { replace: true });
      } else if (role === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [isAuthenticated, user, role, navigate]);

  // Determine active tab based on prop, path, or query param
  const getComputedInitialTab = (): 'passenger' | 'driver' | 'admin' => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/driver')) return 'driver';
    if (location.pathname.includes('/admin')) return 'admin';
    if (location.pathname.includes('/passenger')) return 'passenger';
    const qRole = searchParams.get('role');
    if (qRole === 'driver' || qRole === 'admin' || qRole === 'passenger') return qRole;
    return 'passenger';
  };

  const [activeTab, setActiveTab] = useState<'passenger' | 'driver' | 'admin'>(getComputedInitialTab());

  // Update tab if route changes
  useEffect(() => {
    if (location.pathname.includes('/driver')) setActiveTab('driver');
    else if (location.pathname.includes('/admin')) setActiveTab('admin');
    else if (location.pathname.includes('/passenger')) setActiveTab('passenger');
  }, [location.pathname]);

  // Passenger Form State
  const [passengerAuthMode, setPassengerAuthMode] = useState<'login' | 'signup'>('login');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [passengerPassword, setPassengerPassword] = useState('');
  const [showPassengerPassword, setShowPassengerPassword] = useState(false);
  const [useOtpLogin, setUseOtpLogin] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sentOtpValue, setSentOtpValue] = useState('');

  // Passenger Registration State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  // Driver Form State
  const [driverId, setDriverId] = useState('');
  const [driverPassword, setDriverPassword] = useState('');
  const [showDriverPassword, setShowDriverPassword] = useState(false);
  const [selectedShift, setSelectedShift] = useState('Morning Express (06:00 - 14:00)');

  // Admin Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [controlStation, setControlStation] = useState('Kempegowda Majestic HQ (Bangalore Central)');

  // Feedback State
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Passenger Email / OTP Login
  const handlePassengerEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!passengerEmail.trim()) {
      setError('Please enter your registered passenger email address.');
      return;
    }

    if (useOtpLogin) {
      if (!otpSent) {
        setError('Please click "Send One-Time Code" first to receive your 6-digit OTP.');
        return;
      }
      if (!otpCode.trim() || otpCode.trim().length !== 6) {
        setError('Please enter the complete 6-digit verification code.');
        return;
      }

      try {
        await loginWithOtp(passengerEmail.trim(), otpCode.trim());
        setSuccessMessage(`Welcome! Authenticated via verified OTP. Redirecting to Passenger Dashboard...`);
        setTimeout(() => navigate('/passenger'), 500);
      } catch (err: any) {
        setError(err.message || 'Verification failed. Please check the OTP code and try again.');
      }
    } else {
      if (!passengerPassword) {
        setError('Please enter your account password.');
        return;
      }

      try {
        await login(passengerEmail.trim(), passengerPassword, 'passenger');
        setSuccessMessage(`Welcome! Authenticated as ${passengerEmail.trim()}. Redirecting to Passenger Dashboard...`);
        setTimeout(() => navigate('/passenger'), 500);
      } catch (err: any) {
        setError(err.message || 'Passenger login failed. Please check your credentials.');
      }
    }
  };

  // Handle Passenger Registration
  const handlePassengerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!signupName.trim() || !signupEmail.trim()) {
      setError('Please provide your full legal name and email address.');
      return;
    }

    try {
      await signup(signupName.trim(), signupEmail.trim(), signupPhone.trim(), 'passenger');
      setSuccessMessage(`Passenger account registered successfully! Entering dashboard...`);
      setTimeout(() => navigate('/passenger'), 500);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try a different email.');
    }
  };

  // Request authentic OTP
  const handleSendOtp = async () => {
    if (!passengerEmail.trim() || !passengerEmail.includes('@')) {
      setError('Please enter a valid email address to receive a One-Time Code.');
      return;
    }
    setError(null);
    try {
      const res = await requestOtp(passengerEmail.trim());
      setOtpSent(true);
      setSentOtpValue(res.otp || '');
      setSuccessMessage(res.message || `A 6-digit verification code has been dispatched to ${passengerEmail.trim()}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
    }
  };

  // Handle Passenger Google Sign-In
  const handlePassengerGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      await loginWithGoogle();
      setSuccessMessage('Successfully authenticated with Google account! Redirecting to Passenger Dashboard...');
      setTimeout(() => navigate('/passenger'), 500);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    }
  };

  // Handle Driver Authentication
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!driverId.trim()) {
      setError('Please enter your official Driver ID (e.g., DRV-101).');
      return;
    }
    if (!driverPassword) {
      setError('Please enter your driver shift password.');
      return;
    }

    try {
      await loginDriver(driverId.trim().toUpperCase(), driverPassword);
      setSuccessMessage(`Driver Shift verified for ${driverId.toUpperCase()} [${selectedShift}]. Redirecting to Cockpit...`);
      setTimeout(() => navigate('/driver'), 500);
    } catch (err: any) {
      setError(err.message || 'Driver ID or Password incorrect. Check your assigned duty details.');
    }
  };

  // Handle Admin Authentication
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!adminEmail.trim()) {
      setError('Please enter your administrator email.');
      return;
    }
    if (!adminPassword) {
      setError('Please enter your administrator password.');
      return;
    }

    try {
      await login(adminEmail.trim(), adminPassword, 'admin');
      setSuccessMessage(`Admin authorized for ${controlStation}. Redirecting to Fleet Control Room...`);
      setTimeout(() => navigate('/admin'), 500);
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed.');
    }
  };

  return (
    <div className="min-h-[88vh] py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center text-[#E0E0E0] w-full">
      <div className="max-w-4xl w-full">
        {/* Header Branding */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#161922] border border-[#232836] px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>KSRTC Official Authentication Gateway</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign In to KSRTC SmartTrack
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Real-life duty access: Passenger login with Email ID, Driver duty login with Driver ID & Password, or Traffic Control Room.
          </p>
        </div>

        {/* Global Feedback Banner */}
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2.5 max-w-2xl mx-auto">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center gap-2.5 max-w-2xl mx-auto">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}



        {/* Role Tabs */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-[#14171F] border border-[#232836] rounded-2xl max-w-xl mx-auto mb-8 shadow-inner">
          <button
            id="tab-passenger-login"
            type="button"
            onClick={() => { setActiveTab('passenger'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'passenger'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1E29]'
            }`}
          >
            <Mail className="w-4 h-4 shrink-0" />
            <span>Passenger <span className="hidden sm:inline font-normal text-slate-300">(Email)</span></span>
          </button>

          <button
            id="tab-driver-login"
            type="button"
            onClick={() => { setActiveTab('driver'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'driver'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1E29]'
            }`}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>Driver <span className="hidden sm:inline font-normal text-slate-300">(ID)</span></span>
          </button>

          <button
            id="tab-admin-login"
            type="button"
            onClick={() => { setActiveTab('admin'); setError(null); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1A1E29]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Admin <span className="hidden sm:inline font-normal text-slate-300">(Fleet)</span></span>
          </button>
        </div>

        {/* Tab 1: Passenger Login with Email ID */}
        {activeTab === 'passenger' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-4xl mx-auto">
            {/* Primary Passenger Auth Card */}
            <div className="lg:col-span-7 bg-[#141720] border border-[#232836] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Passenger Portal</h2>
                    <p className="text-xs text-slate-400">Login with your verified Email ID</p>
                  </div>
                </div>

                {/* Switch between Login and Register */}
                <div className="inline-flex p-1 bg-[#181C26] rounded-xl border border-[#282E3E]">
                  <button
                    type="button"
                    onClick={() => setPassengerAuthMode('login')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      passengerAuthMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setPassengerAuthMode('signup')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      passengerAuthMode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    New User
                  </button>
                </div>
              </div>

              {passengerAuthMode === 'login' ? (
                /* Passenger Email Sign-In Form */
                <form onSubmit={handlePassengerEmailLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Passenger Email ID
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="passenger-email-input"
                        type="email"
                        required
                        placeholder="e.g. ananya.sharma@gmail.com"
                        value={passengerEmail}
                        onChange={e => setPassengerEmail(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {!useOtpLogin ? (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-300 uppercase">
                          Account Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setUseOtpLogin(true)}
                          className="text-[11px] text-blue-400 hover:underline"
                        >
                          Sign in with OTP instead
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          id="passenger-password-input"
                          type={showPassengerPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your account password"
                          value={passengerPassword}
                          onChange={e => setPassengerPassword(e.target.value)}
                          className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-10 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassengerPassword(!showPassengerPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          title="Toggle password view"
                        >
                          {showPassengerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-300 uppercase">
                          6-Digit One-Time Password (OTP)
                        </label>
                        <button
                          type="button"
                          onClick={() => { setUseOtpLogin(false); setError(null); }}
                          className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                        >
                          Use password instead
                        </button>
                      </div>
                      <div className="flex gap-2.5">
                        <input
                          id="passenger-otp-input"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="••••••"
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-36 bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 font-mono text-center text-lg tracking-widest text-white focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isLoading}
                          className="flex-1 bg-[#1E2330] hover:bg-[#252C3D] border border-[#2C3448] text-slate-200 font-bold px-3 py-2.5 rounded-xl transition-colors text-xs cursor-pointer disabled:opacity-50"
                        >
                          {otpSent ? 'Resend 6-Digit OTP' : 'Send One-Time Code'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {otpSent
                          ? 'A 6-digit verification code was sent to your email. Enter it above to sign in.'
                          : 'Click "Send One-Time Code" to receive an authentic security passcode.'}
                      </p>
                    </div>
                  )}

                  <button
                    id="passenger-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                  >
                    <span>
                      {isLoading
                        ? 'Verifying...'
                        : useOtpLogin
                        ? 'Verify OTP & Enter Dashboard'
                        : 'Sign In to Passenger Dashboard'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Passenger Signup Form */
                <form onSubmit={handlePassengerSignup} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ananya Sharma"
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. ananya.sharma@gmail.com"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">
                      Mobile Phone (Optional for SMS Alerts)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+91 98450 12345"
                        value={signupPhone}
                        onChange={e => setSignupPhone(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Creating Account...' : 'Register & Access Passenger Dashboard'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#262B3A]"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#141720] px-3 text-slate-500 font-semibold">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                id="passenger-google-signin-btn"
                type="button"
                onClick={handlePassengerGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-bold py-3 px-4 rounded-xl shadow transition-all transform active:scale-[0.99] disabled:opacity-50 text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google Account</span>
              </button>
            </div>

            {/* Right Column: Passenger Account Services & Benefits */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#141720] border border-[#232836] rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Official Passenger Portal</span>
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold">Verified</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in with your email or Google Account to access Karnataka State Road Transport Corporation digital services:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-2xl border border-[#262B3A] bg-[#181C26] space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Radio className="w-3.5 h-3.5 text-blue-400" />
                      <span>Live Satellite Telemetry</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Track buses in real-time with sub-second GPS refresh and accurate arrival countdowns.
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-[#262B3A] bg-[#181C26] space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Digital QR Tickets & Sarige Passes</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Instant contactless boarding passes with secure cryptographically verified QR codes.
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl border border-[#262B3A] bg-[#181C26] space-y-1">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-rose-400" />
                      <span>24x7 Commuter Safety Helpline</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Direct SOS emergency connectivity and voice helpline: <span className="text-rose-400 font-bold">1800-22-1234</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Driver Duty Login (Driver ID & Password) */}
        {activeTab === 'driver' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Driver Login Form */}
              <div className="lg:col-span-5 bg-[#141720] border border-[#232836] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/20">
                    <Smartphone className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Driver Shift Login</h2>
                  <p className="text-xs text-slate-400">
                    Enter your official KSRTC Driver ID and confidential shift password.
                  </p>
                </div>

                <form onSubmit={handleDriverLogin} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Driver ID (Duty Code)</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="driver-id-input"
                        type="text"
                        required
                        placeholder="Enter assigned Driver ID (e.g. DRV-...)"
                        value={driverId}
                        onChange={e => setDriverId(e.target.value.toUpperCase())}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-bold text-white tracking-wider placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Driver Password / PIN</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        id="driver-password-input"
                        type={showDriverPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your assigned shift password"
                        value={driverPassword}
                        onChange={e => setDriverPassword(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-10 py-2.5 font-medium text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDriverPassword(!showDriverPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title="Toggle password view"
                      >
                        {showDriverPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Assigned Shift Schedule</label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={selectedShift}
                        onChange={e => setSelectedShift(e.target.value)}
                        className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Morning Express (06:00 - 14:00)">Morning Express (06:00 - 14:00)</option>
                        <option value="General Shift (08:00 - 16:30)">General Shift (08:00 - 16:30)</option>
                        <option value="Evening Intercity (14:00 - 22:00)">Evening Intercity (14:00 - 22:00)</option>
                        <option value="Night Sarige (20:00 - 06:00)">Night Sarige (20:00 - 06:00)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    id="driver-submit-btn"
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Verifying Driver...' : 'Start Driver GPS Shift'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="bg-[#181C26] p-3.5 rounded-2xl border border-[#262B3A] text-[11px] text-slate-400 space-y-1.5">
                  <div className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-Life Duty Safety Features</span>
                  </div>
                  <p className="leading-relaxed">
                    Once authenticated, the driver cockpit enables high-frequency GPS telemetry, 100m geofencing, route auto-switching, and instant SOS Emergency broadcasts.
                  </p>
                </div>
              </div>

              {/* Right Column: Fleet Operations & Telemetry Protocol */}
              <div className="lg:col-span-7 bg-[#141720] border border-[#232836] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">KSRTC Driver Telemetry Protocols</h3>
                    <p className="text-xs text-slate-400">Duty standards and vehicle cockpit telemetry specifications:</p>
                  </div>
                  <span className="text-[10px] bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2.5 py-1 rounded-full font-bold">
                    Official Protocol
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#181C26] border border-[#262B3A] rounded-2xl p-4 space-y-1.5">
                    <div className="font-bold text-blue-400 flex items-center gap-1.5">
                      <Radio className="w-4 h-4" />
                      <span>5-Second GPS Broadcast</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Continuous telemetry sync streams bus coordinates, speed, and heading to passengers and central command.
                    </p>
                  </div>

                  <div className="bg-[#181C26] border border-[#262B3A] rounded-2xl p-4 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>100m Geofencing Triggers</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Automatic stop arrival detection logs schedule adherence and calculates passenger wait time.
                    </p>
                  </div>

                  <div className="bg-[#181C26] border border-[#262B3A] rounded-2xl p-4 space-y-1.5">
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      <span>Cockpit HUD Telemetry</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Digital speedometer, dynamic route waypoint indicator, passenger counter, and odometer.
                    </p>
                  </div>

                  <div className="bg-[#181C26] border border-[#262B3A] rounded-2xl p-4 space-y-1.5">
                    <div className="font-bold text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>One-Touch Emergency SOS</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Instant distress trigger broadcasts current coordinates to the Divisional Traffic Control Room.
                    </p>
                  </div>
                </div>

                <div className="bg-[#181C26] p-4 rounded-2xl border border-[#262B3A] text-xs text-slate-400">
                  <div className="font-bold text-slate-200 mb-1">Depot Dispatch Support</div>
                  <p className="text-[11px] leading-relaxed">
                    Drivers needing credential retrieval or route re-assignment must contact their Divisional Depot Master at Kempegowda Majestic HQ, Tumkur, Mysuru, Hassan, or Hubballi dispatch units.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Admin / Station Master Login */}
        {activeTab === 'admin' && (
          <div className="max-w-xl mx-auto bg-[#141720] border border-[#232836] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Fleet Controller & Admin Login</h2>
              <p className="text-xs text-slate-400">
                Divisional Traffic Controller portal for fleet dispatch, SOS emergency management, schedule updates, and passenger grievance resolution.
              </p>
            </div>

            <div className="bg-[#181C26] border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-300">
                  Karnataka State Transport Authority • Central Fleet Command
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Restricted portal for authorized Divisional Controllers and Transport Officers. All login sessions are cryptographically verified, audited, and logged in compliance with State Transit Security Protocols.
                </p>
              </div>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Admin Email / Officer ID</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-email-input"
                    type="email"
                    required
                    placeholder="Enter authorized administrator email"
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-3 py-2.5 font-medium text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Admin Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password-input"
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter administrator password"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl pl-9 pr-10 py-2.5 font-medium text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showAdminPassword ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 uppercase mb-1">Control Room Station</label>
                <select
                  value={controlStation}
                  onChange={e => setControlStation(e.target.value)}
                  className="w-full bg-[#181C26] border border-[#262B3A] rounded-xl px-3 py-2.5 font-medium text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="Kempegowda Majestic HQ (Bangalore Central)">Kempegowda Majestic HQ (Bangalore Central)</option>
                  <option value="Tumkur Regional Depot Control Room">Tumkur Regional Depot Control Room</option>
                  <option value="Mysuru Suburban Bus Terminal Command">Mysuru Suburban Bus Terminal Command</option>
                  <option value="Hubballi Division Fleet Ops">Hubballi Division Fleet Ops</option>
                </select>
              </div>

              <button
                id="admin-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-600/30 transition-colors text-sm disabled:opacity-50"
              >
                {isLoading ? 'Verifying Admin...' : 'Authenticate & Open Control Room'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
