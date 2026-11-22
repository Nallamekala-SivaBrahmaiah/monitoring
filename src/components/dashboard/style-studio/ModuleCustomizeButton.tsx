'use client';

import React from 'react';
import { Sparkles, Palette, Sliders } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export interface ModuleCustomizeButtonProps {
  moduleId: string;
  moduleName?: string;
  variant?: 'icon' | 'pill' | 'button' | 'menu-item';
  className?: string;
  title?: string;
  size?: 'sm' | 'md';
}

export function ModuleCustomizeButton({
  moduleId,
  moduleName,
  variant = 'icon',
  className = '',
  title,
  size = 'sm',
}: ModuleCustomizeButtonProps) {
  const { openModuleCustomizer, getModuleStyle } = useTheme();

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
