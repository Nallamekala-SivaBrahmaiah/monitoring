'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Palette, Sliders, ChevronDown, Box, Layers, Wand2 } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export interface ModuleCustomizeButtonProps {
  moduleId: string;
  moduleName?: string;
  variant?: 'icon' | 'pill' | 'button' | 'menu-item' | 'dropdown';
  className?: string;
  title?: string;
  size?: 'sm' | 'md';
  label?: string;
}

export function ModuleCustomizeButton({
  moduleId,
  moduleName,
  variant = 'icon',
  className = '',
  title,
  size = 'sm',
  label,
}: ModuleCustomizeButtonProps) {
  const { openModuleCustomizer, getModuleStyle } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const currentStyle = getModuleStyle(moduleId);
  const hasCustomizations = !!(
    currentStyle.cardColor ||
    currentStyle.stylePreset ||
    currentStyle.gradient ||
    currentStyle.animation ||
    currentStyle.borderColor ||
    currentStyle.textColor
  );

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openModuleCustomizer(moduleId, moduleName);
  };

  const computedTitle =
    title || `Customize ${moduleName || moduleId} (Styles, 3D Animations & Layers)`;

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block z-30" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          title={computedTitle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            hasCustomizations
              ? 'bg-gradient-to-r from-purple-600/30 via-cyan-600/30 to-blue-600/30 text-cyan-200 border border-cyan-400/50 hover:border-cyan-300'
              : 'bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] hover:border-cyan-500/50'
          } ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{label || '3D Anime, Design & Layer'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-[#0B1120] border-2 border-cyan-500/50 rounded-2xl shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
            <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-400 border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>{moduleName || 'Module'} Studio</span>
              <span className="text-[9px] text-slate-500 font-mono">Select Option</span>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  openModuleCustomizer(moduleId, moduleName, 'animation');
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-cyan-500/15 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                  <Box className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">3D Anime Studio</div>
                  <div className="text-[10px] text-slate-400 truncate">Floating, tilt, rotating, particles & glow</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  openModuleCustomizer(moduleId, moduleName, 'design');
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-blue-500/15 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300">Design & Archetype</div>
                  <div className="text-[10px] text-slate-400 truncate">Glassmorphism, neon, 3D card archetypes</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  openModuleCustomizer(moduleId, moduleName, 'layers');
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-purple-500/15 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-purple-300">8-Layer Management</div>
                  <div className="text-[10px] text-slate-400 truncate">Background, container, header & content layers</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  openModuleCustomizer(moduleId, moduleName, 'color');
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-500/15 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">Colors & Gradients</div>
                  <div className="text-[10px] text-slate-400 truncate">Card colors, borders, text & neon accents</div>
                </div>
              </button>

              <div className="pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    openModuleCustomizer(moduleId, moduleName, 'style');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md cursor-pointer transition"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Open Full Customizer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={computedTitle}
        className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all duration-200 cursor-pointer ${
          hasCustomizations
            ? 'bg-gradient-to-r from-purple-500/25 to-cyan-500/25 hover:from-purple-500/40 hover:to-cyan-500/40 text-cyan-200 border border-cyan-400/50 shadow-sm shadow-cyan-500/20'
            : 'bg-[#0E1628]/90 hover:bg-[#162238] text-slate-300 hover:text-white border border-[#1E293B] hover:border-cyan-500/40 shadow-xs'
        } ${className}`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
        <span>Customize</span>
        {hasCustomizations && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5" />
        )}
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={computedTitle}
        className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
          hasCustomizations
            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/25 border border-cyan-400/40'
            : 'bg-[#111A2E] hover:bg-[#1A2642] text-slate-200 hover:text-white border border-[#1E293B] hover:border-cyan-500/50 shadow-xs'
        } ${className}`}
      >
        <Palette className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span>Customize Appearance</span>
      </button>
    );
  }

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={computedTitle}
        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-lg transition-colors cursor-pointer text-slate-300 hover:text-white hover:bg-cyan-500/15 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Edit Module Appearance</span>
        </div>
        {hasCustomizations && (
          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            Custom
          </span>
        )}
      </button>
    );
  }

  // Default: 'icon'
  return (
    <button
      type="button"
      onClick={handleClick}
      title={computedTitle}
      className={`group relative p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
        hasCustomizations
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
          : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/15 border border-transparent hover:border-cyan-500/30'
      } ${size === 'md' ? 'p-2' : 'p-1.5'} ${className}`}
    >
      <Sparkles
        className={`${
          size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
        } group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300`}
      />
      {hasCustomizations && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#0B1120] animate-pulse" />
      )}
    </button>
  );
}
