'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  RotateCcw,
  Check,
  Palette,
  Eye,
  EyeOff,
  Layers,
  Sliders,
  Box,
} from 'lucide-react';
import { useTheme, ModuleStyleConfig } from '@/context/ThemeContext';

export interface ModuleDefinition {
  id: string;
  name: string;
  category: 'Overview' | 'Compute & Servers' | 'DevOps & Tooling' | 'Monitoring & Logs';
  defaultIcon: string;
  description: string;
}

export const ALL_APPLICATION_MODULES: ModuleDefinition[] = [
  // Overview Summary Cards
  { id: 'aws-resources', name: 'AWS Resources Card', category: 'Overview', defaultIcon: '☁️', description: 'Total AWS cloud infrastructure assets' },
  { id: 'azure-resources', name: 'Azure Resources Card', category: 'Overview', defaultIcon: '🔷', description: 'Total Azure subscription resources' },
  { id: 'total-servers', name: 'Total Servers Card', category: 'Overview', defaultIcon: '🖥️', description: 'Aggregated compute instances count' },
  { id: 'docker-containers', name: 'Docker Containers Card', category: 'Overview', defaultIcon: '🐳', description: 'Active container runtime summary' },
  { id: 'k8s-clusters', name: 'Kubernetes Clusters Card', category: 'Overview', defaultIcon: '☸️', description: 'Active K8s clusters and pods' },
  { id: 'active-alerts', name: 'Active Alerts Card', category: 'Overview', defaultIcon: '⚠️', description: 'Triggered alarms and threshold alerts' },

  // Main Dashboard Sections
  { id: 'operations-matrix', name: 'Multi-Cloud Operations Matrix', category: 'Overview', defaultIcon: '⚡', description: '3D animated 6-module command deck' },
  { id: 'cloud-distribution', name: 'Cloud Distribution Fleet', category: 'Overview', defaultIcon: '📊', description: 'AWS vs Azure allocation donut chart' },
  { id: 'server-status-fleet', name: 'Server Status Fleet', category: 'Overview', defaultIcon: '🟢', description: 'Live server heatmap & latency matrix' },

  // Compute & Cloud
  { id: 'regions', name: 'Regions Module', category: 'Compute & Servers', defaultIcon: '🗺️', description: 'Global multi-cloud regional catalog' },
  { id: 'servers', name: 'Servers Registry', category: 'Compute & Servers', defaultIcon: '🗄️', description: 'Full server inventory and terminal access' },
  { id: 'ec2-instances', name: 'AWS EC2 Instances', category: 'Compute & Servers', defaultIcon: '📦', description: 'Amazon Elastic Compute Cloud instances' },
  { id: 'azure-vms', name: 'Azure Virtual Machines', category: 'Compute & Servers', defaultIcon: '💻', description: 'Microsoft Azure VM instances' },
  { id: 'on-premises', name: 'On-Premises Servers', category: 'Compute & Servers', defaultIcon: '🏢', description: 'Bare metal and private datacenter hosts' },

  // DevOps & Tooling
  { id: 'docker', name: 'Docker Module', category: 'DevOps & Tooling', defaultIcon: '🐳', description: 'Container logs, volumes and images' },
  { id: 'kubernetes', name: 'Kubernetes Module', category: 'DevOps & Tooling', defaultIcon: '☸️', description: 'Nodes, pods, services and deployments' },
  { id: 'nginx', name: 'Nginx Module', category: 'DevOps & Tooling', defaultIcon: '🌐', description: 'Reverse proxy, upstreams and SSL config' },
  { id: 'maven', name: 'Maven Module', category: 'DevOps & Tooling', defaultIcon: '☕', description: 'Java build automation and POM pipelines' },
  { id: 'ansible', name: 'Ansible Module', category: 'DevOps & Tooling', defaultIcon: '⚡', description: 'Playbook automation and execution logs' },

  // Monitoring
  { id: 'alerts', name: 'Alerts Center', category: 'Monitoring & Logs', defaultIcon: '🚨', description: 'Incident management and threshold rules' },
  { id: 'metrics-explorer', name: 'Metrics Explorer', category: 'Monitoring & Logs', defaultIcon: '📈', description: 'Time-series telemetry charts' },
  { id: 'notification-channels', name: 'Notification Channels', category: 'Monitoring & Logs', defaultIcon: '🔔', description: 'Email, Slack and webhook destinations' },
];

