'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface ModuleStyleConfig {
  backgroundColor?: string;
  cardColor?: string;
  textColor?: string;
  borderColor?: string;
  gradient?: string;
  shadow?: string;
  animation?: 'none' | 'pulse' | 'glow' | 'tilt' | 'float';
  iconStyle?: 'classic' | 'neon' | 'glow' | 'minimal';
  fontSize?: 'sm' | 'base' | 'lg';
  borderRadius?: string;
  padding?: string;
  visible?: boolean;
}

export interface ColorCircleOption {
  id: string;
  name: string;
  hex: string;
  cardBg: string;
  borderColor: string;
  isDark?: boolean;
}

export const COLOR_CIRCLES: ColorCircleOption[] = [
  // OLED & Pure Blacks
  { id: 'pure-black', name: 'OLED Black', hex: '#000000', cardBg: '#090D16', borderColor: '#1E293B', isDark: true },
  { id: 'obsidian', name: 'Obsidian', hex: '#030712', cardBg: '#0D131F', borderColor: '#1E293B', isDark: true },
  { id: 'zinc-carbon', name: 'Zinc Carbon', hex: '#09090B', cardBg: '#18181B', borderColor: '#27272A', isDark: true },
  { id: 'slate-titanium', name: 'Slate Gray', hex: '#0F172A', cardBg: '#1E293B', borderColor: '#334155', isDark: true },
  { id: 'navy-original', name: 'Navy Blue', hex: '#0B1120', cardBg: '#111A2E', borderColor: '#1E293B', isDark: true },

  // Blue & Cyber Clouds
  { id: 'cyber-sapphire', name: 'Sapphire', hex: '#081026', cardBg: '#0F1E44', borderColor: '#1E3A8A', isDark: true },
  { id: 'azure-deep', name: 'Azure Sea', hex: '#001428', cardBg: '#0A2540', borderColor: '#004B87', isDark: true },
  { id: 'cobalt-night', name: 'Cobalt Night', hex: '#050D24', cardBg: '#0B1B47', borderColor: '#1D4ED8', isDark: true },
  { id: 'electric-blue', name: 'Electric Cyan', hex: '#02182B', cardBg: '#082845', borderColor: '#0284C7', isDark: true },

  // Violet, Indigo & Cyberpunk
  { id: 'midnight-violet', name: 'Violet', hex: '#0D0B18', cardBg: '#1A1433', borderColor: '#31265B', isDark: true },
  { id: 'royal-indigo', name: 'Royal Indigo', hex: '#110D26', cardBg: '#1E1742', borderColor: '#4338CA', isDark: true },
  { id: 'neon-cyberpunk', name: 'Cyberpunk', hex: '#180B1C', cardBg: '#2D1236', borderColor: '#701A75', isDark: true },

  // Emerald, Pine & Matrix
  { id: 'cyber-emerald', name: 'Emerald', hex: '#04130E', cardBg: '#0A2117', borderColor: '#154D37', isDark: true },
  { id: 'matrix-forest', name: 'Matrix Pine', hex: '#021B13', cardBg: '#063325', borderColor: '#047857', isDark: true },
  { id: 'ocean-cyan', name: 'Teal Cyan', hex: '#041820', cardBg: '#082836', borderColor: '#0E7490', isDark: true },

  // Crimson, Burgundy & Sunset Amber
  { id: 'crimson-wine', name: 'Burgundy', hex: '#1A070A', cardBg: '#2A0B10', borderColor: '#5C141E', isDark: true },
  { id: 'sunset-amber', name: 'Amber Bronze', hex: '#160B04', cardBg: '#2B1607', borderColor: '#78350F', isDark: true },

  // Light & Clean Modes
  { id: 'daylight-slate', name: 'Daylight', hex: '#F8FAFC', cardBg: '#FFFFFF', borderColor: '#E2E8F0', isDark: false },
  { id: 'pure-white', name: 'Pure White', hex: '#FFFFFF', cardBg: '#F1F5F9', borderColor: '#CBD5E1', isDark: false },
];

