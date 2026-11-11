'use client';

import React from 'react';
import { Layers, CheckCircle2, Shield, Database, Globe, Cpu, ArrowRight } from 'lucide-react';

export function AnsibleRolesTab() {
  const roles = [
    {
      id: 'role-webserver',
      name: 'webserver',
      title: 'Nginx & TLS Web Server',
      category: 'Web Tier',
      icon: Globe,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      description: 'Configures production-grade Nginx reverse proxy with HTTP/2, security headers, and gzip compression.',
      tasksCount: 6,
      tags: ['nginx', 'tls', 'http', 'reverse-proxy'],
    },
    {
      id: 'role-database',
      name: 'database',
      title: 'MySQL / PostgreSQL Database Host',
      category: 'Data Tier',
      icon: Database,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description: 'Initializes database services, tunes buffer pools, configures backup cron, and secures root credentials.',
      tasksCount: 8,
      tags: ['postgres', 'mysql', 'backup', 'storage'],
    },
    {
      id: 'role-devops',
      name: 'devops_runner',
      title: 'Java, Maven & Docker CI/CD Host',
      category: 'CI/CD & DevOps',
      icon: Cpu,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      description: 'Provisions Java 17/21 SDK, Apache Maven 3.9, Docker Engine, and systemd build daemon runners.',
      tasksCount: 7,
      tags: ['java', 'maven', 'docker', 'build-runner'],
    },
    {
      id: 'role-security',
      name: 'security_baseline',
      title: 'Linux Security & CIS Hardening',
      category: 'Security & Compliance',
      icon: Shield,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      description: 'Enforces UFW/firewalld rules, disables SSH password authentication, configures Fail2Ban and auditd logging.',
      tasksCount: 9,
      tags: ['firewall', 'ssh-hardening', 'fail2ban', 'cis'],
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Ansible Roles Directory</h3>
            <p className="text-xs text-slate-400">
              Reusable role packages with modular tasks, handlers, variables, and templates
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              className="bg-[#111A2E]/90 border border-[#1E293B]/90 rounded-2xl p-5 shadow-lg shadow-black/20 hover:border-purple-500/40 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${r.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">{r.name}</h4>
                      <p className="text-[11px] text-slate-400">{r.title}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                    {r.tasksCount} tasks
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-4">{r.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {r.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]/60 text-xs">
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to include in playbooks</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">roles/{r.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