interface ModuleStyleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialModuleId?: string;
}

export function ModuleStyleEditorModal({
  isOpen,
  onClose,
  initialModuleId = 'aws-resources',
}: ModuleStyleEditorModalProps) {
  const {
    getModuleStyle,
    updateModuleStyle,
    resetModuleStyle,
    cardBackground,
    borderColor,
    textColor,
    borderRadius,
  } = useTheme();

  const [selectedModuleId, setSelectedModuleId] = useState<string>(initialModuleId);

  // Active module definition
  const activeModule = ALL_APPLICATION_MODULES.find(m => m.id === selectedModuleId) || ALL_APPLICATION_MODULES[0];

  // Local style draft
  const currentStyle: ModuleStyleConfig = getModuleStyle(selectedModuleId);
  const [cardColor, setCardColor] = useState<string>(currentStyle.cardColor || cardBackground || '#0B1120');
  const [modText, setModText] = useState<string>(currentStyle.textColor || textColor || '#F1F5F9');
  const [modBorder, setModBorder] = useState<string>(currentStyle.borderColor || borderColor || '#1E293B');
  const [modRadius, setModRadius] = useState<string>(currentStyle.borderRadius || borderRadius || '12px');
  const [modShadow, setModShadow] = useState<string>(currentStyle.shadow || 'subtle');
  const [modAnimation, setModAnimation] = useState<ModuleStyleConfig['animation']>(currentStyle.animation || 'none');
  const [modIconStyle, setModIconStyle] = useState<ModuleStyleConfig['iconStyle']>(currentStyle.iconStyle || 'classic');
  const [modVisible, setModVisible] = useState<boolean>(currentStyle.visible !== false);
  const [hasGradient, setHasGradient] = useState<boolean>(!!currentStyle.gradient);
  const [gradientStart, setGradientStart] = useState<string>('#1E3A8A');
  const [gradientEnd, setGradientEnd] = useState<string>('#0B1120');

  // Handle module switch
  const handleSelectModule = (modId: string) => {
    setSelectedModuleId(modId);
    const style = getModuleStyle(modId);
    setCardColor(style.cardColor || cardBackground || '#0B1120');
    setModText(style.textColor || textColor || '#F1F5F9');
    setModBorder(style.borderColor || borderColor || '#1E293B');
    setModRadius(style.borderRadius || borderRadius || '12px');
    setModShadow(style.shadow || 'subtle');
    setModAnimation(style.animation || 'none');
    setModIconStyle(style.iconStyle || 'classic');
    setModVisible(style.visible !== false);
    setHasGradient(!!style.gradient);
  };

  const handleApply = () => {
    updateModuleStyle(selectedModuleId, {
      cardColor: hasGradient ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : cardColor,
      textColor: modText,
      borderColor: modBorder,
      borderRadius: modRadius,
      shadow: modShadow === 'neon-glow' ? '0 0 20px rgba(56, 189, 248, 0.35)' : modShadow === 'deep' ? '0 12px 30px rgba(0,0,0,0.5)' : undefined,
      animation: modAnimation,
      iconStyle: modIconStyle,
      visible: modVisible,
      gradient: hasGradient ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : undefined,
    });
  };

  const handleResetModule = () => {
    resetModuleStyle(selectedModuleId);
    setCardColor(cardBackground || '#0B1120');
    setModText(textColor || '#F1F5F9');
    setModBorder(borderColor || '#1E293B');
    setModRadius(borderRadius || '12px');
    setModShadow('subtle');
    setModAnimation('none');
    setModIconStyle('classic');
    setModVisible(true);
    setHasGradient(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#0B1120] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-[#0E1628]/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Individual Module Appearance Editor</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  SCOPED STYLING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize colors, borders, shadows & animations for specific dashboard modules without affecting others
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Modules List + Right Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-800">
          
          {/* Left: Module Selector (4 cols) */}
          <div className="md:col-span-4 p-3 sm:p-4 space-y-3 bg-[#070B14]/60">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block px-1">
              Select Module to Customize ({ALL_APPLICATION_MODULES.length})
            </span>

            <div className="space-y-1 max-h-[58vh] overflow-y-auto pr-1">
              {ALL_APPLICATION_MODULES.map(m => {
                const isSelected = m.id === selectedModuleId;
                const hasCustom = !!getModuleStyle(m.id).cardColor;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModule(m.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20'
                        : 'bg-[#0E1628] hover:bg-[#111A2E] text-slate-300 border border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{m.defaultIcon}</span>
                      <span className="truncate">{m.name}</span>
                    </div>
                    {hasCustom && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Custom style active"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Customization Controls (8 cols) */}
          <div className="md:col-span-8 p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[65vh]">
            
            {/* Live Mini Preview Box */}
            <div className="bg-[#070B14] p-4 rounded-xl border border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
                Live Module Preview: {activeModule.name}
              </span>

              <div
                style={{
                  background: hasGradient ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})` : cardColor,
                  color: modText,
                  borderColor: modBorder,
                  borderRadius: modRadius,
                }}
                className={`p-4 border transition-all ${
                  modShadow === 'neon-glow'
                    ? 'shadow-lg shadow-cyan-500/30'
                    : modShadow === 'deep'
                    ? 'shadow-2xl'
                    : 'shadow-md'
                } ${modAnimation === 'pulse' ? 'animate-pulse' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{activeModule.defaultIcon}</span>
                    <div>
                      <div className="font-bold text-xs" style={{ color: modText }}>{activeModule.name}</div>
                      <div className="text-[10px] opacity-75">{activeModule.description}</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30 border border-white/10">
                    Active Preview
                  </span>
                </div>
              </div>
            </div>

            {/* Color Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Card Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={cardColor}
                    onChange={(e) => setCardColor(e.target.value)}
                    className="flex-1 bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Text & Content Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={modText}
                    onChange={(e) => setModText(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={modText}
                    onChange={(e) => setModText(e.target.value)}
                    className="flex-1 bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Border Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={modBorder}
                    onChange={(e) => setModBorder(e.target.value)}
                    className="w-9 h-9 rounded-lg bg-transparent border border-slate-700 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={modBorder}
                    onChange={(e) => setModBorder(e.target.value)}
                    className="flex-1 bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Border Radius</label>
                <select
                  value={modRadius}
                  onChange={(e) => setModRadius(e.target.value)}
                  className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg"
                >
                  <option value="0px">Sharp (0px)</option>
                  <option value="8px">Subtle (8px)</option>
                  <option value="12px">Standard (12px)</option>
                  <option value="16px">Smooth (16px)</option>
                  <option value="24px">Pill / Curved (24px)</option>
                </select>
              </div>
            </div>

            {/* Gradient Background Toggle */}
            <div className="p-3 bg-[#070B14] rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Gradient Card Background</span>
                <input
                  type="checkbox"
                  checked={hasGradient}
                  onChange={(e) => setHasGradient(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {hasGradient && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientStart}
                      onChange={(e) => setGradientStart(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">Start: {gradientStart}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradientEnd}
                      onChange={(e) => setGradientEnd(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                    <span className="text-[10px] text-slate-400 font-mono">End: {gradientEnd}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card Shadow & Animation Effects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Shadow & Glow</label>
                <select
                  value={modShadow}
                  onChange={(e) => setModShadow(e.target.value)}
                  className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg"
                >
                  <option value="none">No Shadow</option>
                  <option value="subtle">Subtle Shadow</option>
                  <option value="medium">Medium Depth</option>
                  <option value="deep">Deep Elevation</option>
                  <option value="neon-glow">Neon Ambient Glow</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Module Animation</label>
                <select
                  value={modAnimation}
                  onChange={(e) => setModAnimation(e.target.value as any)}
                  className="w-full bg-[#0E1628] border border-slate-700 text-xs text-white p-2 rounded-lg"
                >
                  <option value="none">Static (No Animation)</option>
                  <option value="pulse">Pulse Glow</option>
                  <option value="tilt">3D Hover Tilt</option>
                  <option value="float">Floating Levitation</option>
                </select>
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#070B14] rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                {modVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-rose-400" />}
                <span className="text-xs font-semibold text-white">Module Visibility on Dashboard</span>
              </div>
              <button
                type="button"
                onClick={() => setModVisible(!modVisible)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  modVisible
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {modVisible ? 'Visible' : 'Hidden'}
              </button>
            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-800 bg-[#0E1628]/90 flex items-center justify-between gap-3">
          <button
            onClick={handleResetModule}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset This Module</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleApply();
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
