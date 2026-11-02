'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  RotateCw,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setError('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: trimmedId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please verify and try again.');
        return;
      }

      // Successful login -> Redirect to dashboard
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page relative min-h-screen w-full bg-[#020617] text-white flex items-center justify-center overflow-x-hidden selection:bg-cyan-500 selection:text-white"
      style={{
        backgroundImage: "url('/images/cloud-infrastructure-bg.webp')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* High-Contrast Gradient Overlays (Zero Blur on Background Image) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/90 via-[#020617]/40 to-[#020617]/85 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_#020617_95%)] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#020617] to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />

      {/* Main Responsive Two-Column Grid */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8">
        
        {/* ================= LEFT BRANDING SECTION ================= */}
        <div className="w-full lg:w-1/2 flex flex-col items-start space-y-7 max-w-xl">
          {/* Logo with 3-Bar Chart Cloud */}
          <div className="space-y-2">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg
                  className="w-14 h-14 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.85)]"
                  viewBox="0 0 64 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M49 46H18C12.477 46 8 41.523 8 36C8 30.824 11.928 26.564 17 26.066C17.5 17.5 24.5 11 33.5 11C41.5 11 48 16.5 49.5 24C54.5 24.5 58 28.5 58 33.5C58 40.5 53 46 49 46Z"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x="23" y="32" width="4.5" height="8" rx="2" fill="currentColor" />
                  <rect x="30" y="26" width="4.5" height="14" rx="2" fill="currentColor" />
                  <rect x="37" y="20" width="4.5" height="20" rx="2" fill="currentColor" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                  Multi-Cloud
                </span>
                <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 tracking-tight leading-tight drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                  Monitoring
                </span>
              </div>
            </div>

            {/* Tagline */}
            <div className="flex items-center gap-3 text-xs tracking-widest uppercase font-semibold text-slate-300 pl-1">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-400/60" />
              <span>Monitor &bull; Manage &bull; Scale</span>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-400/60" />
            </div>
          </div>

          {/* Main Heading */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight text-white leading-[1.15]">
              Real-time Monitoring <br />
              Across{' '}
              <span className="text-[#FF9900] drop-shadow-[0_0_15px_rgba(255,153,0,0.5)]">
                AWS
              </span>{' '}
              &amp;{' '}
              <span className="text-[#0089D6] drop-shadow-[0_0_15px_rgba(0,137,214,0.5)]">
                Azure
              </span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
              Track your infrastructure, manage resources, and stay ahead with powerful insights.
            </p>
          </div>

          {/* Cloud Provider Badges */}
          <div className="flex items-center gap-3.5 pt-1">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#081226]/85 border border-slate-700/80 shadow-lg shadow-black/50 backdrop-blur-md hover:border-amber-500/50 transition-colors">
              <AwsLogo className="w-6 h-5 text-[#FF9900]" />
              <span className="text-sm font-bold text-white tracking-wide">AWS</span>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#081226]/85 border border-slate-700/80 shadow-lg shadow-black/50 backdrop-blur-md hover:border-blue-500/50 transition-colors">
              <AzureLogo className="w-5 h-5 text-[#0089D6]" />
              <span className="text-sm font-bold text-white tracking-wide">Azure</span>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-800/80 w-full max-w-lg">
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <Activity className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Live Metrics</span>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5 border-x border-slate-800/60 px-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">Secure Access</span>
            </div>

            <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-200">High Performance</span>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LOGIN CARD ================= */}
        <div className="w-full lg:w-auto flex justify-center">
          <div className="relative w-full max-w-[430px] rounded-3xl bg-[#07132B]/85 backdrop-blur-xl border border-[#0084FF]/60 p-8 sm:p-9 shadow-[0_0_50px_rgba(0,132,255,0.3),0_20px_50px_rgba(0,0,0,0.6)] space-y-6">
            
            {/* Top Glowing Security Shield Icon */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-cyan-400/25 blur-lg" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-b from-[#0084FF]/25 to-[#0040A0]/40 border border-[#0084FF]/80 flex items-center justify-center text-cyan-300 shadow-[0_0_20px_rgba(0,132,255,0.6)]">
                  <svg
                    className="w-7 h-7 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="5" rx="1" fill="currentColor" />
                    <path d="M10 11V9a2 2 0 1 1 4 0v2" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Welcome Back
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Sign in to your Multi-Cloud Monitoring account
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/80 text-xs text-rose-200 flex items-center gap-2.5 animate-in fade-in duration-200 shadow-lg">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username or Email Input */}
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Username or Email"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#040C1E]/95 border border-[#1E3A6E] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#0099FF] focus:ring-2 focus:ring-[#0099FF]/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#040C1E]/95 border border-[#1E3A6E] text-white placeholder-slate-400 text-sm focus:outline-none focus:border-[#0099FF] focus:ring-2 focus:ring-[#0099FF]/30 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-[#007DFE] via-[#0094FF] to-[#00B4FF] hover:brightness-110 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,148,255,0.45)] disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-white" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>

            {/* Divider and Security Platform Label */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-700/60" />
                <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                  OR
                </span>
                <div className="h-px flex-1 bg-slate-700/60" />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Secure &amp; Reliable Monitoring Platform</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
