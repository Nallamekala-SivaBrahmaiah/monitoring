'use client';

import React, { useState } from 'react';
import {
  Zap,
  Layers,
  ArrowRight,
  FileCode,
  CheckCircle2,
  Eye,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import { ENTERPRISE_TERRAFORM_TEMPLATES } from '@/app/api/terraform/templates/route';

interface TerraformTemplatesTabProps {
  onCloneTemplate: (template: any) => Promise<void>;
}

export function TerraformTemplatesTab({ onCloneTemplate }: TerraformTemplatesTabProps) {
  const [providerFilter, setProviderFilter] = useState<'all' | 'aws' | 'azure'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  const filtered = ENTERPRISE_TERRAFORM_TEMPLATES.filter((t) => {
    if (providerFilter !== 'all' && t.provider !== providerFilter) return false;
    return true;
  });

  const handleClone = async (t: any) => {
    setCloning(t.id);
    try {
      await onCloneTemplate(t);
    } catch (e) {
      console.error(e);
    } finally {
      setCloning(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>Enterprise Terraform Production Templates</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Battle-tested, production-ready Infrastructure as Code configurations for AWS and Microsoft Azure. Includes full multi-file HCL architectures, VPCs, compute nodes, and managed Kubernetes clusters.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          {['all', 'aws', 'azure'].map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p as any)}
              className={`px-3 py-1.5 rounded-lg font-bold uppercase text-[10px] transition cursor-pointer ${
                providerFilter === p
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-[#080D1A] text-gray-400 hover:text-white border border-[#1E293B]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((t) => {
          const isAws = t.provider === 'aws';
          return (
            <div
              key={t.id}
              className="p-5 rounded-2xl bg-[#0D1526]/85 border border-purple-500/20 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {isAws ? <AwsLogo className="w-5 h-5" /> : <AzureLogo className="w-5 h-5" />}
                    <span className="text-[10px] font-bold uppercase text-gray-400 font-mono">
                      {t.category}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-500/20 text-purple-300 font-mono">
                    {t.provider}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{t.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{t.description}</p>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {t.resources.slice(0, 3).map((r: string) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 rounded-md bg-[#080D1A] text-cyan-300 font-mono text-[10px] border border-cyan-500/20"
                    >
                      {r}
                    </span>
                  ))}
                  {t.resources.length > 3 && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      +{t.resources.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(t)}
                  className="px-3 py-1.5 bg-[#131D35] hover:bg-[#18233C] text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClone(t)}
                  disabled={cloning === t.id}
                  className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <span>{cloning === t.id ? 'Creating...' : 'Use Template'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1526] border border-purple-500/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{previewTemplate.name}</h3>
                <span className="text-xs text-gray-400 font-mono">Provider: {previewTemplate.provider.toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 font-mono text-xs">
              {previewTemplate.files.map((f: any) => (
                <div key={f.name} className="space-y-1">
                  <span className="text-cyan-400 font-bold block">{f.name}</span>
                  <pre className="p-3 rounded-xl bg-[#080D1A] border border-[#1E293B] text-gray-200 overflow-x-auto leading-relaxed">
                    {f.content}
                  </pre>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-slate-800 text-gray-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = previewTemplate;
                  setPreviewTemplate(null);
                  handleClone(t);
                }}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Create Project From Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
