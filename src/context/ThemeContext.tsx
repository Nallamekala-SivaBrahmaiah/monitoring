'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  canvasBg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  isDark: boolean;
}

export interface WallpaperOption {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'obsidian',
    name: 'Midnight Obsidian',
    description: 'OLED Pure Black high-contrast developer theme with zero glare',
    canvasBg: '#030712',
    cardBg: '#0D131F',
    borderColor: '#1E293B',
    accentColor: '#2563EB',
    textColor: '#F8FAFC',
    isDark: true,
  },
  {
    id: 'sapphire',
    name: 'Cyber Sapphire',
    description: 'Deep oceanic cloud navy blue matching AWS & Azure palettes',
    canvasBg: '#081026',
    cardBg: '#0F1E44',
    borderColor: '#1E3A8A',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    isDark: true,
  },
  {
    id: 'slate',
    name: 'Slate Titanium',
    description: 'Professional 24/7 NOC monitoring graphite neutral theme',
    canvasBg: '#0F172A',
    cardBg: '#1E293B',
    borderColor: '#334155',
    accentColor: '#3B82F6',
    textColor: '#F8FAFC',
    isDark: true,
  },
  {
    id: 'violet',
    name: 'Midnight Violet',
    description: 'Futuristic cyberpunk console with ambient indigo undertones',
    canvasBg: '#0D0B18',
    cardBg: '#1A1433',
    borderColor: '#31265B',
    accentColor: '#A855F7',
    textColor: '#FAF5FF',
    isDark: true,
  },
  {
    id: 'emerald',
    name: 'Cyber Emerald',
    description: 'Deep matrix pine dark mode with glowing green telemetry accents',
    canvasBg: '#04130E',
    cardBg: '#0A2117',
    borderColor: '#154D37',
    accentColor: '#10B981',
    textColor: '#F0FDF4',
    isDark: true,
  },
  {
    id: 'light',
    name: 'Daylight Enterprise',
    description: 'Clean daylight white and slate theme for bright conference rooms',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    borderColor: '#E2E8F0',
    accentColor: '#2563EB',
    textColor: '#0F172A',
    isDark: false,
  },
];

export const WALLPAPER_OPTIONS: WallpaperOption[] = [
  {
    id: 'none',
    title: 'Solid Color (No Image)',
    description: 'Clean, distraction-free solid background color',
    url: '',
    category: 'Minimal',
  },
  {
    id: 'datacenter',
    title: 'Modern Datacenter',
    description: 'High-tech server racks with ambient blue LED illumination',
    url: '/images/bg-option-1-modern-datacenter.jpg',
    category: 'Infrastructure',
  },
  {
    id: 'network',
    title: 'Global Cloud Network',
    description: 'Interconnected global cloud nodes and fiber mesh routes',
    url: '/images/bg-option-2-global-cloud-network.jpg',
    category: 'Network',
  },
  {
    id: 'aurora',
    title: 'Cloud Aurora Minimal',
    description: 'Soft glowing atmospheric aurora ribbons in cyan and purple',
    url: '/images/bg-option-3-cloud-aurora-minimal.jpg',
    category: 'Ambient',
  },
  {
    id: 'isometric',
    title: 'Cyber Isometric Cloud',
    description: 'Futuristic 3D isometric cloud computing architecture grid',
    url: '/images/bg-clean-isometric-cloud.jpg',
    category: 'Isometric',
  },
  {
    id: 'nexus',
    title: 'Cyber Cloud Nexus',
    description: 'High-energy cyber cloud core with glowing telemetry circuits',
    url: '/images/option-2-cyber-cloud-nexus.jpg',
    category: 'Cyberpunk',
  },
  {
    id: 'fusion',
    title: 'Dual Cloud Fusion',
    description: 'Hybrid AWS & Azure infrastructure interconnected mesh',
    url: '/images/option-1-dual-cloud-fusion.jpg',
    category: 'Multi-Cloud',
  },
  {
    id: 'multi-grid',
    title: 'Global Multi-Cloud Grid',
    description: 'Worldwide edge locations connected across orbital satellites',
    url: '/images/option-3-global-multi-cloud-grid.jpg',
    category: 'Global Grid',
  },
  {
    id: 'datacenter-clean',
    title: 'Enterprise Server Hall',
    description: 'Sprawling high-density compute corridor with cold aisle cooling',
    url: '/images/bg-clean-datacenter.jpg',
    category: 'Enterprise',
  },
  {
    id: 'aurora-ribbons',
    title: 'Aurora Telemetry Ribbons',
    description: 'Vibrant neon waves representing live high-velocity streaming data',
    url: '/images/bg-clean-aurora-ribbons.jpg',
    category: 'Abstract',
  },
];

