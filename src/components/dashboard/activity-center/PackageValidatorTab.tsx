'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCode,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCw,
} from 'lucide-react';

export function PackageValidatorTab() {
  const [command, setCommand] = useState(
    'sudo apt-get update && sudo apt-get install -y openjdk-17-jdk git curl'
  );
  const [osType, setOsType] = useState<'ubuntu' | 'debian' | 'amazon_linux' | 'rhel'>('ubuntu');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = [
    {
      name: 'Java 17 JDK',
      ubuntu: 'sudo apt-get update && sudo apt-get install -y openjdk-17-jdk',
      rhel: 'sudo dnf install -y java-17-openjdk-devel',
    },
    {
      name: 'Docker Engine',
      ubuntu:
        'sudo apt-get update && sudo apt-get install -y ca-certificates curl gnupg && sudo install -m 0755 -d /etc/apt/keyrings && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null && sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
      rhel: 'sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo && sudo dnf install -y docker-ce docker-ce-cli containerd.io && sudo systemctl enable --now docker',
    },
    {
      name: 'Jenkins CI/CD',
      ubuntu:
        'sudo apt-get update && sudo apt-get install -y openjdk-17-jre fontconfig && sudo wget -O /usr/share/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key && echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null && sudo apt-get update && sudo apt-get install -y jenkins && sudo systemctl enable --now jenkins',
      rhel: 'sudo dnf install -y java-17-openjdk && sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo && sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key && sudo dnf install -y jenkins && sudo systemctl enable --now jenkins',
    },
    {
      name: 'Node.js 20 LTS',
      ubuntu:
        'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs',
      rhel: 'curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo dnf install -y nodejs',
    },
    {
      name: 'Python 3 & Pip',
      ubuntu: 'sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv',
      rhel: 'sudo dnf install -y python3 python3-pip',
    },
    {
      name: 'Nginx Web Server',
      ubuntu:
        'sudo apt-get update && sudo apt-get install -y nginx && sudo systemctl enable --now nginx',
      rhel: 'sudo dnf install -y nginx && sudo systemctl enable --now nginx',
    },
    {
      name: 'Aqua Trivy',
      ubuntu:
        'sudo apt-get install -y wget apt-transport-https gnupg lsb-release && wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo gpg --dearmor -o /usr/share/keyrings/trivy.gpg --yes && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list && sudo apt-get update && sudo apt-get install -y trivy',
      rhel: 'sudo rpm -ivh https://github.com/aquasecurity/trivy/releases/download/v0.49.0/trivy_0.49.0_Linux-64bit.rpm',
    },
    {
      name: 'Kubernetes (kubectl)',
      ubuntu:
        'curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg --yes && echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /" | sudo tee /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update && sudo apt-get install -y kubectl',
      rhel: 'cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo\n[kubernetes]\nname=Kubernetes\nbaseurl=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/\nenabled=1\ngpgcheck=1\ngpgkey=https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key\nEOF\nsudo dnf install -y kubectl',
    },
  ];

  const handleSelectPreset = (preset: (typeof presets)[0]) => {
    const isDeb = osType === 'ubuntu' || osType === 'debian';
    setCommand(isDeb ? preset.ubuntu : preset.rhel);
    setResult(null);
  };

  const handleValidate = async () => {
    if (!command.trim()) return;
    setValidating(true);
    try {
      const res = await fetch('/api/activity-center/validate-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, osType }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (e) {
      console.error('Validation failed:', e);
    } finally {
      setValidating(false);
    }
  };

  const handleCopyFixed = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#0D1526]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Package Install Command Validator
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  Correct or Not Syntax Audit
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                Ensure remote shell commands and software package installation routines are 100% correct, syntactically sound, compatible with the target distribution, and safe prior to server execution.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Command Editor & Presets */}
        <div className="lg:col-span-7 space-y-4">
          {/* Preset Buttons */}
          <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl p-4 shadow-xl">
            <span className="text-xs font-bold text-gray-300 block mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Tool & Package Templates:
            </span>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-3 py-1.5 rounded-xl bg-[#131D35] hover:bg-[#18233C] text-gray-300 hover:text-white border border-cyan-500/15 text-xs font-medium transition cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Target OS & Command Input */}
          <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Shell Installation Command / Script:
              </label>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-400">Target OS:</span>
                <select
                  value={osType}
                  onChange={(e) => setOsType(e.target.value as any)}
                  className="bg-[#131D35] border border-cyan-500/30 rounded-lg px-2.5 py-1 text-xs text-cyan-300 focus:outline-none cursor-pointer"
                >
                  <option value="ubuntu">Ubuntu (APT)</option>
                  <option value="debian">Debian (APT)</option>
                  <option value="amazon_linux">Amazon Linux 2023 (DNF)</option>
                  <option value="rhel">RHEL / CentOS (YUM/DNF)</option>
                </select>
              </div>
            </div>

            <textarea
              rows={6}
              value={command}
              onChange={(e) => {
                setCommand(e.target.value);
                setResult(null);
              }}
              placeholder="e.g. sudo apt-get update && sudo apt-get install -y docker-ce"
              className="w-full bg-[#080D1A] border border-cyan-500/30 rounded-xl p-3.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 leading-relaxed shadow-inner"
            />

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-gray-500 font-mono">
                {command.length} characters • {command.split('\n').length} lines
              </span>

              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !command.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25"
              >
                <ShieldCheck className={`w-4 h-4 ${validating ? 'animate-spin' : ''}`} />
                <span>{validating ? 'Analyzing Command...' : 'Check If Command Is Correct'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Validation Report */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0D1526]/80 border border-cyan-500/20 rounded-2xl p-5 shadow-xl min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  Validation Analysis & Verdict
                </h3>
                {result && (
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-black rounded-full border ${
                      result.status === 'CORRECT'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : result.status === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {result.status === 'CORRECT'
                      ? '✓ 100% CORRECT'
                      : result.status === 'WARNING'
                      ? '⚠ OPTIMIZATION NEEDED'
                      : '✕ SYNTAX / RUNTIME ERROR'}
                  </span>
                )}
              </div>

              {!result ? (
                <div className="py-16 text-center text-gray-500">
                  <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-cyan-400" />
                  <p className="text-xs">
                    Select a template or type your installation command, then click{' '}
                    <strong className="text-cyan-400">"Check If Command Is Correct"</strong>.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Verdict Message Banner */}
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold border flex items-start gap-2.5 ${
                      result.isValid
                        ? result.status === 'CORRECT'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                        : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {result.isValid ? (
                      result.status === 'CORRECT' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p>{result.message}</p>
                    </div>
                  </div>

                  {/* Issues List */}
                  {result.issues && result.issues.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Diagnostics & Findings ({result.issues.length}):
                      </span>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {result.issues.map((iss: any, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#131D35] rounded-xl border border-cyan-500/10 text-xs space-y-1"
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {iss.severity === 'error' ? (
                                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              ) : iss.severity === 'warning' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                              )}
                              <span
                                className={
                                  iss.severity === 'error'
                                    ? 'text-rose-300'
                                    : iss.severity === 'warning'
                                    ? 'text-amber-300'
                                    : 'text-cyan-300'
                                }
                              >
                                {iss.message}
                              </span>
                            </div>
                            {iss.suggestion && (
                              <p className="text-[11px] text-gray-400 pl-5">
                                <strong className="text-gray-300">Suggestion:</strong>{' '}
                                {iss.suggestion}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto-Corrected Command Suggestion */}
                  {result.fixedCommand && (
                    <div className="p-3.5 bg-[#080D1A] rounded-xl border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          Recommended Fixed Command:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyFixed(result.fixedCommand)}
                          className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto p-2 bg-[#131D35] rounded-lg whitespace-pre-wrap">
                        {result.fixedCommand}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-cyan-500/10 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Automated Linter Engine</span>
              <span>Bash • APT • DNF • YUM • Systemd</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
