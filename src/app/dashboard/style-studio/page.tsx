'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  Image as ImageIcon,
  UploadCloud,
  FolderOpen,
  Trash2,
  Link as LinkIcon,
  Loader2,
} from 'lucide-react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import {
  useTheme,
  THEME_PRESETS,
  WALLPAPER_OPTIONS,
  COLOR_CIRCLES,
  CustomWallpaper,
  ColorCircleOption,
  WallpaperOption,
} from '@/context/ThemeContext';
import { ModuleStyleEditorModal, ALL_APPLICATION_MODULES } from '@/components/dashboard/style-studio/ModuleStyleEditorModal';

export type StudioTab = 'global' | 'appearance' | 'animations' | 'layers' | 'modules' | 'presets';

function HomeStyleStudioContent() {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get('tab');

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<StudioTab>(
    queryTab === 'appearance' || queryTab === 'theme' || queryTab === 'themes'
      ? 'appearance'
      : (queryTab as StudioTab) || 'global'
  );
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedModuleForEdit, setSelectedModuleForEdit] = useState<string>('aws-resources');
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Appearance & Wallpaper upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Wallpapers & Background Images
    backgroundImage,
    setBackgroundImage,
    backgroundOpacity,
    setBackgroundOpacity,
    backgroundBlur,
    setBackgroundBlur,
    customWallpapers,
    uploadCustomWallpaper,
    addCustomWallpaperUrl,
    deleteCustomWallpaper,
    applyColorCircle,
    // DB & File
    saveThemeToDatabase,
    exportThemeJSON,
    importThemeJSON,
    resetTheme,
    resetEntireTheme,
  } = useTheme();

  // Keep activeTab in sync with query param changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'appearance' || tab === 'theme' || tab === 'themes') {
      setActiveTab('appearance');
    } else if (tab === 'global' || tab === 'animations' || tab === 'layers' || tab === 'modules' || tab === 'presets') {
      setActiveTab(tab as StudioTab);
    }
  }, [searchParams]);

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
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await uploadCustomWallpaper(file);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2400);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    try {
      new URL(urlInput.trim());
      addCustomWallpaperUrl(urlInput.trim(), 'Custom Image');
      setUrlInput('');
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2400);
    } catch {
      setUploadError('Please enter a valid image URL starting with http:// or https://');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col transition-colors duration-300">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        <Header onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        <main className="p-4 lg:p-7 space-y-6 max-w-7xl mx-auto w-full">
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
                    Comprehensive design suite: customize global platform appearance, backgrounds & wallpapers, 3D animated visual engines, layout layers, and individual module styles with live instant preview.
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
                onClick={() => setActiveTab('appearance')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border-b-2 whitespace-nowrap cursor-pointer ${
                  activeTab === 'appearance'
                    ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                }`}
              >
                <ImageIcon className={`w-3.5 h-3.5 ${activeTab === 'appearance' ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                <span>2. Appearance & Themes</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                  Wallpapers & Colors
                </span>
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
                <span>3. 3D Animation Studio</span>
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
                <span>4. Layer & Layout Editor</span>
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
                <span>5. Individual Modules ({ALL_APPLICATION_MODULES.length})</span>
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
                <span>6. 8 Theme Presets</span>
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
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
                  <label className="text-xs font-semibold text-slate-300 block">Surface Card Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={cardBackground.startsWith('#') ? cardBackground : '#0D1526'}
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

                {/* 3. Sidebar Background */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Sidebar Navigation Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={sidebarBackground.startsWith('#') ? sidebarBackground : '#070C18'}
                      onChange={(e) => setSidebarBackground(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={sidebarBackground}
                      onChange={(e) => setSidebarBackground(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 4. Header Background */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Header Bar Background</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={headerBackground.startsWith('#') ? headerBackground : '#090F1E'}
                      onChange={(e) => setHeaderBackground(e.target.value)}
                      className="w-10 h-10 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={headerBackground}
                      onChange={(e) => setHeaderBackground(e.target.value)}
                      className="flex-1 bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* 5. Primary Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Primary Accent Color</label>
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

                {/* 6. Accent Color */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Neon Highlight & Accents</label>
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

                {/* 7. Border Color */}
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

                {/* 8. Text Color */}
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

                {/* 9. Border Radius */}
                <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">Card Border Radius</label>
                  <select
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-700 text-xs text-white p-2.5 rounded-lg"
                  >
                    <option value="none">Sharp / Rectangular (0px)</option>
                    <option value="sm">Slightly Rounded (4px)</option>
                    <option value="md">Standard Round (8px)</option>
                    <option value="lg">Modern Rounded (12px)</option>
                    <option value="xl">Pill / Heavy Round (16px)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEMES (WALLPAPERS, COLOR CIRCLES & BACKGROUNDS) */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <span>Appearance, Wallpapers & Color Circles</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        INTEGRATED STUDIO
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select circular background color bubbles, upload custom high-res wallpaper images, choose enterprise cloud datacenter backgrounds, and fine-tune opacity and blur.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {backgroundImage && (
                    <button
                      type="button"
                      onClick={() => setBackgroundImage('')}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-[#1E293B] hover:border-rose-800/40 rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Active Wallpaper</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={resetTheme}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Theme</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Background Color Circles */}
              <section className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-cyan-400" />
                      <span>1. Background Color Circles</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select from curated circular color models or choose any custom hex value to tint the platform canvas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-[#070B14] border border-[#1E293B] px-3 py-1.5 rounded-xl">
                    <span className="text-[11px] text-slate-400">Selected Canvas:</span>
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0"
                      style={{ backgroundColor }}
                    />
                    <span className="text-xs font-mono font-bold text-cyan-400">{backgroundColor}</span>
                  </div>
                </div>

                {/* Circular Color Palette Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-10 gap-3 pt-1">
                  {COLOR_CIRCLES.map((c: ColorCircleOption) => {
                    const isSelected = backgroundColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          applyColorCircle(c);
                          setSaveToast(true);
                          setTimeout(() => setSaveToast(false), 2400);
                        }}
                        title={`${c.name} (${c.hex})`}
                        className={`flex flex-col items-center gap-2 p-2.5 rounded-xl transition cursor-pointer group ${
                          isSelected
                            ? 'bg-cyan-600/15 border border-cyan-500/50 shadow-md ring-1 ring-cyan-500/40'
                            : 'border border-transparent hover:border-[#1E293B] hover:bg-[#070B14]'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-full transition-all flex items-center justify-center shadow-lg relative group-hover:scale-110 ${
                            isSelected
                              ? 'ring-4 ring-cyan-500 ring-offset-2 ring-offset-[#0B1120] scale-105'
                              : 'border-2 border-white/20 group-hover:border-white/50'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        >
                          {isSelected && (
                            <Check
                              className={`w-5 h-5 ${c.isDark ? 'text-white' : 'text-slate-900'} drop-shadow-md`}
                            />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-200 text-center truncate w-full group-hover:text-white transition">
                          {c.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">{c.hex}</span>
                      </button>
                    );
                  })}

                  {/* Custom Color Wheel Circle */}
                  <label
                    title="Choose Any Custom Color"
                    className="flex flex-col items-center gap-2 p-2.5 rounded-xl border border-transparent hover:border-[#1E293B] hover:bg-[#070B14] transition cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-blue-500 to-purple-500 p-0.5 shadow-lg group-hover:scale-110 transition flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-[#0D131F] flex items-center justify-center font-bold text-white text-lg">
                        +
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-cyan-400 text-center truncate w-full group-hover:text-cyan-300">
                      Custom
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Pick any</span>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => {
                        setBackgroundColor(e.target.value);
                        setSaveToast(true);
                        setTimeout(() => setSaveToast(false), 2400);
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </section>

              {/* Section 2: Upload Custom Wallpaper */}
              <section className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-cyan-400" />
                      <span>2. Upload Custom Wallpaper Image</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Upload an image file from your device or paste a web URL to display behind your dashboard cards.
                    </p>
                  </div>
                </div>

                {/* Drag & Drop Area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                    isDragOver
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-[#1E293B] hover:border-cyan-500/60 bg-[#070B14]/60 hover:bg-[#070B14]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2 py-3 text-cyan-400">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-xs font-semibold">Uploading & applying wallpaper...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-cyan-600/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-white">
                          Click to choose an image file, or drag and drop here
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Supports JPG, PNG, WebP, SVG, and GIF up to 15MB
                        </p>
                      </div>
                      <span className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 transition">
                        Browse Computer Files
                      </span>
                    </>
                  )}
                </div>

                {/* Error Message */}
                {uploadError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                    <span>{uploadError}</span>
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="text-rose-400 hover:text-white font-bold ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Paste URL Option */}
                <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                  <div className="relative flex-1">
                    <LinkIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="Or paste an image web link (e.g. https://images.unsplash.com/...)"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-[#070B14] border border-[#1E293B] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-xl transition cursor-pointer shrink-0"
                  >
                    Apply Image Link
                  </button>
                </form>

                {/* Uploaded Custom Wallpapers Strip */}
                {customWallpapers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#1E293B]/60">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Your Uploaded Wallpapers ({customWallpapers.length})
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {customWallpapers.map((wp) => {
                        const isSelected = backgroundImage === wp.url;

                        return (
                          <div
                            key={wp.id}
                            onClick={() => setBackgroundImage(wp.url)}
                            className={`relative rounded-xl border p-1 text-left transition overflow-hidden group cursor-pointer ${
                              isSelected
                                ? 'border-cyan-500 ring-2 ring-cyan-500/50 bg-cyan-500/10'
                                : 'border-[#1E293B] bg-[#070B14] hover:border-slate-500'
                            }`}
                          >
                            <div
                              className="w-full h-20 rounded-lg bg-cover bg-center relative overflow-hidden bg-[#070B14]"
                              style={{ backgroundImage: `url("${wp.url}")` }}
                            >
                              <div className="absolute inset-0 bg-black/25 group-hover:bg-black/10 transition-colors" />

                              {isSelected && (
                                <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[9px] font-black flex items-center gap-1 shadow">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Active</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCustomWallpaper(wp.id);
                                }}
                                title="Delete custom wallpaper"
                                className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md bg-black/70 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition shadow cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="px-1.5 py-1">
                              <div className="text-[10px] font-bold text-slate-200 truncate">{wp.title}</div>
                              <div className="text-[9px] text-slate-500">{wp.date}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* Section 3: Built-In Cloud & Datacenter Wallpapers Gallery */}
              <section className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-400" />
                      <span>3. Built-In Cloud & Datacenter Wallpapers</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select a high-tech datacenter or cloud mesh background to render behind your platform.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WALLPAPER_OPTIONS.map((wp: WallpaperOption) => {
                    const isSelected = backgroundImage === wp.url;
                    const isNone = wp.id === 'none';

                    return (
                      <div
                        key={wp.id}
                        onClick={() => setBackgroundImage(wp.url)}
                        className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group shadow-lg flex flex-col justify-between ${
                          isSelected
                            ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-purple-500/20 bg-purple-500/10'
                            : 'border-[#1E293B] bg-[#070B14] hover:border-slate-500'
                        }`}
                      >
                        <div
                          className="w-full h-36 bg-cover bg-center relative flex items-center justify-center overflow-hidden bg-[#070B14]"
                          style={{
                            backgroundImage: isNone ? 'none' : `url("${wp.url}")`,
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

              {/* Section 4: Fine-Tuning Controls (Opacity & Blur) */}
              <section className="bg-[#0B1120] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-emerald-400" />
                      <span>4. Wallpaper Fine-Tuning</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fine-tune wallpaper opacity and blur to maintain optimal card contrast and text legibility.
                    </p>
                  </div>

                  {!backgroundImage && (
                    <span className="text-[10px] font-mono text-slate-500 italic">
                      (Select a wallpaper above to see live effect)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Opacity Slider */}
                  <div className="space-y-2 bg-[#070B14] p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Wallpaper Opacity</span>
                      <span className="font-mono font-bold text-cyan-400 text-sm">
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
                      className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>5% (Subtle)</span>
                      <span>25% (Balanced)</span>
                      <span>50% (Vibrant)</span>
                    </div>
                  </div>

                  {/* Blur Slider */}
                  <div className="space-y-2 bg-[#070B14] p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Wallpaper Blur Effect</span>
                      <span className="font-mono font-bold text-purple-400 text-sm">
                        {backgroundBlur}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="16"
                      step="1"
                      value={backgroundBlur}
                      onChange={(e) => setBackgroundBlur(parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500">
                      <span>0px (Sharp)</span>
                      <span>8px (Soft Focus)</span>
                      <span>16px (Deep Frost)</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: 3D ANIMATION STUDIO */}
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
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                      <option value="particles">Floating Cyber Particles</option>
                      <option value="grid-waves">3D Neon Horizon Grid</option>
                      <option value="floating-cubes">Rotating 3D Wireframe Cubes</option>
                      <option value="digital-rain">Matrix Code Stream</option>
                    </select>
                  </div>

                  {/* Animation Speed */}
                  <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">Animation Velocity / Speed</label>
                    <select
                      value={animationSpeed}
                      onChange={(e) => setAnimationSpeed(e.target.value as any)}
                      className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-semibold"
                    >
                      <option value="slow">Slow & Ambient (0.5x)</option>
                      <option value="normal">Standard Operational (1.0x)</option>
                      <option value="fast">High Velocity Stream (2.0x)</option>
                    </select>
                  </div>

                  {/* 3D Intensity */}
                  <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-300 block">Visual Intensity Level</label>
                    <select
                      value={animationIntensity}
                      onChange={(e) => setAnimationIntensity(e.target.value as any)}
                      className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2.5 rounded-lg font-semibold"
                    >
                      <option value="subtle">Subtle (Discreet & Calm)</option>
                      <option value="moderate">Moderate (Standard Interactive)</option>
                      <option value="vibrant">Vibrant (High Glow & High FX)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070B14] border border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">Card Hover 3D Tilt</span>
                    <input
                      type="checkbox"
                      checked={cardHover3D}
                      onChange={(e) => setCardHover3D(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070B14] border border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">Glassmorphism Frost Effect</span>
                    <input
                      type="checkbox"
                      checked={glassmorphism}
                      onChange={(e) => setGlassmorphism(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#070B14] border border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">Glowing Neon Card Borders</span>
                    <input
                      type="checkbox"
                      checked={glowingBorders}
                      onChange={(e) => setGlowingBorders(e.target.checked)}
                      className="w-4 h-4 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LAYERS & LAYOUT EDITOR */}
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

          {/* TAB 5: INDIVIDUAL MODULES */}
          {activeTab === 'modules' && (
            <div className="space-y-6">
              <div className="bg-[#0B1120] border border-cyan-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Box className="w-4 h-4 text-cyan-400" />
                      <span>Individual Module Styles ({ALL_APPLICATION_MODULES.length} Registered Modules)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customize specific styling, unique background glows, and borders per individual module</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {ALL_APPLICATION_MODULES.map((m) => {
                    const customStyle = getModuleStyle(m.id);
                    const hasOverrides = Object.keys(customStyle).length > 0;

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                          hasOverrides
                            ? 'bg-[#0E172E] border-cyan-500/50 shadow-md shadow-cyan-500/10'
                            : 'bg-[#070B14] border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-lg">{m.defaultIcon}</span>
                            {hasOverrides && (
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                                CUSTOMIZED
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-white">{m.name}</h4>
                          <p className="text-[11px] text-slate-400 leading-snug">{m.description}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                          <button
                            onClick={() => {
                              setSelectedModuleForEdit(m.id);
                              setIsModuleModalOpen(true);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition text-center cursor-pointer shadow-sm"
                          >
                            Customize Style
                          </button>
                          {hasOverrides && (
                            <button
                              onClick={() => resetModuleStyle(m.id)}
                              className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
                              title="Reset to default theme"
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
            </div>
          )}

          {/* TAB 6: 8 THEME PRESETS */}
          {activeTab === 'presets' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Curated Platform Theme Presets</h3>
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
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold shadow-md cursor-pointer"
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

export default function HomeStyleStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#070C18] text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <HomeStyleStudioContent />
    </Suspense>
  );
}
