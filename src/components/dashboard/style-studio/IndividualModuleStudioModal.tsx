'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Sparkles,
  Palette,
  Layers,
  Sliders,
  RotateCcw,
  Check,
  Save,
  Download,
  Upload,
  Eye,
  EyeOff,
  Box,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  Layers3,
  Zap,
  Activity,
  SlidersHorizontal,
  Type,
  Maximize2,
  Minimize2,
  RefreshCw,
  Server,
  Cloud,
  Terminal,
  ShieldCheck,
  Cpu,
  HardDrive,
  Network,
  RotateCw,
} from 'lucide-react';
import { useTheme, ModuleStyleConfig, ModuleLayersConfig } from '@/context/ThemeContext';

export interface ModuleDefinition {
  id: string;
  name: string;
  category: 'Overview' | 'Compute & Servers' | 'DevOps & Tooling' | 'Monitoring & Logs';
  defaultIcon: string;
  description: string;
}

export const ALL_APPLICATION_MODULES: ModuleDefinition[] = [
  // Overview Summary Cards
  { id: 'aws-resources', name: 'AWS Resources Card', category: 'Overview', defaultIcon: '☁️', description: 'Total AWS infrastructure assets and EC2 instances' },
  { id: 'azure-resources', name: 'Azure Resources Card', category: 'Overview', defaultIcon: '🔷', description: 'Total Azure subscription VMs and resources' },
  { id: 'total-servers', name: 'Total Servers Card', category: 'Overview', defaultIcon: '🖥️', description: 'Aggregated compute instances across all clouds' },
  { id: 'docker-containers', name: 'Docker Containers Card', category: 'Overview', defaultIcon: '🐳', description: 'Active container runtime summary' },
  { id: 'k8s-clusters', name: 'Kubernetes Clusters Card', category: 'Overview', defaultIcon: '☸️', description: 'Active K8s clusters, nodes, and pods' },
  { id: 'active-alerts', name: 'Active Alerts Card', category: 'Overview', defaultIcon: '⚠️', description: 'Triggered alarms and threshold incidents' },

  // Main Dashboard Sections
  { id: 'operations-matrix', name: 'Multi-Cloud Operations Matrix', category: 'Overview', defaultIcon: '⚡', description: 'Interactive 3D 6-module command engine deck' },
  { id: 'cloud-distribution', name: 'Cloud Distribution Fleet', category: 'Overview', defaultIcon: '📊', description: 'AWS vs Azure allocation donut chart' },
  { id: 'server-status-fleet', name: 'Server Status Fleet', category: 'Overview', defaultIcon: '🟢', description: 'Live server heatmap & latency matrix' },
  { id: 'fleet-command', name: 'Fleet Command Center', category: 'Overview', defaultIcon: '🚀', description: 'Instant PuTTY terminal access and shortcuts' },

  // Compute & Cloud
  { id: 'regions', name: 'Regions Module', category: 'Compute & Servers', defaultIcon: '🗺️', description: 'Global multi-cloud regional catalog' },
  { id: 'servers', name: 'Servers Registry', category: 'Compute & Servers', defaultIcon: '🗄️', description: 'Full server inventory and terminal access' },
  { id: 'ec2-instances', name: 'AWS EC2 Instances', category: 'Compute & Servers', defaultIcon: '📦', description: 'Amazon Elastic Compute Cloud instances table' },
  { id: 'azure-vms', name: 'Azure Virtual Machines', category: 'Compute & Servers', defaultIcon: '💻', description: 'Microsoft Azure VM instances table' },
  { id: 'on-premises', name: 'On-Premises Servers', category: 'Compute & Servers', defaultIcon: '🏢', description: 'Bare metal and private datacenter hosts' },
  { id: 'server-scheduling', name: 'Server Scheduling', category: 'Compute & Servers', defaultIcon: '⏱️', description: 'Automated start, stop, and reboot jobs' },
  { id: 'cloud-accounts', name: 'Cloud Accounts', category: 'Compute & Servers', defaultIcon: '🔑', description: 'AWS IAM Roles and Azure Service Principals' },

  // DevOps & Tooling
  { id: 'docker', name: 'Docker Module', category: 'DevOps & Tooling', defaultIcon: '🐳', description: 'Container logs, volumes, images and engine stats' },
  { id: 'kubernetes', name: 'Kubernetes Module', category: 'DevOps & Tooling', defaultIcon: '☸️', description: 'Nodes, pods, services, deployments and namespaces' },
  { id: 'nginx', name: 'Nginx Module', category: 'DevOps & Tooling', defaultIcon: '🌐', description: 'Reverse proxy, upstreams, SSL config and deployment' },
  { id: 'maven', name: 'Maven Module', category: 'DevOps & Tooling', defaultIcon: '☕', description: 'Java build automation and POM pipelines' },
  { id: 'ansible', name: 'Ansible Module', category: 'DevOps & Tooling', defaultIcon: '⚡', description: 'Playbook automation and execution logs' },

  // Monitoring
  { id: 'alerts', name: 'Alerts Center', category: 'Monitoring & Logs', defaultIcon: '🚨', description: 'Incident management and threshold rules' },
  { id: 'metrics-explorer', name: 'Metrics Explorer', category: 'Monitoring & Logs', defaultIcon: '📈', description: 'Time-series telemetry charts and queries' },
  { id: 'notification-channels', name: 'Notification Channels', category: 'Monitoring & Logs', defaultIcon: '🔔', description: 'Email, Slack and webhook destinations' },
];

export interface ModulePresetStyle {
  id: string;
  name: string;
  description: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  headingColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  shadow: string;
  borderRadius: string;
  animation: 'none' | 'pulse' | 'glow' | 'tilt' | 'float' | 'rotating' | 'cloud' | 'particles';
  glassmorphism: boolean;
  blur?: number;
  depth3D?: number;
}