export interface WallpaperOption {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
}

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
];

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  canvasBg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  isDark: boolean;
  gradientBackground?: string;
  cardShadow?: string;
  borderRadius?: string;
  glassmorphism?: boolean;
  background3DEffect?: 'none' | 'floating-cubes' | 'particles' | 'aurora-waves' | 'cyber-grid';
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'dark-neon',
    name: 'Dark Neon',
    description: 'Electric cyan & neon blue cyberpunk glow on pure dark canvas',
    canvasBg: '#050811',
    cardBg: '#0B1120',
    borderColor: '#06B6D4',
    accentColor: '#06B6D4',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    textColor: '#F1F5F9',
    isDark: true,
    cardShadow: 'neon-glow',
    borderRadius: '12px',
    glassmorphism: true,
    background3DEffect: 'cyber-grid',
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    description: 'Deep royal indigo & glowing violet for high-tech NOC operations',
    canvasBg: '#0D0B18',
    cardBg: '#1A1433',
    borderColor: '#31265B',
    accentColor: '#A855F7',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    textColor: '#FAF5FF',
    isDark: true,
    cardShadow: 'medium',
    borderRadius: '16px',
    glassmorphism: true,
    background3DEffect: 'aurora-waves',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Deep oceanic marine azure & sapphire matching cloud infrastructure',
    canvasBg: '#081026',
    cardBg: '#0F1E44',
    borderColor: '#1E3A8A',
    accentColor: '#38BDF8',
    primaryColor: '#2563EB',
    secondaryColor: '#06B6D4',
    textColor: '#F0F9FF',
    isDark: true,
    cardShadow: 'subtle',
    borderRadius: '12px',
    glassmorphism: true,
    background3DEffect: 'particles',
  },
  {
    id: 'cyber-green',
    name: 'Cyber Green',
    description: 'Deep matrix pine dark mode with glowing emerald telemetry accents',
    canvasBg: '#04130E',
    cardBg: '#0A2117',
    borderColor: '#154D37',
    accentColor: '#10B981',
    primaryColor: '#059669',
    secondaryColor: '#34D399',
    textColor: '#F0FDF4',
    isDark: true,
    cardShadow: 'neon-glow',
    borderRadius: '12px',
    glassmorphism: false,
    background3DEffect: 'cyber-grid',
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Frosted acrylic blur with translucent borders and soft ambient sheen',
    canvasBg: '#0A0F1D',
    cardBg: 'rgba(17, 26, 46, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    accentColor: '#60A5FA',
    primaryColor: '#3B82F6',
    secondaryColor: '#A78BFA',
    textColor: '#FFFFFF',
    isDark: true,
    cardShadow: 'subtle',
    borderRadius: '16px',
    glassmorphism: true,
    background3DEffect: 'floating-cubes',
  },
  {
    id: 'modern-white',
    name: 'Modern White',
    description: 'Crisp executive daylight white with slate high-contrast borders',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    borderColor: '#E2E8F0',
    accentColor: '#2563EB',
    primaryColor: '#2563EB',
    secondaryColor: '#475569',
    textColor: '#0F172A',
    isDark: false,
    cardShadow: 'subtle',
    borderRadius: '12px',
    glassmorphism: false,
    background3DEffect: 'none',
  },
  {
    id: 'professional-light',
    name: 'Professional Light',
    description: 'Soft graphite slate daylight NOC neutral for bright control rooms',
    canvasBg: '#F1F5F9',
    cardBg: '#FFFFFF',
    borderColor: '#CBD5E1',
    accentColor: '#0284C7',
    primaryColor: '#0284C7',
    secondaryColor: '#64748B',
    textColor: '#1E293B',
    isDark: false,
    cardShadow: 'subtle',
    borderRadius: '8px',
    glassmorphism: false,
    background3DEffect: 'none',
  },
  {
    id: 'aurora-gradient',
    name: 'Aurora Gradient',
    description: 'Vibrant flowing northern lights gradient with multi-color neon aura',
    canvasBg: '#070B19',
    cardBg: '#0E172E',
    borderColor: '#3B82F6',
    accentColor: '#F43F5E',
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    textColor: '#FFFFFF',
    isDark: true,
    cardShadow: 'neon-glow',
    borderRadius: '16px',
    glassmorphism: true,
    background3DEffect: 'aurora-waves',
  },
];

export interface CustomWallpaper {
  id: string;
  title: string;
  url: string;
  date: string;
}

export interface LayerConfig {
  dashboardBackground: { visible: boolean; opacity: number; blur: number };
  header: { visible: boolean; background?: string; opacity: number; border?: string; shadow?: string };
  sidebar: { visible: boolean; background?: string; opacity: number; border?: string; shadow?: string };
  content: { padding?: string; spacing?: string };
  cards: { background?: string; border?: string; radius?: string; shadow?: string; glassmorphism: boolean };
  charts: { visible: boolean; opacity: number };
  widgets: { visible: boolean };
}

