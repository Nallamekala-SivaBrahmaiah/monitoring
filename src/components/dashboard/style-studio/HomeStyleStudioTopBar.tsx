'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Palette,
  Layers,
  Sliders,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Save,
  Download,
  Upload,
  Eye,
  Wand2,
  Box,
} from 'lucide-react';
import { useTheme, THEME_PRESETS } from '@/context/ThemeContext';
import { ModuleStyleEditorModal } from './ModuleStyleEditorModal';

export function HomeStyleStudioTopBar() {
  const {
    activePreset,
    setThemePreset,
    animationEnabled,
    setAnimationEnabled,
    glassmorphism,
    setGlassmorphism,
    cardHover3D,
    setCardHover3D,
    background3DEffect,
    setBackground3DEffect,
    saveThemeToDatabase,
    resetTheme,
    backgroundColor,
    cardBackground,
    borderColor,
    accentColor,
    setBackgroundColor,
    setCardBackground,
    setBorderColor,
    openModuleCustomizer,
  } = useTheme();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isThemeSelectOpen, setIsThemeSelectOpen] = useState<boolean>(false);
  const themeDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeSelectOpen(false);
      }
    }
    if (isThemeSelectOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeSelectOpen]);

  const activePresetObj = THEME_PRESETS.find((p) => p.id === activePreset) || THEME_PRESETS[0];

  const handleSaveTheme = async () => {
    const ok = await saveThemeToDatabase('Active Custom Theme');
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2200);
    }
  };

  return (
    <div className="bg-[#0B1120] border-2 border-cyan-500/40 rounded-2xl shadow-2xl relative z-30 transition-all duration-300">
      {/* Background Holographic Shimmer Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse pointer-events-none rounded-t-2xl overflow-hidden"></div>

      {/* Main Bar (Always Visible at the Very Top of Dashboard) */}
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Branding & Studio Identity */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/15 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Home Style Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30">
                LIVE UI CUSTOMIZER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Transform entire dashboard colors, 3D animations, component layers, or customize individual modules
            </p>
          </div>
        </div>

        {/* Center: Theme Selector Dropdown Option (Matches User Design) */}
        <div className="flex-1 min-w-0 flex items-center justify-start lg:justify-center gap-3">
          <div className="relative shrink-0" ref={themeDropdownRef}>
            {/* Dropdown Button exactly matching user screenshot */}
            <button
              type="button"
              onClick={() => setIsThemeSelectOpen(!isThemeSelectOpen)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30 border-2 border-cyan-400 cursor-pointer"
              title="Click to select dashboard theme option"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/50"
                style={{ backgroundColor: activePresetObj.accentColor }}
              />
              <span className="tracking-wide">{activePresetObj.name}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isThemeSelectOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Options Popover */}
            {isThemeSelectOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-[#0B1120] border-2 border-cyan-500/50 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
                <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>Select Theme Option</span>
                  <span className="text-slate-500 font-mono text-[9px]">{THEME_PRESETS.length} Options</span>
                </div>
                <div className="space-y-1">
                  {THEME_PRESETS.map((preset) => {
                    const isSel = activePreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setThemePreset(preset.id);
                          setIsThemeSelectOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                          isSel
                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400'
                            : 'bg-[#0E1628]/80 hover:bg-[#18233C] text-slate-200 hover:text-white border border-transparent hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-black/40 shadow-sm"
                            style={{ backgroundColor: preset.accentColor }}
                          />
                          <div>
                            <div className="font-bold leading-tight">{preset.name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[170px]">{preset.description}</div>
                          </div>
                        </div>
                        {isSel && <Check className="w-4 h-4 text-white shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Selection Pills alongside for 1-click preview */}
          <div className="hidden xl:flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {THEME_PRESETS.map((preset) => {
              const isActive = activePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setThemePreset(preset.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600/25 text-cyan-300 border border-cyan-500/50'
                      : 'bg-[#0E1628]/60 hover:bg-[#111A2E] text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title={preset.description}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: preset.accentColor }}
                  />
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Quick Actions & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          {/* Customize Individual Modules */}
          <button
            type="button"
            onClick={() => openModuleCustomizer('aws-resources', 'AWS Resources')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs transition cursor-pointer shadow-sm"
            title="Edit appearance of any specific dashboard module"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Customize Modules</span>
          </button>

          {/* Save Theme Button */}
          <button
            type="button"
            onClick={handleSaveTheme}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer shadow-sm"
            title="Save custom theme in database"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveSuccess ? 'Saved ✓' : 'Save Theme'}</span>
          </button>

          {/* Full Studio Link */}
          <Link
            href="/dashboard/style-studio"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Full Studio</span>
          </Link>

          {/* Expand / Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700"
            title={isExpanded ? 'Collapse Quick Studio' : 'Expand Quick Studio Controls'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Quick Customization Deck */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 p-4 sm:p-5 bg-[#070B14]/80 space-y-4 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Column 1: Quick Canvas & Card Colors */}
            <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Quick Global Colors
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Canvas Bg:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-400">{backgroundColor}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Card Bg:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardBackground.startsWith('#') ? cardBackground : '#0B1120'}
                    onChange={(e) => setCardBackground(e.target.value)}
                    className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-400">{cardBackground.substring(0, 9)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Border Color:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <span className="font-mono text-[11px] text-slate-400">{borderColor}</span>
                </div>
              </div>
            </div>

            {/* Column 2: 3D Animation Effects */}
            <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                3D Animation Engine
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">3D Background Effect:</span>
                <select
                  value={background3DEffect}
                  onChange={(e) => setBackground3DEffect(e.target.value as any)}
                  className="bg-[#070B14] border border-slate-700 text-xs text-cyan-300 rounded-lg p-1"
                >
                  <option value="none">Disabled</option>
                  <option value="particles">Particles Mesh</option>
                  <option value="cyber-grid">Cyber Grid</option>
                  <option value="aurora-waves">Aurora Waves</option>
                  <option value="floating-cubes">Floating Cubes</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">3D Card Tilt on Hover:</span>
                <button
                  type="button"
                  onClick={() => setCardHover3D(!cardHover3D)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                    cardHover3D ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cardHover3D ? 'ENABLED' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Glassmorphism Blur:</span>
                <button
                  type="button"
                  onClick={() => setGlassmorphism(!glassmorphism)}
                  className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                    glassmorphism ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {glassmorphism ? 'ACTIVE' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Column 3: White to Dark Switcher & Presets */}
            <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Instant Theme Flip
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThemePreset('modern-white')}
                  className="p-2 rounded-lg bg-white text-slate-900 font-bold text-xs text-center border border-slate-300 shadow hover:bg-slate-100 transition"
                >
                  ☀️ Modern White
                </button>
                <button
                  type="button"
                  onClick={() => setThemePreset('dark-neon')}
                  className="p-2 rounded-lg bg-[#050811] text-cyan-400 font-bold text-xs text-center border border-cyan-500/40 shadow hover:bg-[#0B1120] transition"
                >
                  🌙 Dark Neon
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThemePreset('ocean-blue')}
                  className="p-2 rounded-lg bg-[#081026] text-blue-400 font-bold text-xs text-center border border-blue-500/40 shadow hover:bg-[#0F1E44] transition"
                >
                  🌊 Ocean Blue
                </button>
                <button
                  type="button"
                  onClick={() => setThemePreset('glassmorphism')}
                  className="p-2 rounded-lg bg-[#0A0F1D] text-purple-400 font-bold text-xs text-center border border-purple-500/40 shadow hover:bg-[#1A1433] transition"
                >
                  ✨ Glassmorphism
                </button>
              </div>
            </div>

            {/* Column 4: Reset & Full Studio Navigation */}
            <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                  Customization Workspace
                </span>
                <p className="text-[11px] text-slate-400">
                  Open the full studio to access gradient generators, wallpaper uploads, layer visibility & module overrides.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetTheme}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-700"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Default</span>
                </button>
                <Link
                  href="/dashboard/style-studio"
                  className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold text-center transition"
                >
                  Open Studio →
                </Link>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Individual Module Appearance Modal */}
      <ModuleStyleEditorModal
        isOpen={isModuleModalOpen}
        onClose={() => setIsModuleModalOpen(false)}
      />
    </div>
  );
}
