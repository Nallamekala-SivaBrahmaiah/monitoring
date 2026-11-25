'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Palette,
  Check,
  RotateCcw,
  ExternalLink,
  X,
  UploadCloud,
  Loader2,
  Trash2,
} from 'lucide-react';
import {
  useTheme,
  THEME_PRESETS,
  WALLPAPER_OPTIONS,
  COLOR_CIRCLES,
  ColorCircleOption,
  WallpaperOption,
} from '@/context/ThemeContext';

export default function HeaderThemeSwitcher() {
  const {
    activePreset,
    backgroundColor,
    backgroundImage,
    backgroundOpacity,
    customWallpapers,
    setThemePreset,
    setBackgroundColor,
    setBackgroundImage,
    setBackgroundOpacity,
    uploadCustomWallpaper,
    deleteCustomWallpaper,
    applyColorCircle,
    resetTheme,
  } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickFileRef = useRef<HTMLInputElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await uploadCustomWallpaper(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Top Header Button (Palette Icon + Active Color Indicator) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Background Color, Wallpaper & Theme"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-sm ${
          isOpen
            ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 shadow-blue-500/10'
            : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border-[#1E293B] hover:border-slate-600'
        }`}
      >
        <Palette className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">Theme</span>
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0"
          style={{ backgroundColor }}
        />
      </button>

      {/* Floating Popover / Dropdown Menu at Dashboard Top */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0B1120] border border-[#1E293B] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Palette className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">Theme & Background</h3>
                <p className="text-[10px] text-slate-400">Live background color & wallpaper switcher</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetTheme}
                title="Reset to default theme"
                className="p-1 text-slate-400 hover:text-white hover:bg-[#18233C] rounded-lg transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-[#18233C] rounded-lg transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 1: Background Color Circles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                1. Background Colors (Circles)
              </span>
              <span className="text-[9px] font-mono text-sky-400 font-bold">{backgroundColor}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_CIRCLES.map((c: ColorCircleOption) => {
                const isSelected = backgroundColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyColorCircle(c)}
                    title={`${c.name} (${c.hex})`}
                    className={`w-7 h-7 rounded-full transition-all cursor-pointer flex items-center justify-center shadow-md relative group hover:scale-110 ${
                      isSelected
                        ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0B1120] scale-110 shadow-lg'
                        : 'border border-white/20 hover:border-white/60'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 ${c.isDark ? 'text-white' : 'text-slate-900'} drop-shadow`}
                      />
                    )}
                  </button>
                );
              })}

              {/* Custom Color Circle Picker Button */}
              <label
                title="Pick Custom Color Circle"
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-blue-500 to-purple-500 p-0.5 cursor-pointer hover:scale-110 transition flex items-center justify-center shadow-md relative"
              >
                <div className="w-full h-full rounded-full bg-[#0B1120] flex items-center justify-center text-[11px] font-bold text-white">
                  +
                </div>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Section 2: Background Wallpapers & Upload Option */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2. Wallpaper Images
              </span>

              {/* Quick Upload Button */}
              <button
                type="button"
                onClick={() => quickFileRef.current?.click()}
                disabled={isUploading}
                className="text-[10px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3 h-3" />
                    <span>Upload Image</span>
                  </>
                )}
              </button>
              <input
                ref={quickFileRef}
                type="file"
                accept="image/*"
                onChange={handleQuickUpload}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
              {/* Custom Uploaded Wallpapers (if any) */}
              {customWallpapers.map((wp) => {
                const isSelected = backgroundImage === wp.url;
                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setBackgroundImage(wp.url)}
                    className={`relative rounded-xl border p-1 text-left transition overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-sky-500 ring-2 ring-sky-500/50'
                        : 'border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    <div
                      className="w-full h-12 rounded-lg bg-cover bg-center flex items-center justify-center relative overflow-hidden bg-[#070B14]"
                      style={{ backgroundImage: `url("${wp.url}")` }}
                    >
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="text-[9px] font-bold text-sky-300 truncate mt-1 px-1">
                      {wp.title}
                    </div>
                  </button>
                );
              })}

              {/* Built-in Wallpapers */}
              {WALLPAPER_OPTIONS.map((wp: WallpaperOption) => {
                const isSelected = backgroundImage === wp.url;
                const isNone = wp.id === 'none';

                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setBackgroundImage(wp.url)}
                    className={`relative rounded-xl border p-1 text-left transition overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    <div
                      className="w-full h-12 rounded-lg bg-cover bg-center flex items-center justify-center relative overflow-hidden bg-[#070B14]"
                      style={{
                        backgroundImage: isNone ? 'none' : `url("${wp.url}")`,
                      }}
                    >
                      {isNone ? (
                        <span className="text-[9px] font-semibold text-slate-400">Solid Color</span>
                      ) : (
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      )}

                      {isSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="text-[9px] font-bold text-slate-300 truncate mt-1 px-1">
                      {wp.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Wallpaper Opacity Slider (Only if wallpaper is active) */}
          {backgroundImage && backgroundImage.trim() !== '' && (
            <div className="space-y-1.5 pt-1 border-t border-[#1E293B]/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Wallpaper Intensity
                </span>
                <span className="text-sky-400 font-mono font-bold text-xs">
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
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          )}

          {/* Footer Link to Dedicated Module */}
          <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Auto-saved to your browser</span>
            <Link
              href="/dashboard/style-studio?tab=appearance"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition inline-flex items-center gap-1 group"
            >
              <span>Full Appearance & Themes Studio</span>
              <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export { HeaderThemeSwitcher };