interface ThemeContextType {
  // Active Preset & State
  activePreset: string;
  isDark: boolean;
  
  // Global Colors & Typography
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cardBackground: string;
  sidebarBackground: string;
  headerBackground: string;
  textColor: string;
  borderColor: string;
  gradientBackground: string;
  backgroundImage: string;
  backgroundOpacity: number;
  backgroundBlur: number;
  borderRadius: string;
  cardShadow: string;
  fontFamily: string;
  fontSize: string;
  componentSpacing: string;

  // 3D Animation Studio
  animationEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  animationIntensity: 'subtle' | 'medium' | 'vibrant';
  background3DEffect: 'none' | 'floating-cubes' | 'particles' | 'aurora-waves' | 'cyber-grid';
  floatingClouds: boolean;
  particlesMesh: boolean;
  cardHover3D: boolean;
  glassmorphism: boolean;
  glowingBorders: boolean;
  smoothTransitions: boolean;

  // Layer & Layout Editor
  layers: LayerConfig;
  updateLayerConfig: (layerName: keyof LayerConfig, updates: any) => void;

  // Individual Module Overrides
  moduleStyles: Record<string, ModuleStyleConfig>;
  updateModuleStyle: (moduleId: string, updates: Partial<ModuleStyleConfig>) => void;
  resetModuleStyle: (moduleId: string) => void;
  getModuleStyle: (moduleId: string) => ModuleStyleConfig;

  // Custom Wallpapers
  customWallpapers: CustomWallpaper[];
  uploadCustomWallpaper: (file: File) => Promise<string>;
  addCustomWallpaperUrl: (url: string, title?: string) => void;
  deleteCustomWallpaper: (id: string) => void;

  // Setters
  setThemePreset: (presetId: string) => void;
  setBackgroundColor: (color: string) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setCardBackground: (color: string) => void;
  setSidebarBackground: (color: string) => void;
  setHeaderBackground: (color: string) => void;
  setTextColor: (color: string) => void;
  setBorderColor: (color: string) => void;
  setGradientBackground: (gradient: string) => void;
  setBackgroundImage: (url: string) => void;
  setBackgroundOpacity: (opacity: number) => void;
  setBackgroundBlur: (blur: number) => void;
  setBorderRadius: (radius: string) => void;
  setCardShadow: (shadow: string) => void;
  setFontFamily: (font: string) => void;
  setFontSize: (size: string) => void;
  setComponentSpacing: (spacing: string) => void;

  // Animation Setters
  setAnimationEnabled: (enabled: boolean) => void;
  setAnimationSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  setAnimationIntensity: (intensity: 'subtle' | 'medium' | 'vibrant') => void;
  setBackground3DEffect: (effect: 'none' | 'floating-cubes' | 'particles' | 'aurora-waves' | 'cyber-grid') => void;
  setFloatingClouds: (clouds: boolean) => void;
  setParticlesMesh: (particles: boolean) => void;
  setCardHover3D: (hover: boolean) => void;
  setGlassmorphism: (glass: boolean) => void;
  setGlowingBorders: (glow: boolean) => void;
  setSmoothTransitions: (transitions: boolean) => void;

