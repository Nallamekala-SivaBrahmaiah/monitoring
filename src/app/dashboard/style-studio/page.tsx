'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Palette,
  Layers,
  Sliders,
  Check,
  RotateCcw,
  Save,
  Download,
  Upload,
  Eye,
  Wand2,
  Box,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  Zap,
  Shield,
  Layers3,
  SlidersHorizontal,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useTheme, THEME_PRESETS, CustomWallpaper } from '@/context/ThemeContext';
import { ModuleStyleEditorModal, ALL_APPLICATION_MODULES } from '@/components/dashboard/style-studio/ModuleStyleEditorModal';

export default function HomeStyleStudioPage() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'animations' | 'layers' | 'modules' | 'presets'>('global');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<string>('aws-resources');
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  const {
    activePreset,
    setThemePreset,
    isDark,
    backgroundColor,
    setBackgroundColor,
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    accentColor,
    setAccentColor,
    cardBackground,
    setCardBackground,
    sidebarBackground,
    setSidebarBackground,
    headerBackground,
    setHeaderBackground,
    textColor,
    setTextColor,
    borderColor,
    setBorderColor,
    borderRadius,
    setBorderRadius,
    cardShadow,
    setCardShadow,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    componentSpacing,
    setComponentSpacing,
    // 3D Animations
    animationEnabled,
    setAnimationEnabled,
    animationSpeed,
    setAnimationSpeed,
    animationIntensity,
    setAnimationIntensity,
    background3DEffect,
    setBackground3DEffect,
    cardHover3D,
    setCardHover3D,
    glassmorphism,
    setGlassmorphism,
    glowingBorders,
    setGlowingBorders,
    // Layers
    layers,
    updateLayerConfig,
    // Modules
    moduleStyles,
    getModuleStyle,
    resetModuleStyle,
    openModuleCustomizer,
    // DB & File
    saveThemeToDatabase,
    exportThemeJSON,
    importThemeJSON,
    resetTheme,
    resetEntireTheme,
  } = useTheme();

  const handleSaveTheme = async () => {
    const ok = await saveThemeToDatabase('Active Custom Theme');
    if (ok) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2400);
    }
  };

  const handleExportTheme = () => {
    const json = exportThemeJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multicloud-theme-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = () => {
    if (!importText.trim()) return;
    const ok = importThemeJSON(importText);
    if (ok) {
      setShowImportDialog(false);
      setImportText('');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2400);
    } else {
      alert('Invalid Theme JSON format. Please check and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6">
          
          {/* Top Hero Banner */}
          <div className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-2xl p-5 lg:p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
                  <Sparkles className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-xl lg:text-2xl font-black text-white tracking-tight">
                      Home Style Studio
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                      ENTERPRISE UI CUSTOMIZER
                    </span>
                  </div>
                  <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-3xl">
                    Comprehensive design suite: customize global platform appearance, 3D animated visual engines, layout layers, and individual module styles with live instant preview.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saveToast ? 'Theme Saved in DB ✓' : 'Save & Apply'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTheme}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  title="Download theme as JSON file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowImportDialog(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  title="Import theme from JSON"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import</span>
                </button>

                <button
                  type="button"
                  onClick={resetEntireTheme}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold border border-rose-800/40 transition cursor-pointer"
                  title="Reset everything to factory default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </div>

            {/* Studio Navigation Tabs */}
            <div className="flex items-center gap-2 mt-6 overflow-x-auto border-b border-[#1E293B] select-none">
              <button
                onClick={() => setActiveTab('global')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'global'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <Palette className={`w-3.5 h-3.5 ${activeTab === 'global' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>1. Global Appearance</span>
              </button>

              <button
                onClick={() => setActiveTab('animations')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'animations'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${activeTab === 'animations' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>2. 3D Animation Studio</span>
              </button>

              <button
                onClick={() => setActiveTab('layers')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'layers'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${activeTab === 'layers' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>3. Layer & Layout Editor</span>
              </button>

              <button
                onClick={() => setActiveTab('modules')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'modules'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <Box className={`w-3.5 h-3.5 ${activeTab === 'modules' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>4. Individual Modules ({ALL_APPLICATION_MODULES.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('presets')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'presets'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <Wand2 className={`w-3.5 h-3.5 ${activeTab === 'presets' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>5. 8 Theme Presets</span>
              </button>
            </div>
          </div>

          {/* TAB 1: GLOBAL APPEARANCE */}
          {activeTab === 'global' && (
            <div className="space-y-6">
              {/* Quick Theme Switcher Bar */}
              <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Quick Theme Switcher</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Toggle between high-contrast dark cyberpunk and royal midnight violet modes with one click</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setThemePreset('midnight-purple')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activePreset === 'midnight-purple'
                        ? 'bg-purple-600 text-white border-2 border-purple-400 shadow'
                        : 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-800'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span>Midnight Purple</span>
                  </button>
                  <button
                    onClick={() => setThemePreset('dark-neon')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                      activePreset === 'dark-neon'
                        ? 'bg-cyan-600 text-white border-2 border-cyan-400 shadow'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <Moon className="w-4 h-4 text-cyan-400" />
                    <span>Dark Neon</span>
                  </button>
                </div>
              </div>

              {/* Color Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. Background Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Dashboard Background Canvas</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 2. Card Background */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Card Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cardBackground.startsWith('#') ? cardBackground : '#0B1120'}
                      onChange={(e) => setCardBackground(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={cardBackground}
                      onChange={(e) => setCardBackground(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 3. Primary Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Primary Brand Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 4. Secondary Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Secondary Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 5. Accent Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Telemetry Highlight / Accent</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 6. Border Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Component Borders</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 7. Text Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Main Typography Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 8. Border Radius */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Card Border Radius</label>
                  <select
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg"
                  >
                    <option value="0px">Sharp Angles (0px)</option>
                    <option value="6px">Minimal (6px)</option>
                    <option value="12px">Standard (12px)</option>
                    <option value="16px">Smooth (16px)</option>
                    <option value="24px">Curved Pill (24px)</option>
                  </select>
                </div>

                {/* 9. Card Shadow */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Card Shadow & Elevation</label>
                  <select
                    value={cardShadow}
                    onChange={(e) => setCardShadow(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg"
                  >
                    <option value="none">Flat (No Shadow)</option>
                    <option value="subtle">Subtle Elevation</option>
                    <option value="medium">Medium Shadow</option>
                    <option value="deep">Deep Elevation</option>
                    <option value="neon-glow">Neon Ambient Glow</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D ANIMATION STUDIO */}
          {activeTab === 'animations' && (
            <div className="space-y-6">
              <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>3D Animation Engine Configuration</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Lightweight hardware-accelerated animations optimized for monitoring performance</p>
                  </div>

                  <button
                    onClick={() => setAnimationEnabled(!animationEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      animationEnabled
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {animationEnabled ? '3D Engine: ENABLED' : '3D Engine: OFF'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 3D Background Mode */}
                  <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">3D Animated Background Effect</label>
                    <select
                      value={background3DEffect}
                      onChange={(e) => setBackground3DEffect(e.target.value as any)}
                      className="w-full bg-[#0E1628] border border-slate-700 text-xs text-cyan-300 p-2.5 rounded-lg font-bold"
                    >
                      <option value="none">None (Solid / Static)</option>
                      <option value="particles">Floating Particles Mesh</option>
                      <option value="cyber-grid">Cyberpunk 3D Grid</option>
                      <option value="aurora-waves">Aurora Energy Waves</option>
                      <option value="floating-cubes">Floating 3D Cubes</option>
                    </select>
                  </div>

                  {/* Animation Speed */}
                  <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">Animation Velocity / Speed</label>
                    <select
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(e.target.value as any)}
                      className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2.5 rounded-lg"
                    >
                      <option value="slow">Slow & Ambient (0.5x)</option>
                      <option value="normal">Normal Telemetry (1.0x)</option>
                      <option value="fast">High-Velocity (1.5x)</option>
                    </select>
                  </div>

                  {/* Animation Intensity */}
                  <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">Visual Intensity</label>
                    <select
                      value={animationIntensity}
                      onChange={(e) => setAnimationIntensity(e.target.value as any)}
                      className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2.5 rounded-lg"
                    >
                      <option value="subtle">Subtle & Distraction-Free</option>
                      <option value="medium">Balanced Modern Glow</option>
                      <option value="vibrant">Vibrant Cyberpunk</option>
                    </select>
                  </div>
                </div>

                {/* 3D Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#070B14] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">3D Card Tilt on Hover</span>
                      <span className="text-[10px] text-slate-400">Card elevates in 3D perspective</span>
                    </div>
                    <button
                      onClick={() => setCardHover3D(!cardHover3D)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        cardHover3D ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {cardHover3D ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#070B14] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Glassmorphism Frosted Blur</span>
                      <span className="text-[10px] text-slate-400">Translucent backdrop blur</span>
                    </div>
                    <button
                      onClick={() => setGlassmorphism(!glassmorphism)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        glassmorphism ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {glassmorphism ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  <div className="p-3 bg-[#070B14] rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Animated Glowing Borders</span>
                      <span className="text-[10px] text-slate-400">Subtle breathing neon borders</span>
                    </div>
                    <button
                      onClick={() => setGlowingBorders(!glowingBorders)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        glowingBorders ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {glowingBorders ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LAYER & LAYOUT EDITOR */}
          {activeTab === 'layers' && (
            <div className="space-y-6">
              <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Visual Layer Customization System</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Control stacking layers, padding, visibility and depth across the application</p>
                </div>

                <div className="divide-y divide-slate-800 text-xs">
                  {/* Layer 1: Background Layer */}
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Layer 1: Dashboard Canvas Background</span>
                      <p className="text-[11px] text-slate-400">Underlying canvas surface and wallpaper positioning</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">z-index: 0</span>
                  </div>

                  {/* Layer 2: Header Layer */}
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Layer 2: Infrastructure Header</span>
                      <p className="text-[11px] text-slate-400">Top navigation, regional selectors and global actions</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">z-index: 30</span>
                  </div>

                  {/* Layer 3: Sidebar Layer */}
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Layer 3: Modular Navigation Sidebar</span>
                      <p className="text-[11px] text-slate-400">Vertical menu and account identity dock</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">z-index: 40</span>
                  </div>

                  {/* Layer 4: Main Content Layer */}
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Layer 4: Dashboard Content Grid</span>
                      <p className="text-[11px] text-slate-400">Summary cards, operations matrix, charts and instance tables</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">z-index: 10</span>
                  </div>

                  {/* Layer 5: Interactive Modals & PuTTY Shell */}
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">Layer 5: Modal & PuTTY Web Terminal Layer</span>
                      <p className="text-[11px] text-slate-400">Floating SSH terminal sessions and tool configuration wizards</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px]">z-index: 50</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INDIVIDUAL MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Individual Module Appearance Overrides</h3>
                  <p className="text-xs text-slate-400">Customize any module independently without altering other cards</p>
                </div>
                <button
                  onClick={() => openModuleCustomizer('aws-resources', 'AWS Resources Card')}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  + Open Module Customizer
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {ALL_APPLICATION_MODULES.map(mod => {
                  const customStyle = getModuleStyle(mod.id);
                  const hasCustom = !!customStyle.cardColor;

                  return (
                    <div
                      key={mod.id}
                      className="bg-[#0B1120] border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{mod.defaultIcon}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            hasCustom ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {hasCustom ? 'CUSTOM OVERRIDE' : 'GLOBAL DEFAULT'}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white">{mod.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{mod.description}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                        <button
                          type="button"
                          onClick={() => openModuleCustomizer(mod.id, mod.name)}
                          className="flex-1 py-1.5 rounded-lg bg-cyan-600/80 hover:bg-cyan-600 text-white font-bold text-xs transition cursor-pointer"
                        >
                          Edit Appearance
                        </button>
                        {hasCustom && (
                          <button
                            type="button"
                            onClick={() => resetModuleStyle(mod.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
                            title="Reset this module to global default"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: 8 READY-MADE THEME PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">8 Ready-Made Professional Theme Presets</h3>
                <p className="text-xs text-slate-400">Select any preset below to transform the entire platform immediately</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {THEME_PRESETS.map((preset, idx) => {
                  const isCurrent = activePreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setThemePreset(preset.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'border-cyan-400 bg-[#0E1628] shadow-xl shadow-cyan-500/20 scale-105'
                          : 'border-slate-800 bg-[#0B1120] hover:border-slate-700 hover:bg-[#0E1628]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preset #{idx + 1}</span>
                          <span
                            className="w-4 h-4 rounded-full border border-black/50"
                            style={{ backgroundColor: preset.accentColor }}
                          ></span>
                        </div>
                        <h4 className="text-sm font-black text-white">{preset.name}</h4>
                        <p className="text-xs text-slate-400 mt-1">{preset.description}</p>
                      </div>

                      {/* Color Palette Strip */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.canvasBg }} title="Canvas"></span>
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.cardBg }} title="Card"></span>
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.primaryColor }} title="Primary"></span>
                          <span className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: preset.accentColor }} title="Accent"></span>
                        </div>
                        <span className={`text-[11px] font-bold ${isCurrent ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {isCurrent ? 'ACTIVE ✓' : 'SELECT'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Individual Module Customizer Modal */}
      <ModuleStyleEditorModal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
        initialModuleId={selectedModuleForEdit}
      />

      {/* Import Theme Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0B1120] border border-cyan-500/40 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Import Custom Theme JSON</h3>
            <p className="text-xs text-slate-400">Paste your exported theme configuration JSON below to apply it immediately:</p>
            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Paste theme JSON here..."
              className="w-full bg-[#070B14] border border-slate-700 rounded-xl p-3 text-xs text-white font-mono"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md"
              >
                Import & Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