export interface CustomWallpaper {
  id: string;
  title: string;
  url: string;
  date: string;
}

interface ThemeContextType {
  activePreset: string;
  backgroundColor: string;
  cardBackground: string;
  borderColor: string;
  backgroundImage: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  customWallpapers: CustomWallpaper[];
  setThemePreset: (presetId: string) => void;
  setBackgroundColor: (color: string) => void;
  setCardBackground: (color: string) => void;
  setBorderColor: (color: string) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setBackgroundBlur: (blur: number) => void;
  uploadCustomWallpaper: (file: File) => Promise<string>;
  addCustomWallpaperUrl: (url: string, title?: string) => void;
  deleteCustomWallpaper: (id: string) => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mcm_theme_config_v2';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [activePreset, setActivePreset] = useState<string>('obsidian');
  const [backgroundColor, setBackgroundColorState] = useState<string>('#030712');
  const [cardBackground, setCardBackgroundState] = useState<string>('#0D131F');
  const [borderColor, setBorderColorState] = useState<string>('#1E293B');
  const [backgroundImage, setBackgroundImageState] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacityState] = useState<number>(0.18);
  const [backgroundBlur, setBackgroundBlurState] = useState<number>(0);
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        if (config.activePreset) setActivePreset(config.activePreset);
        if (config.backgroundColor) setBackgroundColorState(config.backgroundColor);
        if (config.cardBackground) setCardBackgroundState(config.cardBackground);
        if (config.borderColor) setBorderColorState(config.borderColor);
        if (config.backgroundImage !== undefined) setBackgroundImageState(config.backgroundImage);
        if (config.backgroundOpacity !== undefined) setBackgroundOpacityState(config.backgroundOpacity);
        if (config.backgroundBlur !== undefined) setBackgroundBlurState(config.backgroundBlur);
        if (Array.isArray(config.customWallpapers)) setCustomWallpapers(config.customWallpapers);
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  // Save to localStorage & inject CSS variables
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const config = {
        activePreset,
        backgroundColor,
        cardBackground,
        borderColor,
        backgroundImage,
        backgroundOpacity,
        backgroundBlur,
        customWallpapers,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {}

    // Apply CSS variables & dynamic style overrides
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--background', backgroundColor);
      root.style.setProperty('--card-bg', cardBackground);
      root.style.setProperty('--card-border', borderColor);
      document.body.style.backgroundColor = backgroundColor;

      let styleEl = document.getElementById('dynamic-theme-overrides') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-theme-overrides';
        document.head.appendChild(styleEl);
      }

      styleEl.textContent = `
        body, #app-theme-wrapper {
          background-color: ${backgroundColor} !important;
        }
        .min-h-screen {
          background-color: transparent !important;
        }
        .bg-\\[\\#111A2E\\], .bg-\\[\\#111a2e\\], .bg-\\[\\#0D1526\\], .bg-\\[\\#0d1526\\], .bg-\\[\\#0D131F\\] {
          background-color: ${cardBackground} !important;
        }
        .border-\\[\\#1E293B\\], .border-\\[\\#1e293b\\] {
          border-color: ${borderColor} !important;
        }
        header.bg-\\[\\#0B1120\\], header {
          background-color: ${cardBackground} !important;
          border-color: ${borderColor} !important;
        }
      `;
    }
  }, [
    activePreset,
    backgroundColor,
    cardBackground,
    borderColor,
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    isLoaded,
  ]);

  const setThemePreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setBackgroundColorState(preset.canvasBg);
    setCardBackgroundState(preset.cardBg);
    setBorderColorState(preset.borderColor);
  };

  const setBackgroundColor = (color: string) => {
    setActivePreset('custom');
    setBackgroundColorState(color);
  };

  const setCardBackground = (color: string) => {
    setActivePreset('custom');
    setCardBackgroundState(color);
  };

  const setBorderColor = (color: string) => {
    setActivePreset('custom');
    setBorderColorState(color);
  };

  const setBackgroundImage = (url: string) => {
    setBackgroundImageState(url);
  };

  const setBackgroundOpacity = (opacity: number) => {
    setBackgroundOpacityState(Math.max(0, Math.min(opacity, 1)));
  };

  const setBackgroundBlur = (blur: number) => {
    setBackgroundBlurState(Math.max(0, Math.min(blur, 20)));
  };

  const uploadCustomWallpaper = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/theme/upload-wallpaper', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server upload failed');
      }

      const data = await res.json();
      const newWp: CustomWallpaper = {
        id: `wp_${Date.now()}`,
        title: data.title || file.name,
        url: data.url,
        date: new Date().toLocaleDateString(),
      };

      setCustomWallpapers((prev) => [newWp, ...prev.filter((w) => w.url !== data.url)]);
      setBackgroundImage(data.url);
      return data.url;
    } catch {
      // Local FileReader fallback for offline or zero-upload restrictions
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Url = reader.result as string;
          const newWp: CustomWallpaper = {
            id: `wp_${Date.now()}`,
            title: file.name,
            url: base64Url,
            date: new Date().toLocaleDateString(),
          };
          setCustomWallpapers((prev) => [newWp, ...prev]);
          setBackgroundImage(base64Url);
          resolve(base64Url);
        };
        reader.onerror = () => reject(new Error('Failed to read local file'));
        reader.readAsDataURL(file);
      });
    }
  };

  const addCustomWallpaperUrl = (url: string, title?: string) => {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    const newWp: CustomWallpaper = {
      id: `wp_${Date.now()}`,
      title: title || 'Custom Web Image',
      url: cleanUrl,
      date: new Date().toLocaleDateString(),
    };
    setCustomWallpapers((prev) => [newWp, ...prev.filter((w) => w.url !== cleanUrl)]);
    setBackgroundImage(cleanUrl);
  };

  const deleteCustomWallpaper = (id: string) => {
    setCustomWallpapers((prev) => {
      const target = prev.find((w) => w.id === id);
      if (target && backgroundImage === target.url) {
        setBackgroundImage('');
      }
      return prev.filter((w) => w.id !== id);
    });
  };

  const resetTheme = () => {
    setThemePreset('obsidian');
    setBackgroundImageState('');
    setBackgroundOpacityState(0.18);
    setBackgroundBlurState(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        activePreset,
        backgroundColor,
        cardBackground,
        borderColor,
        backgroundImage,
        backgroundOpacity,
        backgroundBlur,
        customWallpapers,
        setThemePreset,
        setBackgroundColor,
        setCardBackground,
        setBorderColor,
        setBackgroundImage,
        setBackgroundOpacity,
        setBackgroundBlur,
        uploadCustomWallpaper,
        addCustomWallpaperUrl,
        deleteCustomWallpaper,
        resetTheme,
      }}
    >
      <div
        id="app-theme-wrapper"
        className="relative min-h-screen flex flex-col transition-colors duration-300"
        style={{
          backgroundColor: backgroundColor,
        }}
      >
        {/* Global Ambient Background Wallpaper Layer */}
        {backgroundImage && backgroundImage.trim() !== '' && (
          <div
            id="app-theme-wallpaper"
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{
              backgroundImage: `url("${backgroundImage}")`,
              opacity: backgroundOpacity,
              filter: backgroundBlur > 0 ? `blur(${backgroundBlur}px)` : 'none',
            }}
          />
        )}
        <div className="relative z-10 flex flex-col flex-1 bg-transparent">
          {children}
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