  // Persistence, Export & Import
  applyColorCircle: (circle: ColorCircleOption) => void;
  saveThemeToDatabase: (themeName?: string) => Promise<boolean>;
  exportThemeJSON: () => string;
  importThemeJSON: (jsonString: string) => boolean;
  resetTheme: () => void;
  resetEntireTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mcm_home_style_studio_v3';

const DEFAULT_LAYERS: LayerConfig = {
  dashboardBackground: { visible: true, opacity: 1, blur: 0 },
  header: { visible: true, opacity: 1 },
  sidebar: { visible: true, opacity: 1 },
  content: { padding: 'normal', spacing: 'normal' },
  cards: { radius: '12px', shadow: 'subtle', glassmorphism: true },
  charts: { visible: true, opacity: 1 },
  widgets: { visible: true },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Preset & Mode
  const [activePreset, setActivePreset] = useState<string>('dark-neon');
  const [isDark, setIsDark] = useState<boolean>(true);

  // Global Colors
  const [backgroundColor, setBackgroundColorState] = useState<string>('#050811');
  const [primaryColor, setPrimaryColorState] = useState<string>('#3B82F6');
  const [secondaryColor, setSecondaryColorState] = useState<string>('#8B5CF6');
  const [accentColor, setAccentColorState] = useState<string>('#06B6D4');
  const [cardBackground, setCardBackgroundState] = useState<string>('#0B1120');
  const [sidebarBackground, setSidebarBackgroundState] = useState<string>('#0B1120');
  const [headerBackground, setHeaderBackgroundState] = useState<string>('#0B1120');
  const [textColor, setTextColorState] = useState<string>('#F1F5F9');
  const [borderColor, setBorderColorState] = useState<string>('#162238');
  const [gradientBackground, setGradientBackgroundState] = useState<string>('');
  const [backgroundImage, setBackgroundImageState] = useState<string>('');
  const [backgroundOpacity, setBackgroundOpacityState] = useState<number>(0.2);
  const [backgroundBlur, setBackgroundBlurState] = useState<number>(0);
  const [borderRadius, setBorderRadiusState] = useState<string>('12px');
  const [cardShadow, setCardShadowState] = useState<string>('neon-glow');
  const [fontFamily, setFontFamilyState] = useState<string>('Inter, system-ui, sans-serif');
  const [fontSize, setFontSizeState] = useState<string>('normal');
  const [componentSpacing, setComponentSpacingState] = useState<string>('normal');

  // 3D Animation Studio
  const [animationEnabled, setAnimationEnabledState] = useState<boolean>(true);
  const [animationSpeed, setAnimationSpeedState] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [animationIntensity, setAnimationIntensityState] = useState<'subtle' | 'medium' | 'vibrant'>('medium');
  const [background3DEffect, setBackground3DEffectState] = useState<'none' | 'floating-cubes' | 'particles' | 'aurora-waves' | 'cyber-grid'>('cyber-grid');
  const [floatingClouds, setFloatingCloudsState] = useState<boolean>(true);
  const [particlesMesh, setParticlesMeshState] = useState<boolean>(true);
  const [cardHover3D, setCardHover3DState] = useState<boolean>(true);
  const [glassmorphism, setGlassmorphismState] = useState<boolean>(true);
  const [glowingBorders, setGlowingBordersState] = useState<boolean>(true);
  const [smoothTransitions, setSmoothTransitionsState] = useState<boolean>(true);

  // Layer & Layout
  const [layers, setLayers] = useState<LayerConfig>(DEFAULT_LAYERS);

  // Individual Module Overrides
  const [moduleStyles, setModuleStyles] = useState<Record<string, ModuleStyleConfig>>({});

  // Wallpapers
  const [customWallpapers, setCustomWallpapers] = useState<CustomWallpaper[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Hydrate from LocalStorage & MongoDB on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const c = JSON.parse(saved);
        if (c.activePreset) setActivePreset(c.activePreset);
        if (c.isDark !== undefined) setIsDark(c.isDark);
        if (c.backgroundColor) setBackgroundColorState(c.backgroundColor);
        if (c.primaryColor) setPrimaryColorState(c.primaryColor);
        if (c.secondaryColor) setSecondaryColorState(c.secondaryColor);
        if (c.accentColor) setAccentColorState(c.accentColor);
        if (c.cardBackground) setCardBackgroundState(c.cardBackground);
        if (c.sidebarBackground) setSidebarBackgroundState(c.sidebarBackground);
        if (c.headerBackground) setHeaderBackgroundState(c.headerBackground);
        if (c.textColor) setTextColorState(c.textColor);
        if (c.borderColor) setBorderColorState(c.borderColor);
        if (c.gradientBackground !== undefined) setGradientBackgroundState(c.gradientBackground);
        if (c.backgroundImage !== undefined) setBackgroundImageState(c.backgroundImage);
        if (c.backgroundOpacity !== undefined) setBackgroundOpacityState(c.backgroundOpacity);
        if (c.backgroundBlur !== undefined) setBackgroundBlurState(c.backgroundBlur);
        if (c.borderRadius) setBorderRadiusState(c.borderRadius);
        if (c.cardShadow) setCardShadowState(c.cardShadow);
        if (c.fontFamily) setFontFamilyState(c.fontFamily);
        if (c.fontSize) setFontSizeState(c.fontSize);
        if (c.componentSpacing) setComponentSpacingState(c.componentSpacing);

        // 3D Animations
        if (c.animationEnabled !== undefined) setAnimationEnabledState(c.animationEnabled);
        if (c.animationSpeed) setAnimationSpeedState(c.animationSpeed);
        if (c.animationIntensity) setAnimationIntensityState(c.animationIntensity);
        if (c.background3DEffect) setBackground3DEffectState(c.background3DEffect);
        if (c.floatingClouds !== undefined) setFloatingCloudsState(c.floatingClouds);
        if (c.particlesMesh !== undefined) setParticlesMeshState(c.particlesMesh);
        if (c.cardHover3D !== undefined) setCardHover3DState(c.cardHover3D);
        if (c.glassmorphism !== undefined) setGlassmorphismState(c.glassmorphism);
        if (c.glowingBorders !== undefined) setGlowingBordersState(c.glowingBorders);
        if (c.smoothTransitions !== undefined) setSmoothTransitionsState(c.smoothTransitions);

        if (c.layers) setLayers(c.layers);
        if (c.moduleStyles) setModuleStyles(c.moduleStyles);
        if (Array.isArray(c.customWallpapers)) setCustomWallpapers(c.customWallpapers);
      }
    } catch {}

