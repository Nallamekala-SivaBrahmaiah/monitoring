'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Palette,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Layers,
  Eye,
  Layout,
  Sun,
  Moon,
  Shield,
  Activity,
  Cpu,
  Server,
  Box,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useTheme, THEME_PRESETS, WALLPAPER_OPTIONS } from '@/context/ThemeContext';

export default function ThemeCustomizerPage() {
  const {
    activePreset,
    backgroundColor,
    cardBackground,
    borderColor,
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    setThemePreset,
    setBackgroundColor,
    setCardBackground,
    setBorderColor,
    setBackgroundImage,
    setBackgroundOpacity,
    setBackgroundBlur,
    resetTheme,
  } = useTheme();

  const [savedToast, setSavedToast] = useState(false);

  const handleApplyToast = () => {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[var(--background,#030712)] text-slate-100 flex flex-col transition-colors duration-300">
      <Sidebar />
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
          {/* Header Banner */}
          <div className="bg-[var(--card-bg,#0D131F)] border border-[var(--card-border,#1E293B)] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Appearance & Background Customizer
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize platform background colors, high-res wallpapers, card contrast, and aesthetic themes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetTheme}
                className="px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleApplyToast}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/30 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{savedToast ? 'Theme Saved!' : 'Save & Persist'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Background Color Models & Themes */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-400" />
                  <span>1. Background Color Models</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a pre-tuned enterprise color palette. Cards and borders adapt automatically.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Active: <strong className="text-blue-400 capitalize">{activePreset}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => setThemePreset(preset.id)}
                    className={`rounded-2xl border p-4 transition-all cursor-pointer relative space-y-3 shadow-md ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600/10 ring-2 ring-blue-500/40 shadow-blue-500/10'
                        : 'border-[var(--card-border,#1E293B)] bg-[var(--card-bg,#0D131F)] hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-xl border border-white/20 shadow-sm flex items-center justify-center"
                          style={{ backgroundColor: preset.canvasBg }}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{preset.name}</h3>
                          <span className="text-[10px] font-mono text-slate-400">{preset.canvasBg}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#111A2E] text-slate-400'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-snug">{preset.description}</p>

                    {/* Miniature Color Swatches Strip */}
                    <div className="flex items-center gap-2 pt-1 border-t border-[#1E293B]/60 text-[10px] font-mono text-slate-400">
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded border border-white/20"
                          style={{ backgroundColor: preset.canvasBg }}
                        />
                        <span>Canvas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded border border-white/20"
                          style={{ backgroundColor: preset.cardBg }}
                        />
                        <span>Cards</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3.5 h-3.5 rounded border border-white/20"
                          style={{ backgroundColor: preset.borderColor }}
                        />
                        <span>Border</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: High-Resolution Wallpaper Images Gallery */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>2. Background Wallpapers & Images</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select a high-tech datacenter or cloud mesh background to render behind your platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WALLPAPER_OPTIONS.map((wp) => {
                const isSelected = backgroundImage === wp.url;
                const isNone = wp.id === 'none';

                return (
                  <div
                    key={wp.id}
                    onClick={() => setBackgroundImage(wp.url)}
                    className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group shadow-lg flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-purple-500/20 bg-purple-500/10'
                        : 'border-[var(--card-border,#1E293B)] bg-[var(--card-bg,#0D131F)] hover:border-slate-500'
                    }`}
                  >
                    {/* Image Preview Box */}
                    <div
                      className="w-full h-36 bg-cover bg-center relative flex items-center justify-center overflow-hidden bg-[#070B14]"
                      style={{
                        backgroundImage: isNone ? 'none' : `url(${wp.url})`,
                      }}
                    >
                      {isNone ? (
                        <div className="text-center space-y-1 text-slate-400">
                          <Palette className="w-6 h-6 mx-auto opacity-60" />
                          <span className="text-xs font-semibold block">Clean Solid Background</span>
                          <span className="text-[10px] text-slate-500">No background wallpaper image</span>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-black/35 group-hover:bg-black/15 transition-colors" />
                      )}

                      {isSelected && (
                        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg shadow-purple-600/40">
                          <Check className="w-3 h-3" />
                          <span>Active Wallpaper</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition">
                          {wp.title}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#111A2E] text-slate-400 font-mono">
                          {wp.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-snug">{wp.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: Fine-Tuning Controls (Opacity & Blur) */}
          {backgroundImage && backgroundImage.trim() !== '' && (
            <section className="bg-[var(--card-bg,#0D131F)] border border-[var(--card-border,#1E293B)] rounded-2xl p-5 space-y-4 shadow-xl transition-colors">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>3. Wallpaper Fine-Tuning</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opacity Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Wallpaper Opacity</span>
                    <span className="font-mono font-bold text-sky-400 text-sm">
                      {Math.round(backgroundOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={backgroundOpacity}
                    onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>5% (Subtle glow)</span>
                    <span>25% (Balanced)</span>
                    <span>50% (Vibrant)</span>
                  </div>
                </div>

                {/* Blur Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">Ambient Background Blur</span>
                    <span className="font-mono font-bold text-purple-400 text-sm">
                      {backgroundBlur}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    step="1"
                    value={backgroundBlur}
                    onChange={(e) => setBackgroundBlur(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-600 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0px (Crisp image)</span>
                    <span>4px (Soft mesh)</span>
                    <span>12px (Smooth aurora)</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 4: Custom Color Pickers */}
          <section className="bg-[var(--card-bg,#0D131F)] border border-[var(--card-border,#1E293B)] rounded-2xl p-5 space-y-4 shadow-xl transition-colors">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>4. Custom Hex Color Controls</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Canvas Background Color */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#070B14] border border-[#1E293B]">
                <label className="text-xs font-semibold text-slate-300 block">Canvas Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Card & Panel Background */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#070B14] border border-[#1E293B]">
                <label className="text-xs font-semibold text-slate-300 block">Card & Panel Fill</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardBackground}
                    onChange={(e) => setCardBackground(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={cardBackground}
                    onChange={(e) => setCardBackground(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Card Border Color */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#070B14] border border-[#1E293B]">
                <label className="text-xs font-semibold text-slate-300 block">Border & Divider Tone</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  />
                  <input
                    type="text"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Live Component Preview Canvas */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <span>5. Live Dashboard Component Preview</span>
            </h3>

            <div
              className="rounded-2xl border p-5 shadow-2xl space-y-4 transition-all duration-300"
              style={{
                backgroundColor: backgroundColor,
                borderColor: borderColor,
              }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor }}>
                <div className="text-xs font-bold text-white">Live Metric Sample Cards</div>
                <span className="text-[10px] text-slate-400 font-mono">Sample Rendering</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  className="p-3.5 rounded-xl border space-y-1 transition-colors"
                  style={{ backgroundColor: cardBackground, borderColor }}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">AWS Resources</span>
                  <div className="text-xl font-bold font-mono text-[#FF9900]">5 Active</div>
                  <p className="text-[10px] text-slate-500">EC2 & VPC telemetry</p>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1 transition-colors"
                  style={{ backgroundColor: cardBackground, borderColor }}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Azure VMs</span>
                  <div className="text-xl font-bold font-mono text-[#0089D6]">2 Running</div>
                  <p className="text-[10px] text-slate-500">Central India region</p>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1 transition-colors"
                  style={{ backgroundColor: cardBackground, borderColor }}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Compute</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">7 Servers</div>
                  <p className="text-[10px] text-slate-500">100% operational</p>
                </div>

                <div
                  className="p-3.5 rounded-xl border space-y-1 transition-colors"
                  style={{ backgroundColor: cardBackground, borderColor }}
                >
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">K8s Clusters</span>
                  <div className="text-xl font-bold font-mono text-purple-400">3 Healthy</div>
                  <p className="text-[10px] text-slate-500">v1.30 control plane</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