export const MODULE_PRESET_STYLES: ModulePresetStyle[] = [
  {
    id: 'modern-enterprise',
    name: 'Modern Enterprise',
    description: 'Clean dark corporate with electric blue accents',
    cardColor: '#0D1526',
    borderColor: '#1E3A8A',
    textColor: '#F8FAFC',
    headingColor: '#FFFFFF',
    primaryColor: '#3B82F6',
    secondaryColor: '#64748B',
    accentColor: '#0EA5E9',
    shadow: '0 8px 24px -4px rgba(0,0,0,0.4)',
    borderRadius: '12px',
    animation: 'none',
    glassmorphism: false,
    depth3D: 10,
  },
  {
    id: 'dark-neon',
    name: 'Dark Neon',
    description: 'Electric cyan & neon purple cyberpunk glow on deep dark',
    cardColor: '#0B1120',
    borderColor: '#06B6D4',
    textColor: '#F1F5F9',
    headingColor: '#67E8F9',
    primaryColor: '#06B6D4',
    secondaryColor: '#8B5CF6',
    accentColor: '#10B981',
    shadow: '0 0 25px rgba(6, 182, 212, 0.35)',
    borderRadius: '16px',
    animation: 'glow',
    glassmorphism: true,
    blur: 12,
    depth3D: 25,
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    description: 'Translucent frosted acrylic glass with subtle sheen',
    cardColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#FFFFFF',
    headingColor: '#FFFFFF',
    primaryColor: '#60A5FA',
    secondaryColor: '#C084FC',
    accentColor: '#38BDF8',
    shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
    borderRadius: '20px',
    animation: 'float',
    glassmorphism: true,
    blur: 16,
    depth3D: 20,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon magenta & electric cyber yellow high contrast',
    cardColor: '#180828',
    borderColor: '#EC4899',
    textColor: '#FDF4FF',
    headingColor: '#F472B6',
    primaryColor: '#EC4899',
    secondaryColor: '#EAB308',
    accentColor: '#06B6D4',
    shadow: '0 0 30px rgba(236, 72, 153, 0.45)',
    borderRadius: '6px',
    animation: 'pulse',
    glassmorphism: false,
    depth3D: 30,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Pure distraction-free slate monochrome aesthetic',
    cardColor: '#0F172A',
    borderColor: '#334155',
    textColor: '#E2E8F0',
    headingColor: '#F8FAFC',
    primaryColor: '#94A3B8',
    secondaryColor: '#64748B',
    accentColor: '#CBD5E1',
    shadow: 'none',
    borderRadius: '8px',
    animation: 'none',
    glassmorphism: false,
    depth3D: 0,
  },
  {
    id: 'premium-3d',
    name: 'Premium 3D',
    description: 'Deep perspective shadows with dynamic metallic bevels',
    cardColor: 'linear-gradient(145deg, #16203B, #0B1020)',
    borderColor: '#4F46E5',
    textColor: '#EEF2FF',
    headingColor: '#FFFFFF',
    primaryColor: '#6366F1',
    secondaryColor: '#8B5CF6',
    accentColor: '#A855F7',
    shadow: '0 20px 40px -10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12)',
    borderRadius: '16px',
    animation: 'tilt',
    glassmorphism: false,
    depth3D: 40,
  },
  {
    id: 'gradient-glass',
    name: 'Gradient Glass',
    description: 'Multi-stop sunset aura with glowing translucent borders',
    cardColor: 'linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(139, 92, 246, 0.25), rgba(6, 182, 212, 0.2))',
    borderColor: 'rgba(244, 63, 94, 0.4)',
    textColor: '#FFFFFF',
    headingColor: '#FFFFFF',
    primaryColor: '#F43F5E',
    secondaryColor: '#8B5CF6',
    accentColor: '#06B6D4',
    shadow: '0 8px 32px rgba(139, 92, 246, 0.3)',
    borderRadius: '20px',
    animation: 'float',
    glassmorphism: true,
    blur: 14,
    depth3D: 25,
  },
  {
    id: 'futuristic',
    name: 'Futuristic HUD',
    description: 'Cyber telemetry console with angular borders & cyan radar',
    cardColor: '#04111D',
    borderColor: '#0284C7',
    textColor: '#E0F2FE',
    headingColor: '#38BDF8',
    primaryColor: '#0284C7',
    secondaryColor: '#0D9488',
    accentColor: '#22D3EE',
    shadow: '0 0 20px rgba(2, 132, 199, 0.35)',
    borderRadius: '10px',
    animation: 'rotating',
    glassmorphism: false,
    depth3D: 20,
  },
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    description: 'Royal deep violet with glowing lavender aura',
    cardColor: '#130D26',
    borderColor: '#581C87',
    textColor: '#FAF5FF',
    headingColor: '#E9D5FF',
    primaryColor: '#7C3AED',
    secondaryColor: '#EC4899',
    accentColor: '#A855F7',
    shadow: '0 10px 30px rgba(124, 58, 237, 0.35)',
    borderRadius: '16px',
    animation: 'glow',
    glassmorphism: true,
    blur: 12,
    depth3D: 30,
  },
];

const DEFAULT_MODULE_LAYERS: ModuleLayersConfig = {
  background: { visible: true, opacity: 1, zIndex: 0 },
  container: { visible: true, opacity: 1, zIndex: 1 },
  header: { visible: true, opacity: 1, zIndex: 2 },
  card: { visible: true, opacity: 1, zIndex: 2 },
  icon: { visible: true, opacity: 1, zIndex: 3 },
  content: { visible: true, opacity: 1, zIndex: 3 },
  animation: { visible: true, opacity: 1, zIndex: 4 },
  border: { visible: true, opacity: 1, zIndex: 5 },
  shadow: { visible: true, opacity: 1, zIndex: 0 },
};