    // Also fetch from DB if available
    fetch('/api/theme/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.isCustom && data.config) {
          const dbC = data.config;
          if (dbC.activePreset) setActivePreset(dbC.activePreset);
          if (dbC.backgroundColor) setBackgroundColorState(dbC.backgroundColor);
          if (dbC.cardBackground) setCardBackgroundState(dbC.cardBackground);
          if (dbC.borderColor) setBorderColorState(dbC.borderColor);
          if (dbC.moduleStyles) setModuleStyles(dbC.moduleStyles);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  // 2. Persist to LocalStorage & Inject Dynamic CSS Variables
  useEffect(() => {
    if (!isLoaded) return;

    const fullConfig = {
      activePreset,
      isDark,
      backgroundColor,
      primaryColor,
      secondaryColor,
      accentColor,
      cardBackground,
      sidebarBackground,
      headerBackground,
      textColor,
      borderColor,
      gradientBackground,
      backgroundImage,
      backgroundOpacity,
      backgroundBlur,
      borderRadius,
      cardShadow,
      fontFamily,
      fontSize,
      componentSpacing,
      animationEnabled,
      animationSpeed,
      animationIntensity,
      background3DEffect,
      floatingClouds,
      particlesMesh,
      cardHover3D,
      glassmorphism,
      glowingBorders,
      smoothTransitions,
      layers,
      moduleStyles,
      customWallpapers,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullConfig));
    } catch {}

    // Inject CSS variables into :root and dynamic style tag
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--background', backgroundColor);
      root.style.setProperty('--foreground', textColor);
      root.style.setProperty('--primary', primaryColor);
      root.style.setProperty('--secondary', secondaryColor);
      root.style.setProperty('--accent', accentColor);
      root.style.setProperty('--card-bg', cardBackground);
      root.style.setProperty('--card-border', borderColor);
      root.style.setProperty('--card-radius', borderRadius);
      root.style.setProperty('--sidebar-bg', sidebarBackground || cardBackground);
      root.style.setProperty('--header-bg', headerBackground || cardBackground);
      root.style.setProperty('--font-family', fontFamily);

      document.body.style.backgroundColor = backgroundColor;
      document.body.style.color = textColor;
      document.body.style.fontFamily = fontFamily;

      let styleEl = document.getElementById('home-style-studio-css') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'home-style-studio-css';
        document.head.appendChild(styleEl);
      }

      // Generate Shadow rule
      let shadowCss = 'none';
      if (cardShadow === 'subtle') shadowCss = '0 2px 8px -1px rgba(0,0,0,0.2)';
      if (cardShadow === 'medium') shadowCss = '0 8px 24px -4px rgba(0,0,0,0.35)';
      if (cardShadow === 'deep') shadowCss = '0 16px 36px -6px rgba(0,0,0,0.5)';
      if (cardShadow === 'neon-glow') shadowCss = `0 0 20px -2px ${accentColor}33, 0 8px 20px -4px rgba(0,0,0,0.5)`;

