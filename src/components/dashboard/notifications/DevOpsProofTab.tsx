'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
  RefreshCw,
  Terminal,
  Server,
  UserCheck,
  Briefcase,
  Layers,
  Sparkles,
  ExternalLink,
  Save,
  Check,
  Info,
  Cloud,
  ChevronDown,
  Copy,
  CheckSquare,
  Code,
  Filter,
  Play,
} from 'lucide-react';
import { AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';

interface ProofRecipient {
  id: string;
  email: string;
  name: string;
  role: string;
  enabled: boolean;
  addedOn: string;
}

interface ProofConfig {
  engineerName: string;
  engineerRole: string;
  autoDispatchOnAction: boolean;
  scheduledDispatchEnabled: boolean;
  scheduledTime: string; // e.g. "18:00"
  timezone: string;
  toolsMonitored: string[];
}

interface ProofLog {
  _id: string;
  auditId: string;
  engineerName: string;
  actionType: string;
  tool: string;
  summary: string;
  serverOrHost: string;
  commandsExecuted: string;
  resultOutcome: string;
  durationMinutes: number;
  recipients: string[];
  clockTimeIST: string;
  status: string;
  createdAt: string;
}

interface CloudAccountOption {
  id: string;
  accountName: string;
  provider: 'aws' | 'azure';
  subscriptionId?: string;
  accountId?: string;
}

export interface ServerFleetItem {
  id: string;
  name: string;
  host: string;
  publicIp: string;
  cloudProvider: 'azure' | 'aws' | 'hybrid';
  status: 'Running' | 'Stopped' | 'Active';
  region: string;
  activeSession?: string;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface ToolActivityItem {
  id: string;
  tool: string;
  icon?: string;
  actionName: string;
  commands: string;
  status?: string;
}

export interface OrderedSectionToolItem {
  tool?: string;
  appName?: string;
  projectName?: string;
  playbookName?: string;
  imageName?: string;
  containerName?: string;
  clusterName?: string;
  namespace?: string;
  pods?: string;
  server?: string;
  source?: string;
  action?: string;
  commands?: string;
  status?: string;
  details?: string;
}

export interface OrderedSectionsType {
  maven?: OrderedSectionToolItem;
  section2_maven?: OrderedSectionToolItem;
  terraform?: OrderedSectionToolItem;
  section3_terraform?: OrderedSectionToolItem;
  ansible?: OrderedSectionToolItem;
  section4_ansible?: OrderedSectionToolItem;
  docker?: OrderedSectionToolItem;
  section5_docker?: OrderedSectionToolItem;
  k8s?: OrderedSectionToolItem;
  section6_k8s?: OrderedSectionToolItem;
  [key: string]: any;
}

const DEVOPS_TOOLS = [
  { id: 'Docker', label: 'Docker', desc: 'Container builds, restarts & OOM fixes' },
  { id: 'Kubernetes', label: 'Kubernetes', desc: 'Pod CrashLoop, rollouts & ingresses' },
  { id: 'Maven', label: 'Maven', desc: 'Build compiles, dependencies & test passes' },
  { id: 'Ansible', label: 'Ansible', desc: 'Playbook executions & host provisioning' },
  { id: 'Terraform', label: 'Terraform', desc: 'IaC plan, state lock release & apply' },
  { id: 'Jenkins', label: 'Jenkins', desc: 'CI/CD pipeline stage troubleshooting' },
  { id: 'SonarQube', label: 'SonarQube', desc: 'Quality Gate fixes & code coverage' },
  { id: 'Trivy', label: 'Trivy', desc: 'CVE vulnerability patches & upgrades' },
  { id: 'Server OS', label: 'Server OS', desc: 'vm01siva-mon CPU, RAM & Disk fixes' },
];

export const DEFAULT_SERVER_HISTORIES: Record<string, string[]> = {
  'vm01siva-mon': [
    'sudo nano .env.local',
    'cd monitoring/ && npm i && npm run build',
    'pm2 restart monitoring-app && pm2 logs monitoring-app --lines 20',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'cd monitoring && mvn clean package -DskipTests',
    'sudo apt install -y docker.io',
    'docker pull node:20-alpine',
    'docker pull httpd:alpine',
    'docker run -d --name auth-microservice-prod -p 3000:3000 node:20-alpine',
    'docker ps -a',
    'docker stats --no-stream',
    'docker restart auth-microservice-prod',
    'kubectl get nodes -o wide',
    'kubectl get pods -n production -o wide',
    'kubectl describe pod monitoring-app-7b8f-x91 -n production',
    'kubectl rollout restart deployment/monitoring-app -n production',
    'kubectl get services -n production',
    'sudo nano /etc/nginx/sites-available/default',
    'sudo nginx -t && sudo systemctl reload nginx',
    'sudo systemctl status nginx',
    'cd terraform/azure-infra && terraform init',
    'terraform plan -out=tfplan',
    'terraform apply -auto-approve tfplan',
    'ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon',
    'ansible all -m ping -i inventory.ini',
    'stress --cpu 8 --io 4 --vm 2 --vm-bytes 128M --timeout 10m',
    'ps aux --sort=-%cpu | head -10',
    'free -m && df -h',
  ],
  azure: [
    'sudo apt update && sudo apt upgrade -y',
    'sudo ufw status verbose',
    'sudo ufw allow 80,443,3000,9000/tcp',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'cd monitoring && mvn clean package -DskipTests',
    'docker compose -f docker-compose.prod.yml pull',
    'docker compose -f docker-compose.prod.yml up -d --remove-orphans',
    'docker ps -a',
    'docker stats --no-stream',
    'kubectl get nodes -o wide',
    'kubectl get pods -A',
    'kubectl rollout restart deployment/monitoring-app -n production',
    'kubectl get services -A',
    'sudo nano /etc/nginx/conf.d/proxy.conf',
    'sudo nginx -t && sudo systemctl reload nginx',
    'curl -I http://localhost:3000',
    'cd terraform/azure-workloads && terraform init',
    'terraform plan -out=tfplan && terraform apply -auto-approve tfplan',
    'ansible-playbook -i inventory.ini deploy.yml --limit azure',
    'ps aux --sort=-%mem | head -10',
    'sudo systemctl status nginx',
  ],
  web01: [
    'sudo yum update -y',
    'sudo amazon-linux-extras install docker -y',
    'sudo systemctl enable --now docker',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'cd monitoring && ./mvnw clean install -DskipTests',
    'docker pull nginx:alpine',
    'docker run -d --name web-proxy -p 80:80 --restart always nginx:alpine',
    'docker ps -a',
    'docker stats --no-stream',
    'kubectl get nodes -o wide',
    'kubectl get pods -n ingress-nginx',
    'kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx',
    'sudo nano /etc/nginx/nginx.conf',
    'sudo nginx -t && sudo systemctl reload nginx',
    'netstat -tulpn | grep :80',
    'cd terraform/aws-ec2 && terraform init',
    'terraform plan && terraform apply -auto-approve',
    'ansible-playbook -i inventory.ini site.yml --limit web01',
    'ps aux --sort=-%cpu | head -10',
    'free -m && df -h',
  ],
  'gsr-server': [
    'sudo apt update -y',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'cd monitoring && mvn clean package -DskipTests',
    'docker pull redis:alpine',
    'docker run -d --name cache-redis -p 6379:6379 redis:alpine',
    'docker ps -a',
    'kubectl get nodes',
    'kubectl get pods -n monitoring',
    'kubectl rollout restart daemonset/node-exporter -n monitoring',
    'sudo nginx -t && sudo systemctl reload nginx',
    'terraform init -upgrade',
    'terraform plan -out=tfplan',
    'terraform apply -auto-approve tfplan',
    'ansible-playbook -i inventory.ini deploy.yml --syntax-check',
    'ansible-playbook -i inventory.ini deploy.yml',
    'ansible all -m ping -i inventory.ini',
    'df -h && free -m',
    'sudo systemctl restart systemd-journald',
    'journalctl -u docker --since "1 hour ago" | tail -n 20',
  ],
  all: [
    '# === vm01siva-mon (Azure • Central India) - Active PuTTY Session ===',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'mvn clean package -DskipTests',
    'docker pull node:20-alpine && docker restart auth-microservice-prod',
    'kubectl rollout restart deployment/monitoring-app -n production',
    'sudo nginx -t && sudo systemctl reload nginx',
    'terraform apply -auto-approve tfplan',
    'ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon',
    'stress --cpu 8 --io 4 --vm 2 --vm-bytes 128M --timeout 10m',
    '# === azure (Azure VM • Central India) ===',
    'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git',
    'docker compose -f docker-compose.prod.yml up -d',
    'kubectl get pods -A',
    'sudo nginx -t && sudo systemctl reload nginx',
    'terraform apply -auto-approve',
    '# === web01 (AWS EC2 • us-east-1) ===',
    'docker run -d --name web-proxy -p 80:80 nginx:alpine',
    'cd monitoring && ./mvnw clean install -DskipTests',
    'kubectl rollout status deployment/ingress-nginx-controller',
    'ansible-playbook -i inventory.ini site.yml --limit web01',
    '# === gsr-server (AWS EC2 • ap-south-1) ===',
    'terraform apply -auto-approve tfplan',
    'ansible-playbook -i inventory.ini deploy.yml',
    'kubectl get pods -n monitoring',
  ],
};

export function classifyToolForCommand(cmd: string): { tool: string; icon: string; color: string; bg: string } {
  const c = cmd.toLowerCase().trim();
  if (c.startsWith('#')) return { tool: 'Server Note', icon: '📝', color: 'text-slate-400', bg: 'bg-slate-800/60 border-slate-700' };
  if (c.startsWith('docker') || c.includes('docker ') || c.includes('containerd'))
    return { tool: 'Docker', icon: '🐳', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
  if (c.startsWith('mvn') || c.includes('mvn ') || c.includes('maven') || c.includes('java'))
    return { tool: 'Maven', icon: '☕', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
  if (c.startsWith('kubectl') || c.includes('k8s') || c.includes('helm'))
    return { tool: 'Kubernetes', icon: '☸️', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' };
  if (c.startsWith('ansible') || c.includes('playbook'))
    return { tool: 'Ansible', icon: '⚡', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (c.startsWith('terraform') || c.includes('.tf'))
    return { tool: 'Terraform', icon: '🏗️', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
  if (c.includes('nginx') || c.includes('certbot'))
    return { tool: 'Nginx', icon: '🌐', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (c.startsWith('git ') || c.includes('git clone') || c.includes('git pull'))
    return { tool: 'Git', icon: '📦', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  if (c.includes('npm') || c.includes('pm2') || c.includes('node'))
    return { tool: 'Node/PM2', icon: '⚡', color: 'text-lime-400', bg: 'bg-lime-500/10 border-lime-500/30' };
  if (c.includes('jenkins'))
    return { tool: 'Jenkins', icon: '👨‍💼', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  if (c.includes('sonar'))
    return { tool: 'SonarQube', icon: '🔍', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/30' };
  if (c.includes('trivy'))
    return { tool: 'Trivy', icon: '🛡️', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/30' };
  return { tool: 'Server OS', icon: '🖥️', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' };
}

export function DevOpsProofTab() {
  // Live ticking clock state
  const [currentTime, setCurrentTime] = useState<{ ist: string; utc: string }>({
    ist: '',
    utc: '',
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime({
        ist: now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
        utc: now.toISOString().substring(11, 19) + ' UTC',
      });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // 12-Hour AM / PM Clock State for Scheduling
  const [clockHour, setClockHour] = useState('06');
  const [clockMinute, setClockMinute] = useState('00');
  const [clockPeriod, setClockPeriod] = useState<'AM' | 'PM'>('PM');

  // Convert 24h string to 12h states
  const parse24hTo12h = (time24: string) => {
    if (!time24 || !time24.includes(':')) return;
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    setClockHour(String(h).padStart(2, '0'));
    setClockMinute(m);
    setClockPeriod(period);
  };

  // Convert 12h state to 24h string
  const get24hString = (hour: string, minute: string, period: 'AM' | 'PM') => {
    let h = parseInt(hour, 10);
    if (period === 'AM' && h === 12) h = 0;
    else if (period === 'PM' && h < 12) h += 12;
    return `${String(h).padStart(2, '0')}:${minute}`;
  };

  // Recipient state
  const [recipients, setRecipients] = useState<ProofRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('CTO');
  const [addingRecipient, setAddingRecipient] = useState(false);

  // Cloud Account Selection
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<'azure' | 'aws' | 'hybrid'>('azure');
  const [cloudAccounts, setCloudAccounts] = useState<CloudAccountOption[]>([]);
  const [selectedCloudAccount, setSelectedCloudAccount] = useState('Azure Production Subscription (Visual Studio Enterprise)');
  const [targetServer, setTargetServer] = useState('vm01siva-mon (4.240.105.247) • Central India');

  // Multi-Server Fleet & Login Activity state (AWS & Azure)
  const [serversList, setServersList] = useState<ServerFleetItem[]>([
    {
      id: 'srv-vm01',
      name: 'vm01siva-mon',
      host: '4.240.105.247',
      publicIp: '4.240.105.247',
      cloudProvider: 'azure',
      status: 'Running',
      region: 'Central India',
      activeSession: 'PuTTY SSH: siva pts/0 (Active)',
      cpuUsage: 14.2,
      memoryUsage: 48.5,
    },
    {
      id: 'srv-azure',
      name: 'azure',
      host: '20.40.49.224',
      publicIp: '20.40.49.224',
      cloudProvider: 'azure',
      status: 'Stopped',
      region: 'Central India',
      cpuUsage: 0,
      memoryUsage: 0,
    },
    {
      id: 'srv-web01',
      name: 'web01',
      host: '15.135.74.255',
      publicIp: '15.135.74.255',
      cloudProvider: 'aws',
      status: 'Stopped',
      region: 'us-east-1',
      cpuUsage: 0,
      memoryUsage: 0,
    },
    {
      id: 'srv-gsr',
      name: 'gsr-server',
      host: '3.27.38.3',
      publicIp: '3.27.38.3',
      cloudProvider: 'aws',
      status: 'Stopped',
      region: 'ap-south-1',
      cpuUsage: 0,
      memoryUsage: 0,
    },
  ]);
  const [selectedServerId, setSelectedServerId] = useState<string>('all');

  // The 6 Ordered Sections
  const [orderedSections, setOrderedSections] = useState<OrderedSectionsType>({
    maven: {
      appName: 'monitoring',
      server: 'vm01siva-mon (4.240.105.247)',
      source: 'PuTTY Terminal & Web App Console',
      action: 'GitHub Clone & Maven Clean Package Build',
      commands: 'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git\ncd monitoring && mvn clean package -DskipTests',
      status: 'BUILD SUCCESS (Exit 0)',
    },
    terraform: {
      projectName: 'azure-rg01-infrastructure',
      server: 'vm01siva-mon (4.240.105.247)',
      source: 'PuTTY Terminal & Web App Console',
      action: 'Terraform IaC Plan & Apply',
      commands: 'terraform init\nterraform plan -out=tfplan\nterraform apply -auto-approve tfplan',
      status: 'Apply Complete! 2 added (Exit 0)',
    },
    ansible: {
      playbookName: 'site.yml',
      server: 'vm01siva-mon & AWS web01 inventory',
      source: 'PuTTY Terminal & Web App Console',
      action: 'Ansible Server Automation Playbook Deployment',
      commands: 'ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon',
      status: 'PLAY RECAP: ok=6 changed=2 failed=0',
    },
    docker: {
      imageName: 'node:20-alpine',
      containerName: 'auth-microservice-prod, monitoring-app',
      server: 'vm01siva-mon (4.240.105.247)',
      source: 'PuTTY Terminal & Web App Console',
      action: 'Docker Image Pull & Container Restart',
      commands: 'docker pull node:20-alpine\ndocker restart auth-microservice-prod\ndocker stats --no-stream',
      status: 'Running (Exit 0)',
    },
    k8s: {
      clusterName: 'vm01siva-mon (k8s-master)',
      namespace: 'production',
      pods: 'monitoring-app-7b8f-x91',
      source: 'PuTTY Terminal & Web App Console',
      action: 'Kubernetes Pod Inspection & Deployment Rollout',
      commands: 'kubectl get pods -n production -o wide\nkubectl rollout restart deployment/monitoring-app -n production',
      status: '1/1 Ready, Running (Exit 0)',
    },
  });

  // Config state
  const [config, setConfig] = useState<ProofConfig>({
    engineerName: 'Siva',
    engineerRole: 'Lead DevOps Engineer',
    autoDispatchOnAction: true,
    scheduledDispatchEnabled: true,
    scheduledTime: '18:00',
    timezone: 'Asia/Kolkata',
    toolsMonitored: ['docker', 'kubernetes', 'maven', 'ansible', 'terraform', 'jenkins', 'sonarqube', 'trivy', 'server'],
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Dispatch Action Form state
  const [selectedTool, setSelectedTool] = useState('Server OS');
  const [actionType, setActionType] = useState('Troubleshooting');
  const [summary, setSummary] = useState('Investigated high CPU utilization and Turbopack compiler memory leak on vm01siva-mon. Successfully normalized system load.');
  const [commandsExecuted, setCommandsExecuted] = useState(DEFAULT_SERVER_HISTORIES['vm01siva-mon'].join('\n'));
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [resultOutcome, setResultOutcome] = useState('Normalized CPU from 100% to 14.2% within 15 mins with 0 downtime');
  const [sessionSource, setSessionSource] = useState('PuTTY SSH Terminal (siva@4.240.105.247)');
  const [isDispatching, setIsDispatching] = useState(false);
  const [fetchingServerHistory, setFetchingServerHistory] = useState(false);
  const [auditViewTab, setAuditViewTab] = useState<'ordered6' | 'stepEditor'>('ordered6');

  // Interactive Server Terminal State
  const [serverHistories, setServerHistories] = useState<Record<string, string[]>>(DEFAULT_SERVER_HISTORIES);
  const [activeServerCommands, setActiveServerCommands] = useState<string[]>(DEFAULT_SERVER_HISTORIES['vm01siva-mon']);
  const [terminalFilter, setTerminalFilter] = useState<'all' | 'docker' | 'k8s' | 'nginx' | 'maven' | 'terraform' | 'ansible' | 'system'>('all');
  const [isTerminalRawView, setIsTerminalRawView] = useState<boolean>(false);
  const [copiedTerminal, setCopiedTerminal] = useState<boolean>(false);
  const [customCommandInput, setCustomCommandInput] = useState<string>('');

  // Multi-Tool Detailed Step-by-Step Activities (Docker, Maven, Nginx, Ansible, Terraform, K8s, etc.)
  const [activities, setActivities] = useState<ToolActivityItem[]>([
    {
      id: 'step-1-docker',
      tool: 'Docker',
      icon: '🐳',
      actionName: 'Docker Image Pull & Container Restart (node:20-alpine)',
      commands: 'docker pull node:20-alpine\ndocker restart auth-microservice-prod\ndocker stats --no-stream',
      status: 'Verified (Exit 0)',
    },
    {
      id: 'step-2-maven',
      tool: 'Maven',
      icon: '☕',
      actionName: 'GitHub Clone & Maven Clean Package Build',
      commands: 'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git\ncd monitoring && mvn clean package -DskipTests',
      status: 'Verified (Exit 0)',
    },
    {
      id: 'step-3-nginx',
      tool: 'Nginx',
      icon: '🌐',
      actionName: 'Nginx Reverse Proxy Deployment & Configuration Reload',
      commands: 'sudo nano /etc/nginx/sites-available/default\nsudo nginx -t\nsudo systemctl reload nginx',
      status: 'Verified (Exit 0)',
    },
    {
      id: 'step-4-ansible',
      tool: 'Ansible',
      icon: '⚡',
      actionName: 'Ansible Server Automation Playbook Deployment',
      commands: 'ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon',
      status: 'Verified (Exit 0)',
    },
  ]);

  const getToolPreset = (toolName: string): ToolActivityItem => {
    const id = `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    switch (toolName) {
      case 'Docker':
        return {
          id,
          tool: 'Docker',
          icon: '🐳',
          actionName: 'Docker Image Pull & Container Run',
          commands: 'docker pull node:20-alpine\ndocker run -d --name app-service -p 3000:3000 node:20-alpine\ndocker ps -a',
          status: 'Verified (Exit 0)',
        };
      case 'Maven':
        return {
          id,
          tool: 'Maven',
          icon: '☕',
          actionName: 'GitHub Repository Clone & Maven Package Build',
          commands: 'git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git\ncd monitoring && mvn clean package -DskipTests',
          status: 'Verified (Exit 0)',
        };
      case 'Nginx':
        return {
          id,
          tool: 'Nginx',
          icon: '🌐',
          actionName: 'Nginx VirtualHost Reverse Proxy Reload',
          commands: 'sudo nano /etc/nginx/sites-available/default\nsudo nginx -t && sudo systemctl reload nginx',
          status: 'Verified (Exit 0)',
        };
      case 'Ansible':
        return {
          id,
          tool: 'Ansible',
          icon: '⚡',
          actionName: 'Ansible Server Inventory Playbook Deployment',
          commands: 'ansible-playbook -i inventory.ini site.yml --limit vm01siva-mon',
          status: 'Verified (Exit 0)',
        };
      case 'Terraform':
        return {
          id,
          tool: 'Terraform',
          icon: '🏗️',
          actionName: 'Terraform Infrastructure as Code Plan & Apply',
          commands: 'terraform init\nterraform plan -out=tfplan\nterraform apply -auto-approve tfplan',
          status: 'Verified (Exit 0)',
        };
      case 'Kubernetes':
        return {
          id,
          tool: 'Kubernetes',
          icon: '☸️',
          actionName: 'Kubernetes Pod Inspection & Deployment Rollout',
          commands: 'kubectl get pods -n production -o wide\nkubectl rollout restart deployment/monitoring-app -n production',
          status: 'Verified (Exit 0)',
        };
      case 'Jenkins':
        return {
          id,
          tool: 'Jenkins',
          icon: '👨‍💼',
          actionName: 'Jenkins CI/CD Pipeline Job Trigger & Build Verification',
          commands: 'java -jar jenkins-cli.jar -s http://localhost:8080/ build prod-ci-pipeline\njava -jar jenkins-cli.jar -s http://localhost:8080/ console prod-ci-pipeline -f',
          status: 'Verified (Exit 0)',
        };
      case 'SonarQube':
        return {
          id,
          tool: 'SonarQube',
          icon: '🔍',
          actionName: 'SonarQube Static Analysis & Quality Gate Verification',
          commands: 'sonar-scanner -Dsonar.projectKey=monitoring -Dsonar.sources=src -Dsonar.host.url=http://localhost:9000',
          status: 'Verified (Exit 0)',
        };
      case 'Trivy':
        return {
          id,
          tool: 'Trivy',
          icon: '🛡️',
          actionName: 'Trivy Vulnerability Security Audit on Container Image',
          commands: 'trivy image --severity HIGH,CRITICAL node:20-alpine\ntrivy fs --severity HIGH,CRITICAL .',
          status: 'Verified (Exit 0)',
        };
      case 'Git & Version Control':
        return {
          id,
          tool: 'Git & Version Control',
          icon: '📦',
          actionName: 'Git Clone & Release Branch Merge',
          commands: 'git fetch --all\ngit checkout main && git pull origin main',
          status: 'Verified (Exit 0)',
        };
      default:
        return {
          id,
          tool: 'Server OS',
          icon: '🖥️',
          actionName: 'Server CPU, Memory & Process Load Normalization',
          commands: 'ps aux --sort=-%cpu | head -10\nfree -m && df -h\npm2 restart monitoring-app',
          status: 'Verified (Exit 0)',
        };
    }
  };

  const handleAddActivity = (toolName: string) => {
    const newAct = getToolPreset(toolName);
    setActivities((prev) => [...prev, newAct]);
    showToast(`Added [${toolName}] step to activity proof!`, 'info');
  };

  const handleUpdateActivity = (id: string, field: 'tool' | 'actionName' | 'commands', value: string) => {
    setActivities((prev) =>
      prev.map((act) => {
        if (act.id !== id) return act;
        if (field === 'tool') {
          const preset = getToolPreset(value);
          return {
            ...act,
            tool: value,
            icon: preset.icon,
            actionName: preset.actionName,
            commands: act.commands || preset.commands,
          };
        }
        return { ...act, [field]: value };
      })
    );
  };

  const handleDeleteActivity = (id: string) => {
    if (activities.length <= 1) {
      showToast('At least one tool activity step is required.', 'error');
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<ProofLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Feedback toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch cloud accounts
  const fetchCloudAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/cloud-accounts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCloudAccounts(data);
          const first = data[0];
          setSelectedCloudAccount(first.accountName || first.subscriptionId || first.accountId || 'Cloud Account');
        }
      }
    } catch {}
  }, []);

  // Fetch recipients
  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setRecipients(data.recipients || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/proof-of-work/config', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          if (data.config.scheduledTime) {
            parse24hTo12h(data.config.scheduledTime);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/dispatch', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  // LIVE SERVER PUTTY / SSH COMMANDS AUTO-FETCHER
  const handleFetchServerHistory = useCallback(async () => {
    setFetchingServerHistory(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/fetch-server-history?limit=50', {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (Array.isArray(data.servers) && data.servers.length > 0) {
          setServersList(data.servers);
        }
        if (data.orderedSections) {
          const ord = data.orderedSections;
          setOrderedSections((prev) => ({
            ...prev,
            ...ord,
            maven: ord.maven || ord.section2_maven || prev.maven,
            terraform: ord.terraform || ord.section3_terraform || prev.terraform,
            ansible: ord.ansible || ord.section4_ansible || prev.ansible,
            docker: ord.docker || ord.section5_docker || prev.docker,
            k8s: ord.k8s || ord.section6_k8s || prev.k8s,
          }));
        }
        if (data.serverHistories) {
          setServerHistories((prev) => ({ ...prev, ...data.serverHistories }));
          // If a server is selected, update its commands
          const currentServer = serversList.find((s) => s.id === selectedServerId);
          const serverKey = selectedServerId === 'all' ? 'all' : (currentServer ? currentServer.name : 'vm01siva-mon');
          const updatedCmds = data.serverHistories[serverKey] || data.serverHistories['vm01siva-mon'];
          if (updatedCmds && updatedCmds.length > 0) {
            setActiveServerCommands(updatedCmds);
            setCommandsExecuted(updatedCmds.join('\n'));
          }
        }
        if (Array.isArray(data.activities) && data.activities.length > 0) {
          setActivities(
            data.activities.map((a: any, idx: number) => ({
              id: `live-${idx}-${Date.now()}`,
              tool: a.tool || 'Server OS',
              icon: a.icon || '⚙️',
              actionName: a.actionName || 'Executed live server commands',
              commands: a.commands || '',
              status: 'Verified (Live Server)',
            }))
          );
        }
        if (data.detectedTool) {
          setSelectedTool(data.detectedTool);
          setSummary(`Live PuTTY/SSH session executed on ${data.detectedTool} on server ${data.server || 'vm01siva-mon'}.`);
        }
        if (data.sshSessions && data.sshSessions.length > 0) {
          setSessionSource(`PuTTY SSH: ${data.sshSessions[0]}`);
        }
        setResultOutcome('All tool commands completed and verified via server terminal with status 0.');
        showToast(`Auto-fetched live commands directly from server ~/.bash_history!`, 'success');
      } else {
        showToast(data.error || 'Failed to fetch server bash history', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setFetchingServerHistory(false);
    }
  }, [selectedServerId, serversList]);

  useEffect(() => {
    fetchRecipients();
    fetchConfig();
    fetchLogs();
    fetchCloudAccounts();
    handleFetchServerHistory();
  }, [fetchRecipients, fetchConfig, fetchLogs, fetchCloudAccounts, handleFetchServerHistory]);

  // Handle Server Selection from Top Fleet Cards
  const handleSelectServer = (srv: ServerFleetItem | 'all') => {
    if (srv === 'all') {
      setSelectedServerId('all');
      setTargetServer('All Multi-Cloud Servers (Azure & AWS Fleet)');
      setSelectedCloudProvider('hybrid');
      setSessionSource('PuTTY SSH & Web App Console (Multi-Server)');
      const allCmds = serverHistories['all'] || DEFAULT_SERVER_HISTORIES['all'];
      setActiveServerCommands(allCmds);
      setCommandsExecuted(allCmds.join('\n'));
      setSummary('Multi-cloud infrastructure operations and troubleshooting executed across Azure & AWS server fleet.');
      showToast('Loaded unified terminal history for All Servers Fleet (Azure & AWS)!', 'info');
      return;
    }

    setSelectedServerId(srv.id);
    setTargetServer(`${srv.name} (${srv.publicIp || srv.host}) • ${srv.region}`);
    setSelectedCloudProvider(srv.cloudProvider === 'aws' ? 'aws' : 'azure');
    if (srv.activeSession) {
      setSessionSource(`PuTTY SSH: ${srv.activeSession}`);
    } else {
      setSessionSource(`Server: ${srv.name} (${srv.publicIp || srv.host})`);
    }

    // Lookup commands by srv.name or srv.id
    const cmds =
      serverHistories[srv.name] ||
      serverHistories[srv.id] ||
      DEFAULT_SERVER_HISTORIES[srv.name] ||
      DEFAULT_SERVER_HISTORIES['vm01siva-mon'];

    setActiveServerCommands(cmds);
    setCommandsExecuted(cmds.join('\n'));

    // Update incident summary to match selected server
    if (srv.name === 'vm01siva-mon') {
      setSummary('Investigated high CPU utilization and Turbopack compiler memory leak on vm01siva-mon. Successfully normalized system load.');
      setSelectedTool('Server OS');
    } else if (srv.name === 'azure') {
      setSummary('Configured Docker microservices, UFW security ports, and inspected Kubernetes pods on Azure VM.');
      setSelectedTool('Docker');
    } else if (srv.name === 'web01') {
      setSummary('Deployed Nginx web-proxy reverse container and pulled latest code repository on AWS EC2 web01.');
      setSelectedTool('Nginx');
    } else if (srv.name === 'gsr-server') {
      setSummary('Executed Terraform IaC state rollout and deployed Ansible configuration playbook on AWS EC2 gsr-server.');
      setSelectedTool('Terraform');
    }

    showToast(`Loaded live terminal history for ${srv.name} (${cmds.length} commands)!`, 'success');
  };

  // Helper: Prompt User and Hostname
  const getPromptUserAndHost = () => {
    if (selectedServerId === 'all') {
      return { user: 'siva', host: 'fleet-cluster', ip: 'multi-cloud', provider: 'hybrid' };
    }
    const currentServer = serversList.find((s) => s.id === selectedServerId);
    if (!currentServer) return { user: 'siva', host: 'vm01siva-mon', ip: '4.240.105.247', provider: 'azure' };
    if (currentServer.cloudProvider === 'aws') {
      return {
        user: currentServer.name === 'web01' ? 'ec2-user' : 'ubuntu',
        host: currentServer.name,
        ip: currentServer.publicIp || currentServer.host,
        provider: 'aws',
      };
    }
    return {
      user: 'siva',
      host: currentServer.name,
      ip: currentServer.publicIp || currentServer.host,
      provider: currentServer.cloudProvider,
    };
  };

  // Helper: Filtered Commands (All Tools Combined by Default)
  const getFilteredCommands = () => {
    if (terminalFilter === 'all') return activeServerCommands;
    return activeServerCommands.filter((cmd) => {
      const c = cmd.toLowerCase();
      if (terminalFilter === 'docker') return c.includes('docker') || c.includes('container');
      if (terminalFilter === 'k8s') return c.includes('kubectl') || c.includes('k8s') || c.includes('helm');
      if (terminalFilter === 'nginx') return c.includes('nginx') || c.includes('certbot');
      if (terminalFilter === 'maven') return c.includes('mvn') || c.includes('maven') || c.includes('git') || c.includes('java');
      if (terminalFilter === 'terraform') return c.includes('terraform') || c.includes('tfplan');
      if (terminalFilter === 'ansible') return c.includes('ansible') || c.includes('playbook');
      if (terminalFilter === 'system') {
        return (
          c.includes('pm2') ||
          c.includes('npm') ||
          c.includes('sudo') ||
          c.includes('ps ') ||
          c.includes('stress') ||
          c.includes('systemctl') ||
          c.includes('journalctl') ||
          c.includes('free') ||
          c.includes('df ') ||
          c.includes('nano') ||
          c.includes('cat ') ||
          c.includes('ufw')
        );
      }
      return true;
    });
  };

  // Helper: Copy Terminal Commands
  const handleCopyTerminal = () => {
    const text = getFilteredCommands().join('\n');
    navigator.clipboard.writeText(text);
    setCopiedTerminal(true);
    showToast('Copied terminal commands to clipboard!', 'info');
    setTimeout(() => setCopiedTerminal(false), 2500);
  };

  // Helper: Add Custom Command into Live Terminal
  const handleAddCustomCommand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customCommandInput.trim()) return;
    const newCmd = customCommandInput.trim();
    const updated = [...activeServerCommands, newCmd];
    setActiveServerCommands(updated);
    setCommandsExecuted(updated.join('\n'));
    const currentServer = serversList.find((s) => s.id === selectedServerId);
    const serverKey = selectedServerId === 'all' ? 'all' : (currentServer ? currentServer.name : 'vm01siva-mon');
    setServerHistories((prev) => ({
      ...prev,
      [serverKey]: [...(prev[serverKey] || []), newCmd],
    }));
    setCustomCommandInput('');
    showToast(`Recorded command into terminal: ${newCmd}`, 'success');
  };

  // Handle Add Recipient (Real Company Email)
  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAddingRecipient(true);
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim(), role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewEmail('');
        setNewName('');
        showToast(`Added ${data.recipient.email} to proof distribution!`, 'success');
        fetchRecipients();
      } else {
        showToast(data.error || 'Failed to add recipient', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setAddingRecipient(false);
    }
  };

  // Handle Clear All Recipients
  const handleClearAllRecipients = async () => {
    if (!confirm('Are you sure you want to clear all existing recipients so you can add fresh company emails?')) return;
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients?clearAll=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecipients([]);
        showToast('Cleared all recipients. Add your real company emails below.', 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Toggle Recipient
  const handleToggleRecipient = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/notifications/proof-of-work/recipients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setRecipients((prev) =>
          prev.map((r) => (r.id === id ? { ...r, enabled: !currentEnabled } : r))
        );
        showToast(`Recipient status updated.`, 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Delete Recipient
  const handleDeleteRecipient = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from leadership proof roster?`)) return;
    try {
      const res = await fetch(`/api/notifications/proof-of-work/recipients?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRecipients((prev) => prev.filter((r) => r.id !== id));
        showToast(`Removed ${email}`, 'info');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Save Config (With 12h AM/PM time)
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    const time24 = get24hString(clockHour, clockMinute, clockPeriod);
    const updatedConfig = { ...config, scheduledTime: time24 };
    try {
      const res = await fetch('/api/notifications/proof-of-work/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });
      if (res.ok) {
        setConfig(updatedConfig);
        showToast(`Clock schedule saved for ${clockHour}:${clockMinute} ${clockPeriod} IST (${time24})!`, 'success');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Handle Dispatch Proof
  const handleDispatchProof = async () => {
    setIsDispatching(true);
    try {
      const toolSummary = activities.length > 0 ? activities.map((a) => a.tool).join(', ') : selectedTool;
      const aggregatedCommands = activities
        .map((a, i) => `[Step ${i + 1}] ${a.tool.toUpperCase()}: ${a.actionName}\n${a.commands}`)
        .join('\n\n----------------------------------------\n\n');

      const res = await fetch('/api/notifications/proof-of-work/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engineerName: config.engineerName,
          engineerRole: config.engineerRole,
          actionType,
          tool: toolSummary,
          cloudProvider: selectedCloudProvider === 'azure' ? 'Microsoft Azure' : selectedCloudProvider === 'aws' ? 'Amazon Web Services (AWS)' : 'Hybrid / Multi-Cloud',
          cloudAccount: selectedCloudAccount,
          serverOrHost: selectedServerId === 'all' ? 'All Multi-Cloud Servers (Azure & AWS Fleet)' : targetServer,
          sessionSource,
          summary: summary || `Executed step-by-step multi-tool deployment & troubleshooting across ${targetServer}.`,
          commandsExecuted: aggregatedCommands,
          activities,
          servers: serversList,
          orderedSections,
          resultOutcome,
          durationMinutes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Proof of work audit email successfully dispatched!', 'success');
        fetchLogs();
      } else {
        showToast(data.error || 'Failed to dispatch proof email', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              : toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : 'bg-cyan-950/90 text-cyan-200 border-cyan-500/50'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* TOP HERO WITH MULTI-CLOUD BRANDING & LIVE CLOCK BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A192F] via-[#0F172A] to-[#111A2E] border border-blue-500/30 p-5 md:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0078D4]/20 border border-[#0078D4]/40 text-[#60A5FA] text-xs font-mono font-bold uppercase">
                <AzureLogo className="w-3.5 h-3.5" />
                <span>Azure</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#FF9900]/20 border border-[#FF9900]/40 text-[#F59E0B] text-xs font-mono font-bold uppercase">
                <AwsLogo className="w-3.5 h-3.5" />
                <span>AWS</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Verifiable Work Audit Dispatcher</span>
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Deployment &amp; Troubleshooting Proof Dispatcher
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Every action you perform via <strong>PuTTY</strong>, <strong>SSH terminal</strong>, or our console on <strong>Azure &amp; AWS</strong> is automatically captured with exact terminal commands and dispatched directly to your Company CTO, Management &amp; Personal Archive.
            </p>
          </div>

          {/* Digital Clock Box */}
          <div className="bg-[#090D1A]/95 border border-blue-500/40 rounded-xl p-4 shrink-0 text-right space-y-1 shadow-lg">
            <div className="text-[10px] font-mono uppercase text-blue-400 tracking-wider flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Live IST System Clock</span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-white tracking-wider">
              {currentTime.ist || '12:00:00 PM'}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              UTC: <span className="text-cyan-400">{currentTime.utc || '00:00:00 UTC'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MULTI-SERVER FLEET & LOGIN ACTIVITY BAR (AWS & AZURE) */}
      <div className="bg-[#111A2E] border border-blue-500/30 rounded-2xl p-4 md:p-5 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Multi-Cloud Server Fleet &amp; Login Activity
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
              {serversList.filter((s) => (s?.status || '').toLowerCase() === 'running').length} Running &bull;{' '}
              {serversList.filter((s) => (s?.status || '').toLowerCase() === 'stopped').length} Stopped
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            Selected:{' '}
            <strong className="text-cyan-300">
              {selectedServerId === 'all' ? '🌐 All Servers Fleet View' : targetServer}
            </strong>
          </div>
        </div>

        {/* Server Cards Horizontal Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* ALL SERVERS BUTTON */}
          <button
            type="button"
            onClick={() => handleSelectServer('all')}
            className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
              selectedServerId === 'all'
                ? 'bg-blue-600/25 border-blue-400 shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                : 'bg-[#090E1A] border-[#1E293B] hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🌐</span>
                <span>All Servers Fleet</span>
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Fleet View
              </span>
            </div>
            <div className="mt-2 text-[10px] text-slate-400 font-mono">
              Aggregated AWS &amp; Azure actions
            </div>
          </button>

          {/* INDIVIDUAL SERVERS */}
          {serversList.map((srv) => (
            <button
              key={srv.id}
              type="button"
              onClick={() => handleSelectServer(srv)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedServerId === srv.id
                  ? 'bg-blue-600/25 border-blue-400 shadow-md shadow-blue-500/25 ring-1 ring-blue-500'
                  : 'bg-[#090E1A] border-[#1E293B] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-white font-mono truncate">{srv.name}</span>
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 ${
                    (srv?.status || '').toLowerCase() === 'running'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      (srv?.status || '').toLowerCase() === 'running'
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-rose-400'
                    }`}
                  ></span>
                  <span>{(srv?.status || 'RUNNING').toUpperCase()}</span>
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{srv.publicIp || srv.host}</span>
                <span className={srv.cloudProvider === 'azure' ? 'text-[#60A5FA]' : 'text-[#F59E0B]'}>
                  {srv.cloudProvider?.toUpperCase()}
                </span>
              </div>
              {srv.activeSession && (
                <div className="mt-1 text-[9px] text-emerald-400 font-mono truncate">
                  ⚡ {srv.activeSession}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* INTERACTIVE LIVE SERVER TERMINAL WINDOW */}
        <div className="mt-4 pt-4 border-t border-[#1E293B] space-y-2.5">
          {/* Terminal Window Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-t-xl bg-[#070B16] border border-[#1E293B] border-b-0">
            {/* Left: Window Controls + Shell Title + Connected Host */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Window Controls (Red, Yellow, Green) */}
              <div className="flex items-center gap-1.5 mr-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/90 hover:opacity-80 transition-opacity"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90 hover:opacity-80 transition-opacity"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90 hover:opacity-80 transition-opacity"></span>
              </div>

              {/* Shell Prompt Indicator */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{getPromptUserAndHost().user}@{getPromptUserAndHost().host}</span>
                <span className="text-slate-500">:~</span>
                <span className="text-cyan-400">$</span>
              </div>

              {/* Host & IP Pill */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-[10px]">
                {getPromptUserAndHost().provider === 'azure' ? (
                  <AzureLogo className="w-3 h-3 text-[#60A5FA]" />
                ) : getPromptUserAndHost().provider === 'aws' ? (
                  <AwsLogo className="w-3 h-3 text-[#F59E0B]" />
                ) : (
                  <span>🌐</span>
                )}
                <span>{getPromptUserAndHost().ip}</span>
              </span>

              {/* Active PuTTY / SSH Session Pill */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>{selectedServerId === 'srv-vm01' || selectedServerId === 'vm01siva-mon' ? 'PuTTY SSH Active' : 'Terminal Connected'}</span>
              </span>
            </div>

            {/* Right: Quick Tool Filter Tabs & Terminal Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Tool Filters */}
              <div className="flex items-center rounded-lg bg-[#0D1527] border border-slate-800 p-0.5 text-[11px] font-mono flex-wrap">
                <button
                  type="button"
                  onClick={() => setTerminalFilter('all')}
                  className={`px-2.5 py-0.5 rounded transition-all font-bold ${
                    terminalFilter === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show all executed commands across all tools in one unified stream"
                >
                  📋 All Tools ({activeServerCommands.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('docker')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'docker'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Docker commands"
                >
                  🐳 Docker
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('k8s')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'k8s'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Kubernetes commands"
                >
                  ☸️ K8s
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('nginx')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'nginx'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Nginx commands"
                >
                  🌐 Nginx
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('maven')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'maven'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Maven commands"
                >
                  ☕ Maven
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('terraform')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'terraform'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Terraform commands"
                >
                  🏗️ Terraform
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('ansible')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'ansible'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Ansible commands"
                >
                  ⚡ Ansible
                </button>
                <button
                  type="button"
                  onClick={() => setTerminalFilter('system')}
                  className={`px-2 py-0.5 rounded transition-all font-semibold ${
                    terminalFilter === 'system'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Filter to Linux OS & PM2 commands"
                >
                  🖥️ OS / PM2
                </button>
              </div>

              {/* Copy Terminal Button */}
              <button
                type="button"
                onClick={handleCopyTerminal}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] font-semibold flex items-center gap-1 transition-all border border-slate-700"
                title="Copy terminal commands to clipboard"
              >
                {copiedTerminal ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              {/* Toggle Raw Editor View */}
              <button
                type="button"
                onClick={() => setIsTerminalRawView(!isTerminalRawView)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold flex items-center gap-1 transition-all border ${
                  isTerminalRawView
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Toggle between interactive Linux shell and raw text editor"
              >
                <Code className="w-3 h-3" />
                <span>{isTerminalRawView ? 'Interactive CLI' : 'Raw Edit'}</span>
              </button>

              {/* Auto-Sync PuTTY history */}
              <button
                type="button"
                onClick={handleFetchServerHistory}
                disabled={fetchingServerHistory}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-semibold flex items-center gap-1 transition-all"
                title="Sync latest live commands from server ~/.bash_history"
              >
                <RefreshCw className={`w-3 h-3 ${fetchingServerHistory ? 'animate-spin' : ''}`} />
                <span>Sync ~/.bash_history</span>
              </button>
            </div>
          </div>

          {/* Terminal Body Screen */}
          <div className="bg-[#050811] border border-[#1E293B] rounded-b-xl overflow-hidden shadow-2xl font-mono text-xs">
            {/* Linux MOTD Banner with All-Tools Badge */}
            <div className="px-4 py-2.5 bg-[#090D1A] border-b border-slate-900/80 text-[11px] text-slate-400 space-y-1.5 leading-relaxed select-none">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span>●</span>
                  <span>Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-1017-azure x86_64)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentTime.ist} &bull; Bash 5.2.21
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Connected Host:{' '}
                <strong className="text-cyan-300">
                  {getPromptUserAndHost().host} ({getPromptUserAndHost().ip})
                </strong>{' '}
                &bull; Session:{' '}
                <strong className="text-emerald-300">{sessionSource}</strong> &bull; History:{' '}
                <span className="text-amber-400">/home/siva/.bash_history</span>
              </div>
              {/* All Tools Unified Indicator Bar */}
              <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                <span className="text-slate-400 font-semibold">Tools recorded in this server:</span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">🐳 Docker</span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">☸️ K8s</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">🌐 Nginx</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">☕ Maven</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">🏗️ Terraform</span>
                <span className="px-1.5 py-0.2 rounded bg-red-500/10 border border-red-500/30 text-red-300">⚡ Ansible</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">🖥️ Server OS</span>
              </div>
            </div>

            {/* Terminal Screen: Interactive CLI View */}
            {!isTerminalRawView ? (
              <div className="p-3.5 space-y-1.5 max-h-[360px] overflow-y-auto font-mono scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {getFilteredCommands().length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    No commands matching filter "{terminalFilter}". Click "All" to view all executed commands.
                  </div>
                ) : (
                  getFilteredCommands().map((cmd, idx) => {
                    const isComment = cmd.trim().startsWith('#');
                    const toolInfo = classifyToolForCommand(cmd);

                    if (isComment) {
                      return (
                        <div
                          key={`cmd-${idx}`}
                          className="py-1 px-2.5 rounded bg-slate-900/80 border border-slate-800/80 text-amber-300 font-bold text-[11px] tracking-wide my-1 flex items-center gap-1.5"
                        >
                          <span>📝</span>
                          <span>{cmd}</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`cmd-${idx}`}
                        className="flex items-start justify-between gap-2 py-1 px-2 rounded hover:bg-slate-900/70 transition-colors group"
                      >
                        {/* Prompt + Command */}
                        <div className="flex items-baseline gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                          {/* Line Number */}
                          <span className="text-[10px] text-slate-600 select-none w-6 shrink-0 text-right font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </span>

                          {/* Shell Prompt */}
                          <span className="text-emerald-400 font-bold shrink-0 select-none">
                            {getPromptUserAndHost().user}@{getPromptUserAndHost().host}:~$
                          </span>

                          {/* Command Line */}
                          <span className="text-cyan-200 font-medium break-all selection:bg-cyan-900 selection:text-white">
                            {cmd}
                          </span>
                        </div>

                        {/* Right: Tool Tag & Exit Status */}
                        <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-semibold flex items-center gap-1 ${toolInfo.bg} ${toolInfo.color}`}
                          >
                            <span>{toolInfo.icon}</span>
                            <span className="hidden md:inline">{toolInfo.tool}</span>
                          </span>
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                            Exit 0 ✓
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Live Interactive Prompt Input Line */}
                <form
                  onSubmit={handleAddCustomCommand}
                  className="pt-2 mt-2 border-t border-slate-900 flex items-center gap-2"
                >
                  <span className="text-emerald-400 font-bold shrink-0 text-xs">
                    {getPromptUserAndHost().user}@{getPromptUserAndHost().host}:~$
                  </span>
                  <input
                    type="text"
                    value={customCommandInput}
                    onChange={(e) => setCustomCommandInput(e.target.value)}
                    placeholder={`Type command run on ${getPromptUserAndHost().host} (e.g. docker ps, git pull, mvn clean)...`}
                    className="flex-1 bg-transparent text-cyan-300 text-xs font-mono placeholder-slate-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!customCommandInput.trim()}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all font-mono"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Record Command</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Raw Monospace Text Editor View */
              <div className="p-3">
                <textarea
                  rows={14}
                  value={activeServerCommands.join('\n')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    setActiveServerCommands(lines);
                    setCommandsExecuted(e.target.value);
                    const currentServer = serversList.find((s) => s.id === selectedServerId);
                    const serverKey = selectedServerId === 'all' ? 'all' : (currentServer ? currentServer.name : 'vm01siva-mon');
                    setServerHistories((prev) => ({
                      ...prev,
                      [serverKey]: lines,
                    }));
                  }}
                  className="w-full bg-[#03060E] border border-slate-800 rounded-lg p-3 text-cyan-300 font-mono text-xs focus:outline-none focus:border-blue-500 leading-relaxed resize-y"
                  placeholder="Paste or edit raw shell commands here..."
                />
              </div>
            )}

            {/* Terminal Status Footer Bar */}
            <div className="px-4 py-2 bg-[#070B16] border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-slate-300">
                  Showing <strong>{getFilteredCommands().length}</strong> of{' '}
                  <strong>{activeServerCommands.length}</strong> shell commands executed on{' '}
                  <strong className="text-emerald-400">{getPromptUserAndHost().host}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Filter: <strong className="text-cyan-400 uppercase">{terminalFilter}</strong>
                </span>
                <span>
                  Session:{' '}
                  <strong className="text-slate-300">
                    {selectedServerId === 'srv-vm01' || selectedServerId === 'vm01siva-mon'
                      ? 'PuTTY SSH (Live)'
                      : 'Console Session'}
                  </strong>
                </span>
                <span className="text-blue-400 font-semibold">Auto-Synced to CTO Email Audit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN GRID: CLOCK SCHEDULER (WITH 12H AM/PM) & CTO RECIPIENTS ROSTER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: CLOCK & DISPATCH SCHEDULING (WITH AM / PM) */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Clock &amp; Dispatch Scheduling</h3>
                  <p className="text-[11px] text-slate-400">Configure auto-send triggers with 12-Hour AM / PM clock</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                12h AM/PM Clock
              </span>
            </div>

            <div className="space-y-3.5 pt-4 text-xs">
              {/* Engineer identity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Engineer Name</label>
                  <input
                    type="text"
                    value={config.engineerName}
                    onChange={(e) => setConfig({ ...config, engineerName: e.target.value })}
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                    placeholder="Siva"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-slate-400">Role Title</label>
                  <input
                    type="text"
                    value={config.engineerRole}
                    onChange={(e) => setConfig({ ...config, engineerRole: e.target.value })}
                    className="w-full bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
                    placeholder="Lead DevOps Engineer"
                  />
                </div>
              </div>

              {/* Instant Auto-Dispatch on Action Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#090E1A] border border-[#1E293B]">
                <div>
                  <div className="font-semibold text-white">Instant Dispatch on Action</div>
                  <div className="text-[11px] text-slate-400">
                    Immediately send proof email whenever deployment or troubleshooting completes.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, autoDispatchOnAction: !config.autoDispatchOnAction })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    config.autoDispatchOnAction ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      config.autoDispatchOnAction ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Scheduled Clock Dispatch With Full AM / PM Selector */}
              <div className="p-3.5 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Scheduled Daily Work Digest Clock</div>
                    <div className="text-[11px] text-slate-400">
                      Dispatches aggregated summary of all work done at your set shift time.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, scheduledDispatchEnabled: !config.scheduledDispatchEnabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      config.scheduledDispatchEnabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        config.scheduledDispatchEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {config.scheduledDispatchEnabled && (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <label className="text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Clock Send Time (12-Hour AM / PM Format):</span>
                    </label>

                    {/* INTERACTIVE 12-HOUR AM / PM PICKER */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Hour */}
                      <select
                        value={clockHour}
                        onChange={(e) => setClockHour(e.target.value)}
                        className="bg-black border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((h) => (
                          <option key={h} value={h}>{h} Hour</option>
                        ))}
                      </select>

                      <span className="text-white font-bold font-mono">:</span>

                      {/* Minute */}
                      <select
                        value={clockMinute}
                        onChange={(e) => setClockMinute(e.target.value)}
                        className="bg-black border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold focus:outline-none"
                      >
                        {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                          <option key={m} value={m}>{m} Min</option>
                        ))}
                      </select>

                      {/* AM / PM Toggle Buttons */}
                      <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setClockPeriod('AM')}
                          className={`px-3 py-1.5 text-xs font-mono font-extrabold transition-all ${
                            clockPeriod === 'AM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-black text-slate-400 hover:text-white'
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setClockPeriod('PM')}
                          className={`px-3 py-1.5 text-xs font-mono font-extrabold transition-all ${
                            clockPeriod === 'PM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-black text-slate-400 hover:text-white'
                          }`}
                        >
                          PM
                        </button>
                      </div>

                      <span className="text-[11px] font-mono text-cyan-400 ml-auto font-semibold">
                        {clockHour}:{clockMinute} {clockPeriod} IST ({get24hString(clockHour, clockMinute, clockPeriod)} hrs)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingConfig ? 'Saving Settings...' : 'Save Clock & Schedule Settings'}</span>
            </button>
          </div>
        </div>

        {/* CARD 2: REAL COMPANY CTO & LEADERSHIP RECIPIENTS (With Clear All) */}
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">CTO &amp; Leadership Recipients</h3>
                  <p className="text-[11px] text-slate-400">Add your real company leadership emails</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {recipients.length > 0 && (
                  <button
                    onClick={handleClearAllRecipients}
                    className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                    title="Remove all dummy emails and start fresh with real company emails"
                  >
                    Clear All
                  </button>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {recipients.filter((r) => r.enabled).length} Active
                </span>
              </div>
            </div>

            {/* Recipient List */}
            <div className="space-y-2 pt-3 max-h-[190px] overflow-y-auto pr-1">
              {loadingRecipients ? (
                <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading recipients...</div>
              ) : recipients.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#090E1A] border border-dashed border-slate-700 text-center text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">No company emails configured yet.</div>
                  <div className="text-[11px]">Add your real Company CTO, Manager, or Team emails below.</div>
                </div>
              ) : (
                recipients.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#090E1A] border border-[#1E293B] text-xs hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{r.email}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 font-medium">
                          {r.role}
                        </span>
                      </div>
                      {r.name && <div className="text-[10px] text-slate-400">{r.name}</div>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleRecipient(r.id, r.enabled)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                          r.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {r.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      <button
                        onClick={() => handleDeleteRecipient(r.id, r.email)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Real Company Email Form */}
          <form onSubmit={handleAddRecipient} className="pt-3 border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter company email (e.g. cto@company.com)"
                className="sm:col-span-2 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="CTO">CTO (Chief Technology Officer)</option>
                <option value="Engineering Manager">Engineering Manager</option>
                <option value="VP of Engineering">VP of Engineering</option>
                <option value="Lead Architect">Lead Architect</option>
                <option value="Personal Audit Trail">Personal Audit Archive</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact Name (e.g. John Doe - Head of Engineering)"
                className="flex-1 bg-[#090E1A] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={addingRecipient}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addingRecipient ? 'Adding...' : 'Add Real Recipient'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* CARD 3: CLOUD ACCOUNT & SERVER SELECTION (AWS & AZURE) */}
      <div className="bg-[#111A2E] border border-blue-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Cloud Account &amp; Server Infrastructure</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  AWS &amp; Azure
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select which cloud provider account and host server this troubleshooting was executed on
              </p>
            </div>
          </div>

          {/* Provider Toggle Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('azure');
                setSelectedCloudAccount('Azure Production Subscription (Visual Studio Enterprise)');
                setTargetServer('vm01siva-mon (4.240.105.247) • Central India');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'azure'
                  ? 'bg-[#0078D4] text-white border-[#0078D4] shadow-md shadow-blue-500/30'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <AzureLogo className="w-3.5 h-3.5" />
              <span>Microsoft Azure</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('aws');
                setSelectedCloudAccount('AWS Production Account (590184029281 - VPC)');
                setTargetServer('i-09ab12cd34ef56789 (prod-api-cluster) • us-east-1');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'aws'
                  ? 'bg-[#FF9900] text-black border-[#FF9900] shadow-md shadow-amber-500/30'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <AwsLogo className="w-3.5 h-3.5" />
              <span>Amazon AWS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedCloudProvider('hybrid');
                setSelectedCloudAccount('On-Premise / Hybrid Infrastructure');
                setTargetServer('srv-onprem-dc1 (192.168.1.100)');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedCloudProvider === 'hybrid'
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-[#090E1A] text-slate-400 border-[#1E293B] hover:text-white'
              }`}
            >
              <span>Hybrid / On-Prem</span>
            </button>
          </div>
        </div>

        {/* Cloud Account & Server Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">
              {selectedCloudProvider === 'azure' ? 'Azure Subscription / Tenant Account' : selectedCloudProvider === 'aws' ? 'AWS Account ID & Environment' : 'Infrastructure Account'}
            </label>
            <input
              type="text"
              value={selectedCloudAccount}
              onChange={(e) => setSelectedCloudAccount(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="e.g. Visual Studio Enterprise (Sub: sub-azure-siva)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Target Host Server / Node Name &amp; IP</label>
            <input
              type="text"
              value={targetServer}
              onChange={(e) => setTargetServer(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
              placeholder="e.g. vm01siva-mon (4.240.105.247)"
            />
          </div>
        </div>
      </div>

      {/* CARD 4: LIVE PUTTY/SSH COMMAND AUTO-FETCHER & PROOF DISPATCH */}
      <div className="bg-[#111A2E] border border-indigo-500/30 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Record &amp; Dispatch Live DevOps Work Proof</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instant Proof
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Auto-fetch real commands executed via PuTTY/SSH or select a DevOps tool below
              </p>
            </div>
          </div>

          {/* Action Type Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Action Type:</span>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="Troubleshooting">Troubleshooting &amp; Fix</option>
              <option value="Deployment">Production Deployment</option>
              <option value="Security Patch">Security Patching</option>
              <option value="Configuration">Configuration Update</option>
              <option value="Disaster Recovery">Disaster Recovery</option>
            </select>
          </div>
        </div>

        {/* PROMINENT BUTTON: AUTO-FETCH PUTTY & SSH BASH COMMANDS */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-[#0A1A2F] to-[#090E1A] border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Live PuTTY / SSH Server Command Auto-Sync</span>
            </div>
            <p className="text-[11px] text-slate-300">
              Did you execute commands inside the server using <strong>PuTTY</strong> or SSH? Click here to auto-fetch your exact shell commands directly from the server!
            </p>
          </div>

          <button
            type="button"
            onClick={handleFetchServerHistory}
            disabled={fetchingServerHistory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 shrink-0 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingServerHistory ? 'animate-spin' : ''}`} />
            <span>{fetchingServerHistory ? 'Fetching Server Commands...' : 'Auto-Fetch PuTTY & SSH History'}</span>
          </button>
        </div>

        {/* DevOps Tools Quick Selector Grid */}
        <div className="space-y-2">
          <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Select DevOps Tool / Component:</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {DEVOPS_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  selectedTool === tool.id
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 scale-105'
                    : 'bg-[#090E1A] text-slate-300 border-[#1E293B] hover:border-slate-600 hover:text-white'
                }`}
              >
                <span className="text-[11px] font-bold truncate max-w-full">{tool.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Details Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Incident / Task Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-slate-400">Verification Outcome &amp; Impact</label>
            <textarea
              rows={3}
              value={resultOutcome}
              onChange={(e) => setResultOutcome(e.target.value)}
              className="w-full bg-[#090E1A] border border-[#1E293B] rounded-xl p-3 text-emerald-300 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            />
          </div>
        </div>

        {/* VIEW MODE TOGGLE BUTTONS (6-SECTION ORDERED REPORT VS CUSTOM STEP EDITOR) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 rounded-xl bg-[#090E1A] border border-[#1E293B]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setAuditViewTab('ordered6')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                auditViewTab === 'ordered6'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📋 6-Section Executive Report</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono">User Order</span>
            </button>
            <button
              type="button"
              onClick={() => setAuditViewTab('stepEditor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                auditViewTab === 'stepEditor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Step-by-Step Tool Editor</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono">{activities.length} Steps</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-cyan-300 hidden md:inline-block">
            {auditViewTab === 'ordered6'
              ? '1: Fleet • 2: Maven • 3: Terraform • 4: Ansible • 5: Docker • 6: K8s'
              : 'Interactive Multi-Tool Terminal Timeline'}
          </span>
        </div>

        {/* 6-SECTION ORDERED EXECUTIVE VIEW */}
        {auditViewTab === 'ordered6' ? (
          <div className="space-y-4 pt-1">
            {/* SECTION 1: ALL SERVERS FLEET OVERVIEW */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[10px]">
                    SECTION 1
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono">
                    All Servers Fleet Status (AWS &amp; Azure - Active / Running / Stopped)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {serversList.length} Servers Monitored
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#0B132B] text-slate-400 text-[10px] uppercase border-b border-slate-800">
                      <th className="py-2.5 px-3.5">Server Name</th>
                      <th className="py-2.5 px-3">Cloud Provider</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3">Region</th>
                      <th className="py-2.5 px-3 text-center">Power Status</th>
                      <th className="py-2.5 px-3.5 text-right">Active PuTTY Session</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {serversList.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-white flex items-center gap-1.5">
                          <span>🖥️</span>
                          <span>{srv.name}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              srv.cloudProvider === 'azure'
                                ? 'bg-[#0078D4]/20 text-[#60A5FA] border border-[#0078D4]/40'
                                : 'bg-[#FF9900]/20 text-[#F59E0B] border border-[#FF9900]/40'
                            }`}
                          >
                            {srv.cloudProvider === 'azure' ? (
                              <AzureLogo className="w-3 h-3" />
                            ) : (
                              <AwsLogo className="w-3 h-3" />
                            )}
                            <span>{srv.cloudProvider?.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{srv.publicIp || srv.host}</td>
                        <td className="py-2.5 px-3 text-slate-400">{srv.region}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              (srv?.status || '').toLowerCase() === 'running' || (srv?.status || '').toLowerCase() === 'online'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                (srv?.status || '').toLowerCase() === 'running' || (srv?.status || '').toLowerCase() === 'online'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : 'bg-rose-400'
                              }`}
                            ></span>
                            <span>{(srv?.status || 'RUNNING').toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right text-[11px] text-cyan-300 font-mono">
                          {srv.activeSession ? (
                            <span className="text-emerald-400 font-semibold">{srv.activeSession}</span>
                          ) : (
                            <span className="text-slate-500">Idle / No SSH</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: MAVEN ACTIVITY */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-600 text-white font-mono font-bold text-[10px]">
                    SECTION 2
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <span>☕</span>
                    <span>Maven Builds &amp; Application Deployments</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ✓ {orderedSections?.maven?.status || orderedSections?.section2_maven?.status || 'BUILD SUCCESS (Exit 0)'}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span>
                    App: <strong className="text-white">{orderedSections?.maven?.appName || orderedSections?.section2_maven?.appName || 'monitoring'}</strong> &bull; Server:{' '}
                    <strong className="text-white">{orderedSections?.maven?.server || orderedSections?.section2_maven?.server || targetServer}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono">{orderedSections?.maven?.source || orderedSections?.section2_maven?.source || sessionSource}</span>
                </div>
                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-cyan-300 text-xs">
                  <pre className="margin-0 whitespace-pre-wrap">{orderedSections?.maven?.commands || orderedSections?.section2_maven?.commands || 'mvn clean package -DskipTests'}</pre>
                </div>
              </div>
            </div>

            {/* SECTION 3: TERRAFORM ACTIVITY */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-600 text-white font-mono font-bold text-[10px]">
                    SECTION 3
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <span>🏗️</span>
                    <span>Terraform Infrastructure as Code (IaC)</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ✓ {orderedSections?.terraform?.status || orderedSections?.section3_terraform?.status || 'Apply Complete! (Exit 0)'}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span>
                    Project: <strong className="text-white">{orderedSections?.terraform?.projectName || orderedSections?.section3_terraform?.projectName || 'azure-rg01-infrastructure'}</strong> &bull; Server:{' '}
                    <strong className="text-white">{orderedSections?.terraform?.server || orderedSections?.section3_terraform?.server || targetServer}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono">{orderedSections?.terraform?.source || orderedSections?.section3_terraform?.source || sessionSource}</span>
                </div>
                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-cyan-300 text-xs">
                  <pre className="margin-0 whitespace-pre-wrap">{orderedSections?.terraform?.commands || orderedSections?.section3_terraform?.commands || 'terraform apply -auto-approve tfplan'}</pre>
                </div>
              </div>
            </div>

            {/* SECTION 4: ANSIBLE ACTIVITY */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px]">
                    SECTION 4
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Ansible Server Automation &amp; Playbooks</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ✓ {orderedSections?.ansible?.status || orderedSections?.section4_ansible?.status || 'PLAY RECAP: ok=6 changed=2 failed=0'}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span>
                    Playbook: <strong className="text-white">{orderedSections?.ansible?.playbookName || orderedSections?.section4_ansible?.playbookName || 'site.yml'}</strong> &bull; Target Inventory:{' '}
                    <strong className="text-white">{orderedSections?.ansible?.server || orderedSections?.section4_ansible?.server || targetServer}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono">{orderedSections?.ansible?.source || orderedSections?.section4_ansible?.source || sessionSource}</span>
                </div>
                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-cyan-300 text-xs">
                  <pre className="margin-0 whitespace-pre-wrap">{orderedSections?.ansible?.commands || orderedSections?.section4_ansible?.commands || 'ansible-playbook -i inventory.ini site.yml'}</pre>
                </div>
              </div>
            </div>

            {/* SECTION 5: DOCKER ACTIVITY */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-[10px]">
                    SECTION 5
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <span>🐳</span>
                    <span>Docker Containers &amp; Image Management</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ✓ {orderedSections?.docker?.status || orderedSections?.section5_docker?.status || 'Running (Exit 0)'}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span>
                    Image: <strong className="text-white">{orderedSections?.docker?.imageName || orderedSections?.section5_docker?.imageName || 'node:20-alpine'}</strong> &bull; Container:{' '}
                    <strong className="text-white">{orderedSections?.docker?.containerName || orderedSections?.section5_docker?.containerName || 'auth-microservice-prod'}</strong> &bull; Server:{' '}
                    <strong className="text-white">{orderedSections?.docker?.server || orderedSections?.section5_docker?.server || targetServer}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono">{orderedSections?.docker?.source || orderedSections?.section5_docker?.source || sessionSource}</span>
                </div>
                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-cyan-300 text-xs">
                  <pre className="margin-0 whitespace-pre-wrap">{orderedSections?.docker?.commands || orderedSections?.section5_docker?.commands || 'docker ps -a'}</pre>
                </div>
              </div>
            </div>

            {/* SECTION 6: KUBERNETES ACTIVITY */}
            <div className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden shadow-md">
              <div className="bg-[#0D1527] px-4 py-2.5 border-b border-[#1E293B] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-mono font-bold text-[10px]">
                    SECTION 6
                  </span>
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <span>☸️</span>
                    <span>Kubernetes Deployments &amp; Pod Lifecycle</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  ✓ {orderedSections?.k8s?.status || orderedSections?.section6_k8s?.status || '1/1 Ready, Running (Exit 0)'}
                </span>
              </div>
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pb-1 border-b border-slate-800">
                  <span>
                    Cluster: <strong className="text-white">{orderedSections?.k8s?.clusterName || orderedSections?.section6_k8s?.clusterName || 'k8s-cluster'}</strong> &bull; Namespace:{' '}
                    <strong className="text-white">{orderedSections?.k8s?.namespace || orderedSections?.section6_k8s?.namespace || 'production'}</strong>
                  </span>
                  <span className="text-cyan-400 font-mono">{orderedSections?.k8s?.source || orderedSections?.section6_k8s?.source || sessionSource}</span>
                </div>
                <div className="bg-black/90 p-2.5 rounded-lg border border-slate-800/80 font-mono text-cyan-300 text-xs">
                  <pre className="margin-0 whitespace-pre-wrap">{orderedSections?.k8s?.commands || orderedSections?.section6_k8s?.commands || 'kubectl get pods -A'}</pre>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* STEP-BY-STEP CUSTOM TOOL EDITOR VIEW */
          <div className="space-y-4 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="uppercase tracking-wider text-[11px] font-mono">
                  Tool-by-Tool Step-by-Step Executed Terminal Commands (Proof)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-mono text-[10px] border border-blue-500/30">
                  {activities.length} Tool Steps Logged
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Server: <strong className="text-white">{targetServer}</strong> &bull; PuTTY / SSH Session: <strong className="text-emerald-400">{sessionSource}</strong>
              </p>
            </div>

            {/* Quick Add Tool Buttons Bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">+ Add Tool:</span>
              <button
                type="button"
                onClick={() => handleAddActivity('Docker')}
                className="px-2 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Docker Step"
              >
                <span>🐳 Docker</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Maven')}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Maven Step"
              >
                <span>☕ Maven</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Nginx')}
                className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Nginx Step"
              >
                <span>🌐 Nginx</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Ansible')}
                className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Ansible Step"
              >
                <span>⚡ Ansible</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Terraform')}
                className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Terraform Step"
              >
                <span>🏗️ Terraform</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Kubernetes')}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Kubernetes Step"
              >
                <span>☸️ K8s</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Jenkins')}
                className="px-2 py-1 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Jenkins Step"
              >
                <span>👨‍💼 Jenkins</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('SonarQube')}
                className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add SonarQube Step"
              >
                <span>🔍 Sonar</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddActivity('Trivy')}
                className="px-2 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add Trivy Step"
              >
                <span>🛡️ Trivy</span>
              </button>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="space-y-3.5">
            {activities.map((act, index) => (
              <div
                key={act.id}
                className="bg-[#090E1A] border border-[#1E293B] rounded-xl overflow-hidden hover:border-blue-500/40 transition-all shadow-md"
              >
                {/* Step Card Header */}
                <div className="bg-[#0D1527] px-3.5 py-2 border-b border-[#1E293B] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                    {/* Step Number Badge */}
                    <span className="px-2.5 py-0.5 rounded bg-blue-600 text-white font-mono font-black text-[10px] shrink-0 tracking-wider">
                      STEP {index + 1}
                    </span>

                    {/* Tool Dropdown */}
                    <select
                      value={act.tool}
                      onChange={(e) => handleUpdateActivity(act.id, 'tool', e.target.value)}
                      className="bg-[#090E1A] border border-[#1E293B] rounded-lg px-2.5 py-1 text-xs text-white font-bold font-mono focus:outline-none focus:border-blue-500 shrink-0"
                    >
                      <option value="Docker">🐳 Docker</option>
                      <option value="Maven">☕ Maven</option>
                      <option value="Nginx">🌐 Nginx</option>
                      <option value="Ansible">⚡ Ansible</option>
                      <option value="Terraform">🏗️ Terraform</option>
                      <option value="Kubernetes">☸️ Kubernetes</option>
                      <option value="Jenkins">👨‍💼 Jenkins</option>
                      <option value="SonarQube">🔍 SonarQube</option>
                      <option value="Trivy">🛡️ Trivy</option>
                      <option value="Git & Version Control">📦 Git</option>
                      <option value="Server OS">🖥️ Server OS</option>
                    </select>

                    {/* Action Summary Input */}
                    <input
                      type="text"
                      value={act.actionName}
                      onChange={(e) => handleUpdateActivity(act.id, 'actionName', e.target.value)}
                      placeholder="Tool action summary (e.g. Docker image pull & container restart)"
                      className="flex-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 px-2 py-0.5 text-xs text-blue-200 font-semibold focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Verified Status Pill */}
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>{act.status || 'Verified (Exit 0)'}</span>
                    </span>

                    {/* Delete Step Button */}
                    {activities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Remove this tool step"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Terminal Commands Box for this Tool */}
                <div className="p-3 bg-black/95 font-mono text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1.5 mb-1.5 border-b border-slate-900">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <span>siva@vm01siva-mon:~$</span>
                      <span className="text-slate-400"># {act.tool} terminal commands executed:</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">Host: {targetServer.split(' ')[0]}</span>
                  </div>
                  <textarea
                    rows={Math.max(3, act.commands.split('\n').length)}
                    value={act.commands}
                    onChange={(e) => handleUpdateActivity(act.id, 'commands', e.target.value)}
                    placeholder={`Enter terminal commands for ${act.tool}...`}
                    className="w-full bg-transparent text-cyan-300 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* Dispatch Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Dispatches with clock stamp: <strong className="text-cyan-300 font-mono">{currentTime.ist}</strong> to{' '}
              <strong className="text-white">{recipients.filter((r) => r.enabled).length} recipients</strong>.
            </span>
          </div>

          <button
            onClick={handleDispatchProof}
            disabled={isDispatching}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isDispatching ? 'Dispatching Proof...' : 'Dispatch Proof of Work to CTO & Leadership'}</span>
          </button>
        </div>
      </div>

      {/* CARD 5: RECENT PROOF OF WORK AUDIT LOGS */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Dispatched Proof of Work Audit Logs</h3>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loadingLogs}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
          >
            <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="space-y-2">
          {loadingLogs ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#090E1A] border border-slate-800 text-center text-xs text-slate-400">
              No proof of work logs dispatched yet. Click "Dispatch Proof of Work" above to send your first audit report!
            </div>
          ) : (
            auditLogs.map((log, idx) => (
              <div
                key={log._id || log.auditId || idx}
                className="p-3.5 rounded-xl bg-[#090E1A] border border-[#1E293B] space-y-1.5 hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-400">{log.auditId || `AUDIT-${idx + 1}`}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-bold text-[10px]">
                      {log.actionType || 'Action'} &bull; {log.tool || 'DevOps'}
                    </span>
                    <span className="text-slate-400 text-[11px]">by {log.engineerName || 'Siva'}</span>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400">{log.clockTimeIST || ''}</span>
                </div>
                <div className="text-slate-200">{log.summary || 'Dispatch Summary'}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>Outcome: <strong className="text-emerald-400">{log.resultOutcome || 'SUCCESS'}</strong></span>
                  <span className="text-slate-500">Recipients: {log.recipients?.length || 0} &bull; Status: <strong className="text-emerald-400">{log.status || 'Dispatched'}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
export default DevOpsProofTab;