export function IndividualModuleStudioModal() {
  const {
    activeCustomizingModule,
    closeModuleCustomizer,
    getModuleStyle,
    updateModuleStyle,
    resetModuleStyle,
    saveThemeToDatabase,
    cardBackground,
    borderColor,
    textColor,
    borderRadius,
    accentColor,
    primaryColor,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<
    | 'style'
    | 'design'
    | 'color'
    | 'animation'
    | 'layers'
    | 'layout'
    | 'typography'
    | 'background'
  >('style');

  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('aws-resources');
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Mouse tilt physics state for center live preview
  const [tiltPhysics, setTiltPhysics] = useState<{ rotateX: number; rotateY: number }>({ rotateX: 0, rotateY: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  // Set selected module and initial tab when activeCustomizingModule changes
  useEffect(() => {
    if (activeCustomizingModule?.id) {
      setSelectedModuleId(activeCustomizingModule.id);
      if (activeCustomizingModule.initialTab) {
        setActiveTab(activeCustomizingModule.initialTab as any);
      }
    }
  }, [activeCustomizingModule]);

  // Read current draft from ThemeContext
  const currentSavedStyle = useTheme().getModuleStyle(selectedModuleId);

  // Local draft state
  const [draft, setDraft] = useState<ModuleStyleConfig>(currentSavedStyle);

  // Keep draft in sync when module switches
  useEffect(() => {
    const s = getModuleStyle(selectedModuleId);
    setDraft({
      cardColor: s.cardColor || cardBackground || '#0B1120',
      textColor: s.textColor || textColor || '#F1F5F9',
      headingColor: s.headingColor || '#FFFFFF',
      borderColor: s.borderColor || borderColor || '#1E293B',
      borderRadius: s.borderRadius || borderRadius || '12px',
      borderWidth: s.borderWidth || '1px',
      shadow: s.shadow || 'subtle',
      primaryColor: s.primaryColor || primaryColor || '#3B82F6',
      secondaryColor: s.secondaryColor || '#8B5CF6',
      accentColor: s.accentColor || accentColor || '#06B6D4',
      hoverColor: s.hoverColor || '#38BDF8',
      animation: s.animation || 'none',
      animationEnabled: s.animationEnabled !== false,
      animationSpeed: s.animationSpeed || 'normal',
      rotationIntensity: s.rotationIntensity || 'medium',
      depth3D: s.depth3D ?? 15,
      glowIntensity: s.glowIntensity || 'medium',
      mouseFollowTilt: s.mouseFollowTilt !== false,
      cardDesign: s.cardDesign || 'modern',
      headerDesign: s.headerDesign || 'classic',
      iconStyle: s.iconStyle || 'classic',
      fontFamily: s.fontFamily || 'Inter, system-ui, sans-serif',
      fontSize: s.fontSize || 'base',
      padding: s.padding || '16px',
      margin: s.margin || '0px',
      alignment: s.alignment || 'left',
      visible: s.visible !== false,
      glassmorphism: s.glassmorphism || false,
      blur: s.blur || 12,
      stylePreset: s.stylePreset || '',
      hasGradient: s.hasGradient || false,
      gradientStart: s.gradientStart || '#1E3A8A',
      gradientEnd: s.gradientEnd || '#0B1120',
      layers: s.layers || DEFAULT_MODULE_LAYERS,
    });
  }, [selectedModuleId, getModuleStyle, cardBackground, borderColor, textColor, borderRadius, accentColor, primaryColor]);

  const activeModuleDef =
    ALL_APPLICATION_MODULES.find((m) => m.id === selectedModuleId) || ALL_APPLICATION_MODULES[0];

  // Helper to update draft
  const updateDraft = (updates: Partial<ModuleStyleConfig>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      // Real-time live update into context so live background changes immediately
      updateModuleStyle(selectedModuleId, next);
      return next;
    });
  };

  // Preset Applicator
  const handleApplyPreset = (preset: ModulePresetStyle) => {
    updateDraft({
      stylePreset: preset.id,
      cardColor: preset.cardColor,
      borderColor: preset.borderColor,
      textColor: preset.textColor,
      headingColor: preset.headingColor,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      shadow: preset.shadow,
      borderRadius: preset.borderRadius,
      animation: preset.animation,
      animationEnabled: true,
      glassmorphism: preset.glassmorphism,
      blur: preset.blur || 12,
      depth3D: preset.depth3D || 20,
    });
  };

  // Layer Update Helper
  const updateLayer = (layerKey: keyof ModuleLayersConfig, updates: Partial<ModuleLayersConfig[keyof ModuleLayersConfig]>) => {
    const currentLayers = draft.layers || DEFAULT_MODULE_LAYERS;
    const nextLayers = {
      ...currentLayers,
      [layerKey]: {
        ...(currentLayers[layerKey] as any),
        ...updates,
      },
    };
    updateDraft({ layers: nextLayers });
  };

  // Reset Module to Inherit Global Theme
  const handleInheritGlobal = () => {
    resetModuleStyle(selectedModuleId);
    setDraft({
      cardColor: cardBackground || '#0B1120',
      textColor: textColor || '#F1F5F9',
      headingColor: '#FFFFFF',
      borderColor: borderColor || '#1E293B',
      borderRadius: borderRadius || '12px',
      borderWidth: '1px',
      shadow: 'subtle',
      primaryColor: primaryColor || '#3B82F6',
      accentColor: accentColor || '#06B6D4',
      animation: 'none',
      animationEnabled: true,
      glassmorphism: false,
      visible: true,
      stylePreset: '',
      hasGradient: false,
      layers: DEFAULT_MODULE_LAYERS,
    });
  };

  // Save to Database
  const handleSaveToDatabase = async () => {
    updateModuleStyle(selectedModuleId, draft);
    const ok = await saveThemeToDatabase(`Module Theme: ${activeModuleDef.name}`);
    if (ok) {
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2400);
    }
  };

  // Export & Import Module Config JSON
  const handleExportJSON = () => {
    const json = JSON.stringify(
      {
        moduleId: selectedModuleId,
        moduleName: activeModuleDef.name,
        exportedAt: new Date().toISOString(),
        config: draft,
      },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `module-style-${selectedModuleId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      const conf = parsed.config || parsed;
      if (conf) {
        updateDraft(conf);
        setShowImportDialog(false);
        setImportJsonText('');
      }
    } catch {
      alert('Invalid JSON format. Please paste a valid Module Style export.');
    }
  };

  // Interactive 3D Mouse Tilt Physics Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draft.mouseFollowTilt || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxAngle = (draft.depth3D ?? 20) / 2; // Dynamic angle based on 3D depth
    const rotateY = ((x - centerX) / centerX) * maxAngle;
    const rotateX = -((y - centerY) / centerY) * maxAngle;
    setTiltPhysics({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTiltPhysics({ rotateX: 0, rotateY: 0 });
  };

  if (!activeCustomizingModule) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-[#0A0F1D] border-2 border-cyan-500/50 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300 font-sans ${
          isFullscreen
            ? 'fixed inset-2 w-[calc(100vw-16px)] h-[calc(100vh-16px)] max-w-none'
            : 'w-full max-w-7xl max-h-[94vh] h-[92vh]'
        }`}
      >
        {/* =================================================================== */}
        {/* TOP TOOLBAR: Brand, Module Switcher, Preset Indicator, Save/Close    */}
        {/* =================================================================== */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-[#0E1628]/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: Module Identity & Category */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-purple-500/20 border border-cyan-500/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
              {activeModuleDef.defaultIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  {activeModuleDef.name}
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
                  {activeModuleDef.category}
                </span>
                {draft.stylePreset && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                    {draft.stylePreset}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Scoped 3D style, animations & layer customization • Changes apply ONLY to this module
              </p>
            </div>
          </div>

          {/* Center: Module Dropdown Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">Module:</span>
            <div className="relative">
              <select
                value={selectedModuleId}
                onChange={(e) => setSelectedModuleId(e.target.value)}
                className="bg-[#070B14] hover:bg-[#111A2E] border border-cyan-500/40 text-cyan-200 text-xs font-bold rounded-xl px-3 py-1.5 pr-8 transition cursor-pointer appearance-none shadow-inner"
              >
                {ALL_APPLICATION_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.defaultIcon} {m.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right: Quick Actions (Inherit, Reset, Export, Save, Close) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Inherit Global Theme */}
            <button
              type="button"
              onClick={handleInheritGlobal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer border border-slate-700"
              title="Reset this module to inherit global dashboard theme"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inherit Global</span>
            </button>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-700"
              title="Export Module Config JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Import JSON */}
            <button
              type="button"
              onClick={() => setShowImportDialog(true)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-700"
              title="Import Module Config JSON"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer border border-slate-700"
              title={isFullscreen ? 'Restore Window' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Save to DB */}
            <button
              type="button"
              onClick={handleSaveToDatabase}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/25 cursor-pointer border border-emerald-400/40"
              title="Save module styles to database"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveToast ? 'Saved ✓' : 'Save Config'}</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={closeModuleCustomizer}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* IMPORT JSON MODAL OVERLAY                                           */}
        {/* =================================================================== */}
        {showImportDialog && (
          <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#0B1120] border border-cyan-500/50 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Import Module Configuration JSON</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowImportDialog(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                rows={8}
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Paste exported JSON here e.g. {"config": { ... }}'
                className="w-full bg-[#070B14] border border-slate-700 rounded-xl p-3 text-xs font-mono text-cyan-200 focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportDialog(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportJSON}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30"
                >
                  Apply JSON
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* 3-COLUMN WORKSPACE: LEFT (Tabs & Controls) + CENTER (Live Preview)  */}
        {/* + RIGHT (Layer Stack & 3D Controls)                                 */}
        {/* =================================================================== */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 1: CONTROLS & 10 EDITING SECTIONS (4 cols)                 */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-4 flex flex-col h-full bg-[#070B14]/70 overflow-hidden">
            {/* Horizontal Tabs Bar */}
            <div className="flex items-center gap-1 p-2 bg-[#0E1628]/80 border-b border-slate-800 overflow-x-auto shrink-0 scrollbar-thin">
              {[
                { id: 'style', label: '1. Style', icon: Sparkles },
                { id: 'design', label: '2. Design', icon: Box },
                { id: 'color', label: '3. Colors', icon: Palette },
                { id: 'animation', label: '4. 3D Engine', icon: Zap },
                { id: 'layers', label: '5. Layers', icon: Layers },
                { id: 'layout', label: '6. Layout', icon: SlidersHorizontal },
                { id: 'typography', label: '7. Typography', icon: Type },
                { id: 'background', label: '8. Background', icon: Layers3 },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border-b-2 ${
                      isActive
                        ? 'border-cyan-400 text-white bg-[#111A2E] shadow-[0_4px_12px_rgba(6,182,212,0.18)]'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#111A2E]/50 font-medium'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              
              {/* ------------------------------------------------------------- */}
              {/* TAB 1: STYLE PRESETS (10 Selectable Presets)                  */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'style' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      10 Selectable Style Presets
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Instantly transform {activeModuleDef.name} with professionally engineered 3D aesthetics
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MODULE_PRESET_STYLES.map((preset) => {
                      const isSelected = draft.stylePreset === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset)}
                          style={{
                            borderColor: isSelected ? '#06B6D4' : '#1E293B',
                            backgroundColor: '#0B1120',
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer relative group hover:border-cyan-500/50 hover:shadow-lg ${
                            isSelected ? 'ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/20' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                              {preset.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className="w-3 h-3 rounded-full border border-black/40"
                                style={{ backgroundColor: preset.accentColor }}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-black/40"
                                style={{ backgroundColor: preset.primaryColor }}
                              />
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 line-clamp-2">
                            {preset.description}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-black/40 border border-slate-800">
                              Anim: {preset.animation}
                            </span>
                            {preset.glassmorphism && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                Glass
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 2: DESIGN EDITOR (Cards, Borders, Shadows, Padding)       */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'design' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Module Design & Structure
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Customize cards, borders, shadows, and component alignment
                    </p>
                  </div>

                  {/* Card Design Template */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Card Design Structure
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'modern', label: 'Modern' },
                        { id: 'glass', label: 'Glass' },
                        { id: 'neon', label: 'Neon' },
                        { id: 'elevated', label: 'Elevated' },
                        { id: 'minimal', label: 'Minimal' },
                        { id: 'cyber', label: 'Cyber' },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => updateDraft({ cardDesign: d.id as any })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            draft.cardDesign === d.id
                              ? 'bg-cyan-600 text-white border border-cyan-400'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Radius */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">Border Radius:</span>
                      <span className="font-mono text-cyan-300">{draft.borderRadius || '12px'}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['0px', '6px', '12px', '16px', '24px'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => updateDraft({ borderRadius: r })}
                          className={`py-1 rounded text-xs font-bold transition text-center cursor-pointer ${
                            draft.borderRadius === r
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Border Thickness */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">Border Thickness:</span>
                      <span className="font-mono text-cyan-300">{draft.borderWidth || '1px'}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['0px', '1px', '2px', '3px'].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateDraft({ borderWidth: w })}
                          className={`py-1 rounded text-xs font-bold transition text-center cursor-pointer ${
                            draft.borderWidth === w
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Shadow */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Card Shadows & Elevation
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'None', val: 'none' },
                        { id: 'subtle', label: 'Subtle', val: '0 2px 8px -1px rgba(0,0,0,0.2)' },
                        { id: 'medium', label: 'Medium', val: '0 8px 24px -4px rgba(0,0,0,0.4)' },
                        { id: 'deep', label: 'Deep 3D', val: '0 16px 36px -6px rgba(0,0,0,0.6)' },
                        { id: 'neon-glow', label: 'Neon Glow', val: '0 0 25px rgba(6, 182, 212, 0.4)' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => updateDraft({ shadow: s.val })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition text-left cursor-pointer ${
                            draft.shadow === s.val
                              ? 'bg-cyan-600 text-white border border-cyan-400'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Style */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Icon Presentation Style
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'classic', label: 'Classic' },
                        { id: 'neon', label: 'Neon' },
                        { id: 'glow', label: 'Glow' },
                        { id: 'minimal', label: 'Minimal' },
                      ].map((i) => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => updateDraft({ iconStyle: i.id as any })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            draft.iconStyle === i.id
                              ? 'bg-cyan-600 text-white border border-cyan-400'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {i.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 3: COLOR EDITOR (Pickers, Palettes, Gradients)            */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'color' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Module Scoped Color Studio
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Dedicated color controls for card, text, headings, borders, and gradients
                    </p>
                  </div>

                  {/* Gradient Background Toggle */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Gradient Card Background</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextGrad = !draft.hasGradient;
                          const gradStart = draft.gradientStart || '#1E3A8A';
                          const gradEnd = draft.gradientEnd || '#0B1120';
                          updateDraft({
                            hasGradient: nextGrad,
                            cardColor: nextGrad ? `linear-gradient(135deg, ${gradStart}, ${gradEnd})` : '#0B1120',
                          });
                        }}
                        className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer ${
                          draft.hasGradient
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {draft.hasGradient ? 'ACTIVE' : 'OFF'}
                      </button>
                    </div>

                    {draft.hasGradient && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Start Color:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draft.gradientStart || '#1E3A8A'}
                              onChange={(e) => {
                                const start = e.target.value;
                                const end = draft.gradientEnd || '#0B1120';
                                updateDraft({
                                  gradientStart: start,
                                  cardColor: `linear-gradient(135deg, ${start}, ${end})`,
                                });
                              }}
                              className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                            />
                            <span className="font-mono text-xs text-slate-300">{draft.gradientStart || '#1E3A8A'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">End Color:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={draft.gradientEnd || '#0B1120'}
                              onChange={(e) => {
                                const end = e.target.value;
                                const start = draft.gradientStart || '#1E3A8A';
                                updateDraft({
                                  gradientEnd: end,
                                  cardColor: `linear-gradient(135deg, ${start}, ${end})`,
                                });
                              }}
                              className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                            />
                            <span className="font-mono text-xs text-slate-300">{draft.gradientEnd || '#0B1120'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Individual Colors Grid */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Element Colors
                    </span>

                    {[
                      { label: 'Card Background', key: 'cardColor', def: '#0B1120' },
                      { label: 'Border Color', key: 'borderColor', def: '#1E293B' },
                      { label: 'Heading Text', key: 'headingColor', def: '#FFFFFF' },
                      { label: 'Body Text', key: 'textColor', def: '#F1F5F9' },
                      { label: 'Primary Accent', key: 'primaryColor', def: '#3B82F6' },
                      { label: 'Secondary Accent', key: 'secondaryColor', def: '#8B5CF6' },
                      { label: 'Icon Color', key: 'iconColor', def: '#06B6D4' },
                      { label: 'Hover Accent', key: 'hoverColor', def: '#38BDF8' },
                    ].map((item) => {
                      const curVal = (draft as any)[item.key] || item.def;
                      const isHex = typeof curVal === 'string' && curVal.startsWith('#');
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="text-slate-300">{item.label}:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={isHex ? curVal : item.def}
                              onChange={(e) => updateDraft({ [item.key]: e.target.value })}
                              className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={curVal}
                              onChange={(e) => updateDraft({ [item.key]: e.target.value })}
                              className="w-24 bg-[#070B14] border border-slate-700 rounded px-2 py-1 text-[11px] font-mono text-cyan-300"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Color Swatches */}
                  <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      Quick Palette Swatches
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { name: 'Cyan', hex: '#06B6D4', border: '#0891B2' },
                        { name: 'Blue', hex: '#3B82F6', border: '#2563EB' },
                        { name: 'Purple', hex: '#8B5CF6', border: '#7C3AED' },
                        { name: 'Emerald', hex: '#10B981', border: '#059669' },
                        { name: 'Amber', hex: '#F59E0B', border: '#D97706' },
                        { name: 'Rose', hex: '#F43F5E', border: '#E11D48' },
                        { name: 'Slate', hex: '#1E293B', border: '#334155' },
                        { name: 'Obsidian', hex: '#0B1120', border: '#1E293B' },
                      ].map((swatch) => (
                        <button
                          key={swatch.name}
                          type="button"
                          onClick={() =>
                            updateDraft({
                              primaryColor: swatch.hex,
                              accentColor: swatch.hex,
                              borderColor: swatch.border,
                            })
                          }
                          style={{ backgroundColor: swatch.hex }}
                          className="w-6 h-6 rounded-lg border border-black/40 shadow-xs hover:scale-110 transition-transform cursor-pointer"
                          title={swatch.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 4: 3D ANIMATION STUDIO                                    */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'animation' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Independent 3D Animation Engine
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Configure 3D floating, rotating, clouds, particles, and mouse-following tilt
                    </p>
                  </div>

                  {/* Enable / Disable Master Toggle */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Enable 3D Animations</div>
                      <div className="text-[10px] text-slate-400">Scoped to {activeModuleDef.name}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDraft({ animationEnabled: !draft.animationEnabled })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        draft.animationEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {draft.animationEnabled ? 'ACTIVE' : 'DISABLED'}
                    </button>
                  </div>

                  {/* Animation Effects Grid */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      3D Animation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'none', label: 'None (Static)' },
                        { id: 'float', label: '3D Floating Cards' },
                        { id: 'tilt', label: '3D Perspective Tilt' },
                        { id: 'rotating', label: '3D Rotating Elements' },
                        { id: 'cloud', label: '3D Cloud Drift' },
                        { id: 'pulse', label: 'Animated Pulse' },
                        { id: 'glow', label: 'Neon Glowing Aura' },
                      ].map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => updateDraft({ animation: a.id as any, animationEnabled: true })}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                            draft.animation === a.id
                              ? 'bg-cyan-600 text-white border border-cyan-400'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animation Speed & Depth Controls */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-bold">Animation Speed:</span>
                      <div className="flex items-center gap-1">
                        {(['slow', 'normal', 'fast'] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => updateDraft({ animationSpeed: spd })}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase transition cursor-pointer ${
                              draft.animationSpeed === spd
                                ? 'bg-cyan-600 text-white'
                                : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {spd}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">3D Perspective Depth:</span>
                        <span className="font-mono text-cyan-300">{draft.depth3D ?? 15}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={50}
                        value={draft.depth3D ?? 15}
                        onChange={(e) => updateDraft({ depth3D: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>

                    {/* Mouse-following 3D Tilt Physics */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                      <span className="text-slate-300 font-bold">Mouse-Following 3D Physics:</span>
                      <button
                        type="button"
                        onClick={() => updateDraft({ mouseFollowTilt: !draft.mouseFollowTilt })}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                          draft.mouseFollowTilt
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {draft.mouseFollowTilt ? 'ENABLED' : 'OFF'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 5: LAYER EDITOR (9 Visual Layers)                         */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'layers' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Visual 9-Layer Management Stack
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Toggle visibility, adjust opacity, and configure z-index for every module layer
                    </p>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: 'background', name: '1. Background Layer', desc: 'Canvas backdrop and mesh grid' },
                      { id: 'container', name: '2. Container Layer', desc: 'Outer structural boundary' },
                      { id: 'header', name: '3. Header Layer', desc: 'Title, icon and action pills' },
                      { id: 'card', name: '4. Card Layer', desc: 'Main telemetry surface' },
                      { id: 'icon', name: '5. Icon Layer', desc: 'Brand SVG and glowing glyphs' },
                      { id: 'content', name: '6. Content Layer', desc: 'Metric metrics, tables, and sparklines' },
                      { id: 'animation', name: '7. Animation Layer', desc: '3D particles and rotating effects' },
                      { id: 'border', name: '8. Border Layer', desc: 'Neon rim and metallic bevel' },
                      { id: 'shadow', name: '9. Shadow Layer', desc: 'Ambient 3D depth and glow aura' },
                    ].map((layerItem) => {
                      const lKey = layerItem.id as keyof ModuleLayersConfig;
                      const layerConf = draft.layers?.[lKey] || DEFAULT_MODULE_LAYERS[lKey];
                      const isVis = layerConf.visible !== false;

                      return (
                        <div
                          key={layerItem.id}
                          className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2 transition-all hover:border-slate-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateLayer(lKey, { visible: !isVis })}
                                className={`p-1 rounded transition cursor-pointer ${
                                  isVis ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-600 bg-slate-800'
                                }`}
                                title={isVis ? 'Hide Layer' : 'Show Layer'}
                              >
                                {isVis ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                              <div>
                                <span className="text-xs font-bold text-white block">{layerItem.name}</span>
                                <span className="text-[10px] text-slate-400">{layerItem.desc}</span>
                              </div>
                            </div>

                            <span className="font-mono text-[11px] text-cyan-300">
                              {Math.round((layerConf.opacity ?? 1) * 100)}%
                            </span>
                          </div>

                          {/* Opacity Slider */}
                          <div className="flex items-center gap-3 pt-1">
                            <span className="text-[10px] text-slate-400">Opacity:</span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={layerConf.opacity ?? 1}
                              onChange={(e) => updateLayer(lKey, { opacity: Number(e.target.value) })}
                              className="flex-1 accent-cyan-400 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 6: LAYOUT EDITOR (Width, Height, Padding, Alignment)      */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'layout' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Module Layout & Spacing
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Adjust padding, margins, card dimensions and visibility
                    </p>
                  </div>

                  {/* Visibility Toggle */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Module Visibility on Dashboard</div>
                      <div className="text-[10px] text-slate-400">Toggle whether this card displays</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateDraft({ visible: !draft.visible })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        draft.visible !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                      }`}
                    >
                      {draft.visible !== false ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                  </div>

                  {/* Padding */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Card Inner Padding
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {['8px', '12px', '16px', '24px'].map((pad) => (
                        <button
                          key={pad}
                          type="button"
                          onClick={() => updateDraft({ padding: pad })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            draft.padding === pad
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {pad}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Alignment */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Component Alignment
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'left', label: 'Left' },
                        { id: 'center', label: 'Center' },
                        { id: 'split', label: 'Split' },
                      ].map((al) => (
                        <button
                          key={al.id}
                          type="button"
                          onClick={() => updateDraft({ alignment: al.id as any })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            draft.alignment === al.id
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {al.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 7: TYPOGRAPHY EDITOR (Fonts, Sizes, Weights)              */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'typography' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Module Typography Studio
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Font families, sizes, and font weights for this specific module
                    </p>
                  </div>

                  {/* Font Family */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Font Family
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { name: 'Inter (Default)', val: 'Inter, system-ui, sans-serif' },
                        { name: 'JetBrains Mono (Code)', val: '"JetBrains Mono", monospace' },
                        { name: 'Space Grotesk (Tech)', val: '"Space Grotesk", sans-serif' },
                        { name: 'Roboto (Clean)', val: 'Roboto, sans-serif' },
                      ].map((f) => (
                        <button
                          key={f.val}
                          type="button"
                          onClick={() => updateDraft({ fontFamily: f.val })}
                          className={`w-full p-2.5 rounded-lg text-xs font-bold text-left transition cursor-pointer ${
                            draft.fontFamily === f.val
                              ? 'bg-cyan-600 text-white border border-cyan-400'
                              : 'bg-[#070B14] text-slate-300 hover:text-white border border-slate-800'
                          }`}
                          style={{ fontFamily: f.val }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Base Font Size
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'sm', label: '12px Small' },
                        { id: 'base', label: '14px Base' },
                        { id: 'lg', label: '16px Large' },
                        { id: 'xl', label: '18px XL' },
                      ].map((sz) => (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => updateDraft({ fontSize: sz.id as any })}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                            draft.fontSize === sz.id
                              ? 'bg-cyan-600 text-white'
                              : 'bg-[#070B14] text-slate-400 hover:text-white border border-slate-800'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* TAB 8: BACKGROUND & GLASSMORPHISM EDITOR                     */}
              {/* ------------------------------------------------------------- */}
              {activeTab === 'background' && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                      Module Background & Glassmorphism
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Configure acrylic blur, translucent opacity, and surface filters
                    </p>
                  </div>

                  {/* Glassmorphism Toggle */}
                  <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">Glassmorphism Frosted Acrylic</div>
                      <div className="text-[10px] text-slate-400">Backdrop blur and translucent sheen</div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft({
                          glassmorphism: !draft.glassmorphism,
                          cardColor: !draft.glassmorphism ? 'rgba(15, 23, 42, 0.72)' : '#0B1120',
                        })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        draft.glassmorphism
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {draft.glassmorphism ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>

                  {/* Blur Slider */}
                  {draft.glassmorphism && (
                    <div className="bg-[#0B1120] p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold">Backdrop Blur Strength:</span>
                        <span className="font-mono text-cyan-300">{draft.blur ?? 12}px</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={draft.blur ?? 12}
                        onChange={(e) => updateDraft({ blur: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 2: CENTER LIVE PREVIEW WORKSPACE (5 cols)                  */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-5 flex flex-col h-full bg-[#050811] overflow-hidden">
            
            {/* Viewport & Controls Header */}
            <div className="p-3 bg-[#0B1120] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Live 3D Preview:
                </span>
                <span className="text-xs font-bold text-white">{activeModuleDef.name}</span>
              </div>

              {/* Device Viewport Selector */}
              <div className="flex items-center gap-1 bg-[#070B14] p-1 rounded-lg border border-slate-800">
                {[
                  { id: 'desktop', icon: Monitor, title: 'Desktop (100%)' },
                  { id: 'tablet', icon: Tablet, title: 'Tablet (768px)' },
                  { id: 'mobile', icon: Smartphone, title: 'Mobile (380px)' },
                ].map((vp) => {
                  const Icon = vp.icon;
                  return (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => setPreviewViewport(vp.id as any)}
                      className={`p-1 rounded text-xs transition cursor-pointer ${
                        previewViewport === vp.id
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title={vp.title}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Preview Canvas with Mouse Tilt Physics */}
            <div
              className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Outer Viewport Constrainer */}
              <div
                style={{
                  width:
                    previewViewport === 'mobile'
                      ? '360px'
                      : previewViewport === 'tablet'
                      ? '540px'
                      : '100%',
                  maxWidth: '100%',
                  transition: 'width 0.3s ease',
                  perspective: '1000px',
                }}
              >
                {/* 3D Tilted Card Preview */}
                <div
                  ref={previewRef}
                  style={{
                    background: draft.cardColor || '#0B1120',
                    borderColor: draft.borderColor || '#1E293B',
                    borderWidth: draft.borderWidth || '1px',
                    borderRadius: draft.borderRadius || '12px',
                    color: draft.textColor || '#F1F5F9',
                    fontFamily: draft.fontFamily || 'Inter, system-ui, sans-serif',
                    padding: draft.padding || '16px',
                    boxShadow: draft.shadow || '0 8px 24px -4px rgba(0,0,0,0.4)',
                    backdropFilter: draft.glassmorphism ? `blur(${draft.blur || 12}px)` : undefined,
                    WebkitBackdropFilter: draft.glassmorphism ? `blur(${draft.blur || 12}px)` : undefined,
                    transform: `perspective(1000px) rotateX(${tiltPhysics.rotateX}deg) rotateY(${tiltPhysics.rotateY}deg) translateZ(${draft.depth3D || 0}px)`,
                    transition:
                      tiltPhysics.rotateX === 0 && tiltPhysics.rotateY === 0
                        ? 'transform 0.4s ease'
                        : 'transform 0.05s ease-out',
                  }}
                  className={`border transition-all duration-150 relative overflow-hidden group select-none shadow-2xl ${
                    draft.animation === 'pulse' && draft.animationEnabled
                      ? 'animate-pulse'
                      : ''
                  }`}
                >
                  {/* Glowing 3D Corner Accent */}
                  <div
                    className="absolute -top-12 -right-12 w-28 h-28 rounded-full pointer-events-none opacity-40 blur-xl"
                    style={{ backgroundColor: draft.accentColor || '#06B6D4' }}
                  />

                  {/* Header Layer */}
                  <div
                    className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 relative z-10"
                    style={{
                      opacity: draft.layers?.header?.opacity ?? 1,
                      display: draft.layers?.header?.visible === false ? 'none' : 'flex',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border border-white/15 shadow-inner"
                        style={{
                          backgroundColor: `${draft.primaryColor || '#3B82F6'}20`,
                          color: draft.iconColor || draft.accentColor || '#06B6D4',
                          opacity: draft.layers?.icon?.opacity ?? 1,
                          display: draft.layers?.icon?.visible === false ? 'none' : 'flex',
                        }}
                      >
                        {activeModuleDef.defaultIcon}
                      </div>
                      <div>
                        <h4
                          className="text-xs sm:text-sm font-black tracking-tight"
                          style={{ color: draft.headingColor || '#FFFFFF' }}
                        >
                          {activeModuleDef.name}
                        </h4>
                        <p className="text-[10px] opacity-75 truncate max-w-[200px]">
                          {activeModuleDef.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-white/10"
                        style={{
                          backgroundColor: `${draft.accentColor || '#06B6D4'}25`,
                          color: draft.accentColor || '#06B6D4',
                        }}
                      >
                        LIVE 3D
                      </span>
                    </div>
                  </div>

                  {/* Content Layer (Dynamic Based on Module Type) */}
                  <div
                    className="space-y-3 relative z-10"
                    style={{
                      opacity: draft.layers?.content?.opacity ?? 1,
                      display: draft.layers?.content?.visible === false ? 'none' : 'block',
                    }}
                  >
                    {/* Telemetry Metric Counts */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div
                          className="text-3xl font-black tracking-tight"
                          style={{ color: draft.headingColor || '#FFFFFF' }}
                        >
                          {activeModuleDef.id.includes('servers')
                            ? '4'
                            : activeModuleDef.id.includes('docker')
                            ? '1'
                            : activeModuleDef.id.includes('alerts')
                            ? '0'
                            : '2'}
                        </div>
                        <div
                          className="text-[11px] font-bold flex items-center gap-1 mt-0.5"
                          style={{ color: draft.primaryColor || '#10B981' }}
                        >
                          <span>↑ 100% Operational</span>
                        </div>
                      </div>

                      {/* Mini Sparkline Chart */}
                      <div className="w-24 h-9 flex items-center justify-end">
                        <svg viewBox="0 0 100 35" className="w-full h-full overflow-visible">
                          <path
                            d="M 0,25 L 20,20 L 40,22 L 60,10 L 80,14 L 100,5"
                            fill="none"
                            stroke={draft.accentColor || '#06B6D4'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Operational Tags */}
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-black/30 border border-white/10">
                        Node: vm01siva-mon
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/30 border border-white/10">
                        Status: Healthy
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tilt Instruction Note */}
                <div className="text-center mt-3 text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
                  <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>Move cursor over card to test interactive 3D perspective tilt</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 3: RIGHT PANEL (Layer Tree & Quick 3D Physics) (3 cols)    */}
          {/* ----------------------------------------------------------------- */}
          <div className="lg:col-span-3 flex flex-col h-full bg-[#070B14]/80 p-4 space-y-4 overflow-y-auto">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Layer Tree Overview
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Visual stack of 9 independent layers
              </p>
            </div>

            {/* Visual Layer Exploded Stack Card */}
            <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Exploded Layer Stack
              </span>
              <div className="space-y-1 font-mono text-[11px]">
                {[
                  { name: 'Border & Rim', layer: 'border', color: draft.borderColor },
                  { name: 'Animation FX', layer: 'animation', color: draft.accentColor },
                  { name: 'Content & Charts', layer: 'content', color: draft.textColor },
                  { name: 'Icons & Glyph', layer: 'icon', color: draft.primaryColor },
                  { name: 'Card Surface', layer: 'card', color: draft.cardColor },
                  { name: 'Background Canvas', layer: 'background', color: '#050811' },
                ].map((stk, idx) => {
                  const lKey = stk.layer as keyof ModuleLayersConfig;
                  const isVis = draft.layers?.[lKey]?.visible !== false;
                  return (
                    <div
                      key={stk.layer}
                      className={`flex items-center justify-between p-1.5 rounded transition ${
                        isVis ? 'bg-[#070B14] text-slate-200' : 'bg-[#070B14]/40 text-slate-600 line-through'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isVis ? stk.color || '#3B82F6' : '#475569' }}
                        />
                        <span>{stk.name}</span>
                      </span>
                      <span className="text-[10px] text-slate-500">L{6 - idx}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick 3D Depth Card */}
            <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                3D Physics Settings
              </span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Z-Depth:</span>
                <span className="font-mono text-cyan-300">{draft.depth3D ?? 15}px</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Animation:</span>
                <span className="font-mono text-purple-300 uppercase">{draft.animation || 'none'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Glassmorphism:</span>
                <span className={`font-mono ${draft.glassmorphism ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {draft.glassmorphism ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>

            {/* Module Scoped Selector Info */}
            <div className="bg-[#0B1120] p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Strict Scoping Rule
              </span>
              <div className="bg-[#070B14] p-2 rounded border border-slate-800 font-mono text-[10px] text-cyan-300 break-all">
                [data-module-id=&quot;{selectedModuleId}&quot;]
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Styles are strictly scoped to this selector. Changing {activeModuleDef.name} will NEVER affect other dashboard modules.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