      // Generate Module Scoped CSS
      let moduleCssRules = '';
      Object.entries(moduleStyles).forEach(([modId, mod]) => {
        if (!mod) return;
        const selector = `[data-module-id="${modId}"]`;
        let modRules = '';
        if (mod.backgroundColor) modRules += `background-color: ${mod.backgroundColor} !important;`;
        if (mod.cardColor) modRules += `background: ${mod.cardColor} !important;`;
        if (mod.textColor) modRules += `color: ${mod.textColor} !important;`;
        if (mod.borderColor) modRules += `border-color: ${mod.borderColor} !important;`;
        if (mod.borderRadius) modRules += `border-radius: ${mod.borderRadius} !important;`;
        if (mod.shadow) modRules += `box-shadow: ${mod.shadow} !important;`;
        if (mod.visible === false) modRules += `display: none !important;`;
        if (modRules) {
          moduleCssRules += `${selector} { ${modRules} }\n`;
        }
      });

      // 3D Glassmorphism rule
      const glassRule = glassmorphism
        ? `backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important;`
        : `backdrop-filter: none !important;`;

      styleEl.textContent = `
        body, #app-theme-wrapper {
          background-color: ${backgroundColor} !important;
          color: ${textColor} !important;
        }
        .bg-\\[\\#111A2E\\], .bg-\\[\\#111a2e\\], .bg-\\[\\#0D1526\\], .bg-\\[\\#0d1526\\], .bg-\\[\\#0D131F\\], .bg-\\[\\#0B1120\\] {
          background-color: ${cardBackground} !important;
          border-color: ${borderColor} !important;
          border-radius: ${borderRadius} !important;
          box-shadow: ${shadowCss} !important;
          ${glassRule}
        }
        .border-\\[\\#1E293B\\], .border-\\[\\#1e293b\\], .border-\\[\\#162238\\] {
          border-color: ${borderColor} !important;
        }
        header.bg-\\[\\#0B1120\\], header {
          background-color: ${headerBackground || cardBackground} !important;
          border-color: ${borderColor} !important;
        }
        aside.bg-\\[\\#0B1120\\], aside {
          background-color: ${sidebarBackground || cardBackground} !important;
          border-color: ${borderColor} !important;
        }
        ${cardHover3D && animationEnabled ? `
          .card-3d-hover:hover {
            transform: translateY(-4px) scale(1.01) !important;
            transition: transform 0.25s ease, box-shadow 0.25s ease !important;
          }
        ` : ''}
        ${moduleCssRules}
      `;
    }
  }, [
    activePreset,
    isDark,
    backgroundColor,
    primaryColor,
    secondaryColor,
    accentColor,
    cardBackground,
    sidebarBackground,
    headerBackground,
    textColor,
    borderColor,
    gradientBackground,
    backgroundImage,
    backgroundOpacity,
    backgroundBlur,
    borderRadius,
    cardShadow,
    fontFamily,
    fontSize,
    componentSpacing,
    animationEnabled,
    animationSpeed,
    animationIntensity,
    background3DEffect,
    floatingClouds,
    particlesMesh,
    cardHover3D,
    glassmorphism,
    glowingBorders,
    smoothTransitions,
    layers,
    moduleStyles,
    isLoaded,
  ]);

  // Set Theme Preset
  const setThemePreset = useCallback((presetId: string) => {
    const p = THEME_PRESETS.find(item => item.id === presetId);
    if (!p) return;
    setActivePreset(presetId);
    setIsDark(p.isDark);
    setBackgroundColorState(p.canvasBg);
    setCardBackgroundState(p.cardBg);
    setBorderColorState(p.borderColor);
    setAccentColorState(p.accentColor);
    setPrimaryColorState(p.primaryColor);
    setSecondaryColorState(p.secondaryColor);
    setTextColorState(p.textColor);
    if (p.cardShadow) setCardShadowState(p.cardShadow);
    if (p.borderRadius) setBorderRadiusState(p.borderRadius);
    if (p.glassmorphism !== undefined) setGlassmorphismState(p.glassmorphism);
    if (p.background3DEffect) setBackground3DEffectState(p.background3DEffect);
  }, []);

  // Layer Updater
  const updateLayerConfig = useCallback((layerName: keyof LayerConfig, updates: any) => {
    setLayers(prev => ({
      ...prev,
      [layerName]: {
        ...(prev[layerName] as any),
        ...updates,
      },
    }));
  }, []);

  // Individual Module Styling
  const updateModuleStyle = useCallback((moduleId: string, updates: Partial<ModuleStyleConfig>) => {
    setModuleStyles(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        ...updates,
      },
    }));
  }, []);

  const resetModuleStyle = useCallback((moduleId: string) => {
    setModuleStyles(prev => {
      const copy = { ...prev };
      delete copy[moduleId];
      return copy;
    });
  }, []);

  const getModuleStyle = useCallback((moduleId: string): ModuleStyleConfig => {
    return moduleStyles[moduleId] || {};
  }, [moduleStyles]);

  // Wallpapers
  const uploadCustomWallpaper = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/theme/upload-wallpaper', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const newWp: CustomWallpaper = {
        id: `wp_${Date.now()}`,
        title: data.title || file.name,
        url: data.url,
        date: new Date().toLocaleDateString(),
      };
      setCustomWallpapers(prev => [newWp, ...prev]);
      setBackgroundImageState(data.url);
      return data.url;
    } catch {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const newWp: CustomWallpaper = {
            id: `wp_${Date.now()}`,
            title: file.name,
            url: base64,
            date: new Date().toLocaleDateString(),
          };
          setCustomWallpapers(prev => [newWp, ...prev]);
          setBackgroundImageState(base64);
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
  };

  const addCustomWallpaperUrl = (url: string, title?: string) => {
    if (!url?.trim()) return;
    const newWp: CustomWallpaper = {
      id: `wp_${Date.now()}`,
      title: title || 'Custom Web Image',
      url: url.trim(),
      date: new Date().toLocaleDateString(),
    };
    setCustomWallpapers(prev => [newWp, ...prev]);
    setBackgroundImageState(url.trim());
  };

  const deleteCustomWallpaper = (id: string) => {
    setCustomWallpapers(prev => prev.filter(w => w.id !== id));
  };

  // Database Persistence
  const saveThemeToDatabase = async (themeName: string = 'My Custom Theme'): Promise<boolean> => {
    try {
      const payload = {
        name: themeName,
        config: {
          activePreset,
          isDark,
          backgroundColor,
          primaryColor,
          secondaryColor,
          accentColor,
          cardBackground,
          sidebarBackground,
          headerBackground,
          textColor,
          borderColor,
          gradientBackground,
          backgroundImage,
          backgroundOpacity,
          backgroundBlur,
          borderRadius,
          cardShadow,
          fontFamily,
          fontSize,
          componentSpacing,
          animationEnabled,
          animationSpeed,
          animationIntensity,
          background3DEffect,
          floatingClouds,
          particlesMesh,
          cardHover3D,
          glassmorphism,
          glowingBorders,
          smoothTransitions,
          layers,
          moduleStyles,
        },
      };

      const res = await fetch('/api/theme/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch {
      return false;
    }
  };

  // Export & Import
  const exportThemeJSON = useCallback((): string => {
    const data = {
      name: 'Custom Theme Export',
      version: '3.0',
      exportedAt: new Date().toISOString(),
      config: {
        activePreset,
        isDark,
        backgroundColor,
        primaryColor,
        secondaryColor,
        accentColor,
        cardBackground,
        sidebarBackground,
        headerBackground,
        textColor,
        borderColor,
        borderRadius,
        cardShadow,
        fontFamily,
        fontSize,
        componentSpacing,
        animationEnabled,
        animationSpeed,
        background3DEffect,
        floatingClouds,
        particlesMesh,
        cardHover3D,
        glassmorphism,
        layers,
        moduleStyles,
      },
    };
    return JSON.stringify(data, null, 2);
  }, [
    activePreset,
    isDark,
    backgroundColor,
    primaryColor,
    secondaryColor,
    accentColor,
    cardBackground,
    sidebarBackground,
    headerBackground,
    textColor,
    borderColor,
    borderRadius,
    cardShadow,
    fontFamily,
    fontSize,
    componentSpacing,
    animationEnabled,
    animationSpeed,
    background3DEffect,
    floatingClouds,
    particlesMesh,
    cardHover3D,
    glassmorphism,
    layers,
    moduleStyles,
  ]);

  const importThemeJSON = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const c = parsed.config || parsed;
      if (c.backgroundColor) setBackgroundColorState(c.backgroundColor);
      if (c.cardBackground) setCardBackgroundState(c.cardBackground);
      if (c.borderColor) setBorderColorState(c.borderColor);
      if (c.accentColor) setAccentColorState(c.accentColor);
      if (c.primaryColor) setPrimaryColorState(c.primaryColor);
      if (c.secondaryColor) setSecondaryColorState(c.secondaryColor);
      if (c.textColor) setTextColorState(c.textColor);
      if (c.borderRadius) setBorderRadiusState(c.borderRadius);
      if (c.cardShadow) setCardShadowState(c.cardShadow);
      if (c.background3DEffect) setBackground3DEffectState(c.background3DEffect);
      if (c.glassmorphism !== undefined) setGlassmorphismState(c.glassmorphism);
      if (c.moduleStyles) setModuleStyles(c.moduleStyles);
      if (c.layers) setLayers(c.layers);
      setActivePreset('custom');
      return true;
    } catch {
      return false;
    }
  }, []);

  const applyColorCircle = (circle: ColorCircleOption) => {
    setActivePreset(circle.id);
    setBackgroundColorState(circle.hex);
    setCardBackgroundState(circle.cardBg);
    setBorderColorState(circle.borderColor);
    setIsDark(circle.isDark !== false);
  };

  const resetTheme = () => {
    setThemePreset('dark-neon');
  };

  const resetEntireTheme = async () => {
    resetTheme();
    setModuleStyles({});
    setLayers(DEFAULT_LAYERS);
    try {
      localStorage.removeItem(STORAGE_KEY);
      await fetch('/api/theme/config', { method: 'DELETE' });
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        activePreset,
        isDark,
        backgroundColor,
        primaryColor,
        secondaryColor,
        accentColor,
        cardBackground,
        sidebarBackground,
        headerBackground,
        textColor,
        borderColor,
        gradientBackground,
        backgroundImage,
        backgroundOpacity,
        backgroundBlur,
        borderRadius,
        cardShadow,
        fontFamily,
        fontSize,
        componentSpacing,
        animationEnabled,
        animationSpeed,
        animationIntensity,
        background3DEffect,
        floatingClouds,
        particlesMesh,
        cardHover3D,
        glassmorphism,
        glowingBorders,
        smoothTransitions,
        layers,
        updateLayerConfig,
        moduleStyles,
        updateModuleStyle,
        resetModuleStyle,
        getModuleStyle,
        customWallpapers,
        uploadCustomWallpaper,
        addCustomWallpaperUrl,
        deleteCustomWallpaper,
        setThemePreset,
        setBackgroundColor: (c) => { setActivePreset('custom'); setBackgroundColorState(c); },
        setPrimaryColor: (c) => { setActivePreset('custom'); setPrimaryColorState(c); },
        setSecondaryColor: (c) => { setActivePreset('custom'); setSecondaryColorState(c); },
        setAccentColor: (c) => { setActivePreset('custom'); setAccentColorState(c); },
        setCardBackground: (c) => { setActivePreset('custom'); setCardBackgroundState(c); },
        setSidebarBackground: (c) => { setActivePreset('custom'); setSidebarBackgroundState(c); },
        setHeaderBackground: (c) => { setActivePreset('custom'); setHeaderBackgroundState(c); },
        setTextColor: (c) => { setActivePreset('custom'); setTextColorState(c); },
        setBorderColor: (c) => { setActivePreset('custom'); setBorderColorState(c); },
        setGradientBackground: (g) => { setActivePreset('custom'); setGradientBackgroundState(g); },
        setBackgroundImage: (url) => { setBackgroundImageState(url); },
        setBackgroundOpacity: (o) => { setBackgroundOpacityState(o); },
        setBackgroundBlur: (b) => { setBackgroundBlurState(b); },
        setBorderRadius: (r) => { setBorderRadiusState(r); },
        setCardShadow: (s) => { setCardShadowState(s); },
        setFontFamily: (f) => { setFontFamilyState(f); },
        setFontSize: (s) => { setFontSizeState(s); },
        setComponentSpacing: (s) => { setComponentSpacingState(s); },
        setAnimationEnabled: (e) => { setAnimationEnabledState(e); },
        setAnimationSpeed: (s) => { setAnimationSpeedState(s); },
        setAnimationIntensity: (i) => { setAnimationIntensityState(i); },
        setBackground3DEffect: (e) => { setBackground3DEffectState(e); },
        setFloatingClouds: (c) => { setFloatingCloudsState(c); },
        setParticlesMesh: (p) => { setParticlesMeshState(p); },
        setCardHover3D: (h) => { setCardHover3DState(h); },
        setGlassmorphism: (g) => { setGlassmorphismState(g); },
        setGlowingBorders: (b) => { setGlowingBordersState(b); },
        setSmoothTransitions: (t) => { setSmoothTransitionsState(t); },
        applyColorCircle,
        saveThemeToDatabase,
        exportThemeJSON,
        importThemeJSON,
        resetTheme,
        resetEntireTheme,
      }}
    >
      {children}
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
