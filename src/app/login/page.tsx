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
  Clock,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  MultiCloudBrandLogo,
  AwsLogo,
  AzureLogo,
  DockerLogo,
  KubernetesLogo,
  AnsibleLogo,
  MavenLogo,
  NginxLogo,
} from '@/components/icons/CloudIcons';

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

      // Successful login -> Full browser navigation to cleanly mount dashboard
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page relative min-h-screen w-full bg-[#020617] text-white flex items-center justify-center overflow-x-hidden selection:bg-cyan-500 selection:text-white">
      {/* Instant 0ms Static Image Background - Zero Buffering, Razor-Sharp Performance */}
      <img
        src="/images/bg-clean-datacenter.jpg"
        alt="Multi-Cloud Monitoring"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none z-0"
      />

      {/* High-Contrast Gradient Overlays for Razor-Sharp Readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/95 via-[#020617]/70 to-[#020617]/90 pointer-events-none z-[1]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_30%,_#020617_90%)] pointer-events-none z-[1]" />
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#020617] to-transparent pointer-events-none z-[1]" />
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none z-[1]" />

      {/* Left-Edge Vertical Cyber Telemetry Rail with Real Passing Laser Light Lines */}
      <div
        aria-label="Dual Cloud Cyber Rail"
        className="hidden xl:flex fixed left-3 2xl:left-7 top-1/2 -translate-y-1/2 z-20 items-center justify-center h-[390px] w-16 select-none font-mono pointer-events-none"
      >
        <div className="relative w-14 h-full flex flex-col justify-between items-center py-2.5 bg-[#030714]/85 backdrop-blur-xl rounded-2xl border border-cyan-500/40 shadow-[0_0_25px_rgba(0,148,255,0.35),inset_0_0_15px_rgba(0,148,255,0.15)]">
          
          {/* Top Header Badge */}
          <div className="z-10 px-2 py-0.5 rounded-md bg-[#020617] border border-cyan-400 text-[8px] font-extrabold text-cyan-300 tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.6)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#00e5ff]" />
            <span>DUAL.BUS</span>
          </div>

          {/* SVG High-Intensity Passing Light Engine */}
          <svg viewBox="0 0 56 320" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            <defs>
              {/* Laser Stream Gradients */}
              <linearGradient id="laserCyanStream" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor="#0284c7" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#00e5ff" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>

              <linearGradient id="laserAmberStream" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="30%" stopColor="#d97706" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
              </linearGradient>

              {/* High-Intensity Radiant Glow Filters */}
              <filter id="cyanLaserGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3.5" result="blur1" />
                <feGaussianBlur stdDeviation="7" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="amberLaserGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3.5" result="blur1" />
                <feGaussianBlur stdDeviation="7" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Base Conduit Rails */}
            {/* Left Track (Azure Channel) x=14 */}
            <line x1="14" y1="36" x2="14" y2="284" stroke="rgba(2, 132, 199, 0.4)" strokeWidth="3" strokeLinecap="round" />
            <line x1="14" y1="36" x2="14" y2="284" stroke="rgba(56, 189, 248, 0.2)" strokeWidth="6" strokeLinecap="round" />

            {/* Right Track (AWS Channel) x=42 */}
            <line x1="42" y1="36" x2="42" y2="284" stroke="rgba(217, 119, 6, 0.4)" strokeWidth="3" strokeLinecap="round" />
            <line x1="42" y1="36" x2="42" y2="284" stroke="rgba(251, 191, 36, 0.2)" strokeWidth="6" strokeLinecap="round" />

            {/* Horizontal Cyber Data Rungs & Glowing LEDs */}
            {[72, 116, 160, 204, 248].map((y, idx) => (
              <g key={idx}>
                <line x1="14" y1={y} x2="42" y2={y} stroke="rgba(100, 116, 139, 0.6)" strokeWidth="1.5" strokeDasharray="3 2" />
                <circle cx="14" cy={y} r="2.5" fill="#00e5ff" filter="url(#cyanLaserGlow)" />
                <circle cx="42" cy={y} r="2.5" fill="#fbbf24" filter="url(#amberLaserGlow)" />
              </g>
            ))}

            {/* 1. LEFT PASSING LIGHT BEAM (Streaming Down with blazing laser head) */}
            <g className="laser-beam-down" filter="url(#cyanLaserGlow)">
              <line x1="14" y1="0" x2="14" y2="75" stroke="url(#laserCyanStream)" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="14" cy="75" r="3.5" fill="#ffffff" />
              <circle cx="14" cy="75" r="6" fill="#00e5ff" opacity="0.6" />
            </g>

            {/* 2. RIGHT PASSING LIGHT BEAM (Streaming Up with blazing laser head) */}
            <g className="laser-beam-up" filter="url(#amberLaserGlow)">
              <line x1="42" y1="75" x2="42" y2="0" stroke="url(#laserAmberStream)" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="42" cy="0" r="3.5" fill="#ffffff" />
              <circle cx="42" cy="0" r="6" fill="#fbbf24" opacity="0.6" />
            </g>
          </svg>

          {/* Center Vertical Text Label */}
          <div className="z-10 px-1 py-2 rounded-lg bg-[#030917]/95 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,148,255,0.4)] flex items-center justify-center">
            <span className="writing-vertical-rl text-[7.5px] font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 via-white to-amber-300 uppercase">
              AWS // AZURE BUS
            </span>
          </div>

          {/* Bottom Badge */}
          <div className="z-10 px-2 py-0.5 rounded-md bg-[#020617] border border-emerald-400 text-[8px] font-extrabold text-emerald-300 tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.5)] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_6px_#10b981]" />
            <span>SYNC:0MS</span>
          </div>
        </div>
      </div>

      {/* Main Responsive Two-Column Grid - Fluid Wide Layout to Naturally Balance Screen Space */}
      <div className="relative z-10 w-full max-w-[1450px] mx-auto px-6 sm:px-10 lg:px-16 xl:px-24 py-10 sm:py-14 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-14">
        
        {/* ================= LEFT BRANDING SECTION ================= */}
        <div className="w-full lg:w-1/2 flex flex-col items-start space-y-6 max-w-xl transition-transform duration-300">
          {/* Logo with 3-Bar Chart Cloud */}
          <div className="space-y-2">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <MultiCloudBrandLogo className="w-14 h-14 drop-shadow-[0_0_15px_rgba(6,182,212,0.85)]" />
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

          {/* Main Heading & Rich Application Overview */}
          <div className="space-y-3.5">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-white leading-[1.15]">
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
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              Enterprise DevOps observability platform. Monitor EC2 instances and Azure Virtual Machines with live CPU, memory, disk and network telemetry, automate server power schedules, deploy apps via Nginx &amp; PM2, run Ansible playbooks, and launch secure in-browser SSH sessions.
            </p>

            {/* Quick Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111A2E]/90 border border-slate-700/70 text-[11px] font-medium text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Multi-Cloud Telemetry
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111A2E]/90 border border-slate-700/70 text-[11px] font-medium text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                Nginx &amp; PM2 Deploy
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111A2E]/90 border border-slate-700/70 text-[11px] font-medium text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                Ansible Automation
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111A2E]/90 border border-slate-700/70 text-[11px] font-medium text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Server Scheduling
              </span>
            </div>
          </div>

          {/* Cloud Provider Badges */}
          <div className="flex items-center gap-3.5 pt-0.5">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#081226]/85 border border-slate-700/80 shadow-lg shadow-black/50 backdrop-blur-md hover:border-amber-500/50 transition-colors">
              <AwsLogo className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white tracking-wide">AWS Cloud</span>
                <span className="text-[10px] text-slate-400 font-mono">EC2 &bull; CloudWatch</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#081226]/85 border border-slate-700/80 shadow-lg shadow-black/50 backdrop-blur-md hover:border-blue-500/50 transition-colors">
              <AzureLogo className="w-5 h-5" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white tracking-wide">Azure Cloud</span>
                <span className="text-[10px] text-slate-400 font-mono">VMs &bull; Monitor</span>
              </div>
            </div>
          </div>

          {/* Expanded 6-Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-800/80 w-full max-w-lg">
            {/* 1. Live Metrics */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">Live Metrics</span>
                <span className="text-[10px] text-slate-400">CPU, RAM &amp; Disk</span>
              </div>
            </div>

            {/* 2. Secure Access */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">Secure Access</span>
                <span className="text-[10px] text-slate-400">256-bit TLS &amp; IAM</span>
              </div>
            </div>

            {/* 3. High Performance */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">High Performance</span>
                <span className="text-[10px] text-slate-400">Sub-second sync</span>
              </div>
            </div>

            {/* 4. Server Scheduling */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-purple-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">Auto Scheduling</span>
                <span className="text-[10px] text-slate-400">Start / Stop timer</span>
              </div>
            </div>

            {/* 5. Nginx & PM2 Deploy */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">Nginx &amp; PM2</span>
                <span className="text-[10px] text-slate-400">Zero-downtime deploy</span>
              </div>
            </div>

            {/* 6. In-Browser Web SSH */}
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-[#0B1426]/75 border border-slate-800/80 hover:border-amber-500/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200">Web SSH Shell</span>
                <span className="text-[10px] text-slate-400">Instant terminal</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT LOGIN CARD ================= */}
        <div className="w-full lg:w-auto flex justify-center">
          {/* Design 2: Animated Rotating Laser Beam Border */}
          <div className="border-rotating-beam-container relative w-full max-w-[430px] rounded-3xl shadow-[0_0_45px_-5px_rgba(0,132,255,0.4),0_0_40px_-5px_rgba(255,153,0,0.3),0_25px_50px_rgba(0,0,0,0.7)] transition-all duration-300 hover:shadow-[0_0_60px_-5px_rgba(0,132,255,0.6),0_0_50px_-5px_rgba(255,153,0,0.45)]">
            <div className="border-rotating-beam-inner p-8 sm:p-9 space-y-6">
            
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
  </div>
  );
}
