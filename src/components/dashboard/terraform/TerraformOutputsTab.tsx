'use client';

import React, { useState } from 'react';
import {
  FileText,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

interface TerraformOutputsTabProps {
  activeProject: any;
}

export function TerraformOutputsTab({ activeProject }: TerraformOutputsTabProps) {
  const [unmaskedKeys, setUnmaskedKeys] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const outputs: Record<string, { value: any; sensitive: boolean; type?: string }> =
    activeProject?.outputs || {};

  const toggleMask = (key: string) => {
    setUnmaskedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const entries = Object.entries(outputs);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0D1526]/85 border border-purple-500/25 rounded-2xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-400" />
          <span>Terraform Provisioned Outputs</span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Values exposed by output blocks in outputs.tf (Public IPs, endpoints, IDs, ARNs). Sensitive values are masked by default to protect secrets.
        </p>
      </div>

      {entries.length > 0 ? (
        <div className="bg-[#0D1526]/90 border border-purple-500/25 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#080D1A] text-gray-400 border-b border-[#1E293B] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Output Name</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {entries.map(([key, data]) => {
                  const isSensitive = data.sensitive;
                  const isRevealed = unmaskedKeys.includes(key);
                  const displayValue = isSensitive && !isRevealed
                    ? '••••••••••••••••'
                    : typeof data.value === 'object'
                    ? JSON.stringify(data.value)
                    : String(data.value ?? '');

                  return (
                    <tr key={key} className="hover:bg-[#131D35]/50 transition">
                      <td className="py-3 px-4 font-bold text-cyan-300">{key}</td>
                      <td className="py-3 px-4 text-gray-200">
                        <span className="bg-[#080D1A] px-2.5 py-1 rounded-lg border border-[#1E293B]">
                          {displayValue}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{data.type || 'string'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {isSensitive && (
                          <button
                            type="button"
                            onClick={() => toggleMask(key)}
                            className="p-1 rounded bg-[#131D35] text-gray-400 hover:text-white cursor-pointer"
                            title={isRevealed ? 'Mask' : 'Reveal'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(key, String(data.value))}
                          className="p-1 rounded bg-[#131D35] text-gray-400 hover:text-cyan-400 cursor-pointer"
                          title="Copy"
                        >
                          {copiedKey === key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-[#0D1526]/85 border border-[#1E293B] text-center text-gray-400 text-xs space-y-2">
          <FileText className="w-8 h-8 text-purple-400 mx-auto" />
          <p className="font-bold text-gray-300">No provisioned outputs found</p>
          <p className="text-gray-500 max-w-sm mx-auto">
            Outputs will appear here after you define output blocks in outputs.tf and run <strong className="text-cyan-300 font-mono">terraform apply</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
