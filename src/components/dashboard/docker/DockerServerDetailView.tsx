'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RotateCw,
  Power,
  Play,
  Square,
  Pause,
  Trash2,
  Terminal,
  RefreshCw,
  Boxes,
  Layers,
  HardDrive,
  Network,
  Activity,
  FileText,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Rocket,
  Settings,
  History,
  Shield,
  Server,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Loader2,
  GitBranch,
  Sparkles,
  Copy,
  Check,
  X,
  Eye,
} from 'lucide-react';
import { DockerIcon, AwsLogo, AzureLogo } from '@/components/icons/CloudIcons';
import {
  IDockerHostDetails,
  IDockerContainerItem,
  IDockerImageItem,
  IDockerVolumeItem,
  IDockerNetworkItem,
} from '@/lib/docker/dockerEngine';

interface DockerServerDetailViewProps {
  host: IDockerHostDetails;
  onBack: () => void;
  onOpenTerminal?: (host: IDockerHostDetails) => void;
}

type DockerTab = 'overview' | 'containers' | 'images' | 'volumes' | 'networks' | 'console' | 'deployment';

// ---------------------------------------------------------------------------
// Official Stack Brand SVG Icons (MERN, Python, Java, Maven, .NET Core)
// ---------------------------------------------------------------------------
function MernIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="-11.5 -10.23174 23 20.46348" className={className} fill="none">
      <circle cx="0" cy="0" r="2.05" fill="#00D8FF" />
      <g stroke="#00D8FF" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function PythonIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M11.9 2C6.9 2 7.2 4.2 7.2 4.2L7.2 6.5H12V7.2H5.1C2.8 7.2 2 9.5 2 11.9C2 14.3 3.6 14.6 4.6 14.6H6.1V12.6C6.1 10.3 7.8 8.6 10.1 8.6H14.8C16.6 8.6 17.6 7.4 17.6 6.1C17.6 4.3 16.2 2 11.9 2ZM9.5 3.5C10 3.5 10.4 3.9 10.4 4.4C10.4 4.9 10 5.3 9.5 5.3C9 5.3 8.6 4.9 8.6 4.4C8.6 3.9 9 3.5 9.5 3.5Z" fill="#387EB8"/>
      <path d="M12.1 22C17.1 22 16.8 19.8 16.8 19.8V17.5H12V16.8H18.9C21.2 16.8 22 14.5 22 12.1C22 9.7 20.4 9.4 19.4 9.4H17.9V11.4C17.9 13.7 16.2 15.4 13.9 15.4H9.2C7.4 15.4 6.4 16.6 6.4 17.9C6.4 19.7 7.8 22 12.1 22ZM14.5 20.5C14 20.5 13.6 20.1 13.6 19.6C13.6 19.1 14 18.7 14.5 18.7C15 18.7 15.4 19.1 15.4 19.6C15.4 20.1 15 20.5 14.5 20.5Z" fill="#FFE052"/>
    </svg>
  );
}

function JavaIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M7 19C10.5 19.5 15.5 19.5 18.5 17.5C17 18 15 18.5 12 18.5C9 18.5 7 18 7 19Z" fill="#F89820"/>
      <path d="M5.5 21.5C9.5 22.5 16.5 22.5 20 20C18 20.7 15 21.2 11.5 21.2C8 21.2 5.5 20.5 5.5 21.5Z" fill="#5382A1"/>
      <path d="M12.5 2C11 4.5 14 6 12 8C10.5 9.5 9 10.5 10 12C11 10.5 13.5 9.5 14.5 8C16 6 13.5 4 12.5 2Z" fill="#E76F00"/>
      <path d="M16 4.5C15 6 17 7 16 8.5C15 10 14 10.5 14.5 11.5C15.5 10.5 17 9.5 17.5 8.5C18.5 7 17 5.5 16 4.5Z" fill="#F89820"/>
      <path d="M6 16C8.5 17 16.5 17 19 15C17.5 15.5 14 16 11.5 16C9 16 6 15.5 6 16Z" fill="#5382A1"/>
    </svg>
  );
}

function MavenIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <path d="M18.8 2.2C15.5 3.5 13.2 6.8 11.5 10.2C10.2 12.8 9.1 15.5 7.5 18L5.5 21.5C5.8 21.2 6.2 20.8 6.5 20.5C9.2 17.8 11.2 14.5 13.2 11.2C15.2 7.8 17.2 4.8 18.8 2.2Z" fill="#C71A36"/>
      <path d="M11.5 10.2C9.8 13.5 8.2 16.8 5.8 19.8C5.2 20.5 4.5 21.2 3.8 21.8L5.5 21.5C7.2 19 8.2 16.2 9.5 13.5C10.2 12.2 10.8 11.2 11.5 10.2Z" fill="#E65100"/>
      <path d="M18.8 2.2C17.2 5.5 15.2 8.8 13.2 12C11.5 14.8 9.5 17.8 6.8 20.2L5.5 21.5C8.2 18.5 11.2 14.8 14.2 11.2C16.2 8.5 17.8 5.5 18.8 2.2Z" fill="#29B6F6"/>
    </svg>
  );
}

function DotNetIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none">
      <circle cx="12" cy="12" r="10" fill="#512BD4"/>
      <path d="M6 14.5V9.5H7.5V14.5H6ZM9.5 14.5V9.5H11.2L13.8 12.8V9.5H15.2V14.5H13.5L10.9 11.2V14.5H9.5ZM17 14.5V9.5H21V10.8H18.5V11.4H20.5V12.6H18.5V13.2H21V14.5H17Z" fill="white"/>
      <circle cx="4.8" cy="14" r="1" fill="#23D9E2"/>
    </svg>
  );
}

export interface IStackPreset {
  id: string;
  name: string;
  tagline: string;
  appName: string;
  gitRepoUrl: string;
  gitBranch: string;
  badgeColor: string;
  activeGlow: string;
  activeBorder: string;
  packageManager: string;
  frontendContainer: string;
  backendContainer: string;
  databaseContainer: string;
  redisContainer: string;
  nginxContainer: string;
  frontendPort: number;
  backendPort: number;
  databasePort: number;
  buildCommand: string;
  runCommand: string;
  healthCheckUrl: string;
  dockerfile: string;
}

const STACK_PRESETS: IStackPreset[] = [
  {
    id: 'mern',
    name: 'MERN Stack',
    tagline: 'React 19 + Express API + PostgreSQL/Mongo',
    appName: 'mern-stack-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/mern-stack-app.git',
    gitBranch: 'main',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    activeGlow: 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.35)]',
    activeBorder: 'border-cyan-400',
    packageManager: 'npm',
    frontendContainer: 'mern-frontend',
    backendContainer: 'mern-backend',
    databaseContainer: 'mern-database',
    redisContainer: 'mern-redis-cache',
    nginxContainer: 'mern-nginx-proxy',
    frontendPort: 3001,
    backendPort: 5001,
    databasePort: 5431,
    buildCommand: 'npm run build',
    runCommand: 'npm start',
    healthCheckUrl: 'http://localhost:3001',
    dockerfile: 'Dockerfile (Node 20 LTS)',
  },
  {
    id: 'python',
    name: 'Python',
    tagline: 'FastAPI / Django + Postgres Multi-Tier',
    appName: 'python-fastapi-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/python-fastapi-app.git',
    gitBranch: 'main',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    activeGlow: 'bg-amber-500/15 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]',
    activeBorder: 'border-amber-400',
    packageManager: 'pip',
    frontendContainer: 'python-frontend',
    backendContainer: 'python-backend',
    databaseContainer: 'python-database',
    redisContainer: 'python-redis-cache',
    nginxContainer: 'python-nginx-proxy',
    frontendPort: 3002,
    backendPort: 5002,
    databasePort: 5432,
    buildCommand: 'pip install -r requirements.txt',
    runCommand: 'uvicorn main:app --host 0.0.0.0 --port 5002',
    healthCheckUrl: 'http://localhost:3002',
    dockerfile: 'Dockerfile (Python 3.12)',
  },
  {
    id: 'java',
    name: 'Java (Spring)',
    tagline: 'Spring Boot 3.3 + OpenJDK 21 + Postgres',
    appName: 'java-spring-boot-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/java-spring-boot-app.git',
    gitBranch: 'main',
    badgeColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    activeGlow: 'bg-orange-500/15 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.35)]',
    activeBorder: 'border-orange-400',
    packageManager: 'mvn',
    frontendContainer: 'java-frontend',
    backendContainer: 'java-backend',
    databaseContainer: 'java-database',
    redisContainer: 'java-redis-cache',
    nginxContainer: 'java-nginx-proxy',
    frontendPort: 3003,
    backendPort: 8080,
    databasePort: 5433,
    buildCommand: 'mvn clean package -DskipTests',
    runCommand: 'java -jar target/*.jar',
    healthCheckUrl: 'http://localhost:3003',
    dockerfile: 'Dockerfile (OpenJDK 21 JRE)',
  },
  {
    id: 'maven',
    name: 'Maven',
    tagline: 'Apache Maven Multistage Build',
    appName: 'maven-microservice-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/maven-microservice.git',
    gitBranch: 'main',
    badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    activeGlow: 'bg-rose-500/15 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    activeBorder: 'border-rose-400',
    packageManager: 'mvn',
    frontendContainer: 'maven-frontend',
    backendContainer: 'maven-backend',
    databaseContainer: 'maven-database',
    redisContainer: 'maven-redis-cache',
    nginxContainer: 'maven-nginx-proxy',
    frontendPort: 3005,
    backendPort: 8085,
    databasePort: 5435,
    buildCommand: 'mvn clean package -DskipTests',
    runCommand: 'java -jar target/*.jar',
    healthCheckUrl: 'http://localhost:3005',
    dockerfile: 'Dockerfile (Maven 3.9 Multi-Stage)',
  },
  {
    id: 'dotnet',
    name: '.NET Core',
    tagline: 'ASP.NET 8.0/9.0 + C# Web API Enterprise',
    appName: 'dotnet-core-app',
    gitRepoUrl: 'https://github.com/Nallamekala-SivaBrahmaiah/dotnet-webapi-app.git',
    gitBranch: 'main',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    activeGlow: 'bg-purple-500/15 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.35)]',
    activeBorder: 'border-purple-400',
    packageManager: 'dotnet',
    frontendContainer: 'dotnet-frontend',
    backendContainer: 'dotnet-backend',
    databaseContainer: 'dotnet-database',
    redisContainer: 'dotnet-redis-cache',
    nginxContainer: 'dotnet-nginx-proxy',
    frontendPort: 3004,
    backendPort: 5004,
    databasePort: 5434,
    buildCommand: 'dotnet restore && dotnet publish -c Release -o ./publish',
    runCommand: 'dotnet ./publish/app.dll',
    healthCheckUrl: 'http://localhost:3004',
    dockerfile: 'Dockerfile (ASP.NET 8.0)',
  },
];

export function DockerServerDetailView({
  host,
  onBack,
  onOpenTerminal,
}: DockerServerDetailViewProps) {
  // Tab State
  const [activeTab, setActiveTab] = useState<DockerTab>('containers');

  // Server Resources State
  const [isLoading, setIsLoading] = useState(false);
  const [containers, setContainers] = useState<IDockerContainerItem[]>([]);
  const [images, setImages] = useState<IDockerImageItem[]>([]);
  const [volumes, setVolumes] = useState<IDockerVolumeItem[]>([]);
  const [networks, setNetworks] = useState<IDockerNetworkItem[]>([]);
  const [engineInfo, setEngineInfo] = useState<any>(null);
  const [dockerStatus, setDockerStatus] = useState(host.dockerStatus);
  const [dockerVersion, setDockerVersion] = useState(host.dockerVersion);

  // Search filters per tab
  const [containerSearch, setContainerSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');
  const [volumeSearch, setVolumeSearch] = useState('');
  const [networkSearch, setNetworkSearch] = useState('');

  // Container Action State
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // ---------------------------------------------------------------------------
  // Console Tab State
  // ---------------------------------------------------------------------------
  const [consoleTail, setConsoleTail] = useState<number>(200);
  const [consoleSearch, setConsoleSearch] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<string>('');
  const [consoleLoading, setConsoleLoading] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Multi-Application Stack & Container Selection
  const [selectedStack, setSelectedStack] = useState<string>('all');
  const [selectedContainerTarget, setSelectedContainerTarget] = useState<string>('');

  // Resource Inspect Modal State (Containers, Images, Volumes, Networks)
  const [inspectModal, setInspectModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'container' | 'image' | 'volume' | 'network';
    target: string;
    content: string;
    loading: boolean;
  }>({
    isOpen: false,
    title: '',
    type: 'container',
    target: '',
    content: '',
    loading: false,
  });
  const [copiedInspect, setCopiedInspect] = useState(false);

  const handleInspectResource = async (
    type: 'container' | 'image' | 'volume' | 'network',
    target: string
  ) => {
    setInspectModal({
      isOpen: true,
      title: `Inspect ${type.charAt(0).toUpperCase() + type.slice(1)}: ${target}`,
      type,
      target,
      content: '',
      loading: true,
    });
    setCopiedInspect(false);

    try {
      const endpoint = `/api/docker/servers/${host.id}/${type}s`;
      const bodyPayload: any = { action: 'inspect' };
      if (type === 'container') bodyPayload.container = target;
      else if (type === 'image') bodyPayload.image = target;
      else if (type === 'volume') bodyPayload.volume = target;
      else if (type === 'network') bodyPayload.network = target;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        let formatted = data.output;
        try {
          const parsed = JSON.parse(data.output);
          formatted = JSON.stringify(parsed, null, 2);
        } catch {}
        setInspectModal((prev) => ({
          ...prev,
          content: formatted,
          loading: false,
        }));
      } else {
        setInspectModal((prev) => ({
          ...prev,
          content: `// Error inspecting ${type}:\n${data.error || 'Failed to retrieve inspect output'}`,
          loading: false,
        }));
        showToast('error', data.error || `Failed to inspect ${type}`);
      }
    } catch (err: any) {
      setInspectModal((prev) => ({
        ...prev,
        content: `// Network error inspecting ${type}:\n${err.message}`,
        loading: false,
      }));
      showToast('error', err.message);
    }
  };

  // ---------------------------------------------------------------------------
  // 1-Click Deployment Tab State
  // ---------------------------------------------------------------------------
  const defaultUser = host.username || 'azureuser';
  const initialPreset = STACK_PRESETS[0]; // MERN Stack
  const [deploymentConfig, setDeploymentConfig] = useState<any>({
    appName: initialPreset.appName,
    stackType: initialPreset.id,
    gitRepoUrl: initialPreset.gitRepoUrl,
    gitBranch: initialPreset.gitBranch || 'main',
    appDirectory: `/home/${defaultUser}/apps/${initialPreset.id}`,
    frontendDirectory: 'src',
    backendDirectory: 'src/server',
    frontendDockerfile: initialPreset.dockerfile,
    backendDockerfile: 'Dockerfile',
    composeFilePath: 'docker-compose.yml',
    packageManager: initialPreset.packageManager,
    buildCommand: initialPreset.buildCommand,
    runCommand: initialPreset.runCommand,
    frontendContainerName: initialPreset.frontendContainer,
    backendContainerName: initialPreset.backendContainer,
    databaseContainerName: initialPreset.databaseContainer,
    redisContainerName: initialPreset.redisContainer,
    nginxContainerName: initialPreset.nginxContainer,
    frontendPort: initialPreset.frontendPort,
    backendPort: initialPreset.backendPort,
    databasePort: initialPreset.databasePort,
    healthCheckUrl: initialPreset.healthCheckUrl,
  });
  const [deploymentHistory, setDeploymentHistory] = useState<any[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentSteps, setDeploymentSteps] = useState<any[]>([]);
  const [deploymentLogs, setDeploymentLogs] = useState<string>('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Handle Selecting a Stack Preset in Model 1
  const handleSelectStack = (stack: IStackPreset) => {
    const user = host.username || 'azureuser';
    setDeploymentConfig((prev: any) => ({
      ...prev,
      appName: stack.appName,
      stackType: stack.id,
      gitRepoUrl: stack.gitRepoUrl,
      gitBranch: stack.gitBranch || 'main',
      appDirectory: `/home/${user}/apps/${stack.id}`,
      packageManager: stack.packageManager,
      frontendContainerName: stack.frontendContainer,
      backendContainerName: stack.backendContainer,
      databaseContainerName: stack.databaseContainer,
      redisContainerName: stack.redisContainer,
      nginxContainerName: stack.nginxContainer,
      frontendPort: stack.frontendPort,
      backendPort: stack.backendPort,
      databasePort: stack.databasePort,
      buildCommand: stack.buildCommand,
      runCommand: stack.runCommand,
      healthCheckUrl: stack.healthCheckUrl,
      frontendDockerfile: stack.dockerfile,
    }));
  };

  // Helper to render the appropriate SVG icon for a stack
  const renderStackIcon = (stackId: string) => {
    switch (stackId) {
      case 'mern':
        return <MernIcon className="w-4 h-4" />;
      case 'python':
        return <PythonIcon className="w-4 h-4" />;
      case 'java':
        return <JavaIcon className="w-4 h-4" />;
      case 'maven':
        return <MavenIcon className="w-4 h-4" />;
      case 'dotnet':
        return <DotNetIcon className="w-4 h-4" />;
      default:
        return <Boxes className="w-4 h-4 text-cyan-400" />;
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Fetch Full Docker Resources for this Server
  // ---------------------------------------------------------------------------
  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setContainers(data.containers || []);
        setImages(data.images || []);
        setVolumes(data.volumes || []);
        setNetworks(data.networks || []);
        setEngineInfo(data.engineInfo || null);
        setDockerStatus(data.dockerStatus);
        setDockerVersion(data.dockerVersion);
      } else {
        showToast('error', data.error || 'Failed to connect to Docker host');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Network error fetching Docker resources');
    } finally {
      setIsLoading(false);
    }
  }, [host.id]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ---------------------------------------------------------------------------
  // 2. Fetch Console Logs & Dynamic Target Resolution
  // ---------------------------------------------------------------------------
  const availableStacks = React.useMemo(() => {
    return [
      { id: 'all', name: 'All Applications (Fleet)', tag: 'GLOBAL', color: 'border-slate-500/30 text-slate-300' },
      { id: 'mern', name: 'MERN Stack (React / Node / Mongo)', tag: 'MERN', color: 'border-cyan-500/30 text-cyan-300' },
      { id: 'python', name: 'Python Stack (FastAPI / Postgres)', tag: 'PYTHON', color: 'border-amber-500/30 text-amber-300' },
      { id: 'java', name: 'Java Stack (Spring Boot / DB)', tag: 'JAVA', color: 'border-rose-500/30 text-rose-300' },
      { id: 'dotnet', name: '.NET Core Stack (Web API / DB)', tag: '.NET', color: 'border-purple-500/30 text-purple-300' },
    ];
  }, []);

  // Filter containers by selected stack
  const currentStackContainers = React.useMemo(() => {
    if (selectedStack === 'all') return containers;
    return containers.filter(
      (c) =>
        c.name.toLowerCase().startsWith(selectedStack.toLowerCase()) ||
        c.name.toLowerCase().includes(selectedStack.toLowerCase())
    );
  }, [containers, selectedStack]);

  // Effective Target Container to query logs for
  const effectiveTargetContainer = React.useMemo(() => {
    if (selectedContainerTarget) {
      if (selectedContainerTarget.includes(',') || selectedContainerTarget === 'all') return selectedContainerTarget;
      const exists = containers.some((c) => c.name === selectedContainerTarget);
      if (exists) return selectedContainerTarget;
    }

    if (currentStackContainers.length > 0) {
      return currentStackContainers[0].name;
    }

    return containers[0]?.name || 'all';
  }, [selectedContainerTarget, containers, currentStackContainers]);

  const fetchConsoleLogs = useCallback(async () => {
    if (isPaused) return;
    setConsoleLoading(true);
    try {
      const targetContainer = effectiveTargetContainer;

      const res = await fetch(
        `/api/docker/servers/${host.id}/logs?container=${encodeURIComponent(targetContainer)}&lines=${consoleTail}`
      );
      const data = await res.json();
      if (res.ok && data.logs) {
        setConsoleLogs(data.logs);
      } else if (data.error) {
        setConsoleLogs(`[ERROR] ${data.error}`);
      }
    } catch (err: any) {
      console.warn('Failed to fetch logs:', err);
      setConsoleLogs(`[FETCH ERROR] ${err.message || 'Network request failed'}`);
    } finally {
      setConsoleLoading(false);
    }
  }, [host.id, effectiveTargetContainer, consoleTail, isPaused]);

  useEffect(() => {
    if (activeTab === 'console') {
      fetchConsoleLogs();
    }
  }, [activeTab, effectiveTargetContainer, fetchConsoleLogs]);

  // Auto-scroll terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [consoleLogs, autoScroll]);

  // ---------------------------------------------------------------------------
  // 3. Load Deployment Config & History
  // ---------------------------------------------------------------------------
  const loadDeploymentData = useCallback(async () => {
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`);
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.config) {
          // If loaded config still points to monitoring.git, sanitize to active stack preset
          if (data.config.gitRepoUrl?.includes('monitoring.git') || data.config.appName === 'monitoring-app') {
            const user = host.username || 'azureuser';
            const preset = STACK_PRESETS.find((s) => s.id === data.config.stackType) || STACK_PRESETS[0];
            setDeploymentConfig((prev: any) => ({
              ...prev,
              ...data.config,
              appName: preset.appName,
              gitRepoUrl: preset.gitRepoUrl,
              gitBranch: data.config.gitBranch || preset.gitBranch || 'main',
              appDirectory: `/home/${user}/apps/${preset.id}`,
              packageManager: preset.packageManager,
              frontendContainerName: preset.frontendContainer,
              backendContainerName: preset.backendContainer,
              databaseContainerName: preset.databaseContainer,
              frontendPort: preset.frontendPort,
              backendPort: preset.backendPort,
              databasePort: preset.databasePort,
            }));
          } else {
            setDeploymentConfig(data.config);
          }
        }
        if (data.history) setDeploymentHistory(data.history);
      }
    } catch (err) {
      console.warn('Failed to load deploy data:', err);
    }
  }, [host.id, host.username]);

  useEffect(() => {
    if (activeTab === 'deployment') {
      loadDeploymentData();
    }
  }, [activeTab, loadDeploymentData]);

  // ---------------------------------------------------------------------------
  // 4. Container Actions (Start, Stop, Restart, Pause, Unpause, Delete)
  // ---------------------------------------------------------------------------
  const handleContainerAction = async (action: 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'remove', containerName: string) => {
    setActionLoading(`${action}-${containerName}`);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, container: containerName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Container "${containerName}" ${action} executed successfully!`);
        await fetchResources();
      } else {
        showToast('error', data.error || `Container ${action} failed.`);
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Single-Click Deployment Execution
  // ---------------------------------------------------------------------------
  const handleRun1ClickDeploy = async () => {
    setIsDeploying(true);
    setDeploymentLogs('Initializing 1-Click Container Deployment...\n');
    setDeploymentSteps([
      { name: '1. Git Sync', status: 'RUNNING' },
      { name: '2. Dependencies', status: 'PENDING' },
      { name: '3. Docker Build', status: 'PENDING' },
      { name: '4. Container Recreate', status: 'PENDING' },
      { name: '5. Health Verification', status: 'PENDING' },
    ]);

    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeploymentLogs(data.logs || 'Deployment completed successfully');
        if (data.steps) setDeploymentSteps(data.steps);
        showToast('success', '1-Click Application Deployment Succeeded!');
        await fetchResources();
        await loadDeploymentData();
      } else {
        setDeploymentLogs(data.logs || data.error || 'Deployment failed');
        if (data.steps) setDeploymentSteps(data.steps);
        showToast('error', data.error || 'Deployment failed.');
      }
    } catch (err: any) {
      setDeploymentLogs((prev) => prev + `\nFatal Error: ${err.message}`);
      showToast('error', err.message);
    } finally {
      setIsDeploying(false);
    }
  };

  // Save Configuration
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', config: deploymentConfig }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Deployment parameters for ${deploymentConfig.stackType?.toUpperCase() || 'MERN'} saved!`);
        setConfigModalOpen(false);
      } else {
        showToast('error', data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Save Configuration & Immediately Run Deployment
  const handleSaveAndDeploy = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/docker/servers/${host.id}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', config: deploymentConfig }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `Preset saved! Launching 1-Click Deploy for ${deploymentConfig.stackType?.toUpperCase() || 'MERN'}...`);
        setConfigModalOpen(false);
        setActiveTab('deployment');
        handleRun1ClickDeploy();
      } else {
        showToast('error', data.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isRunning = dockerStatus === 'running';
  const runningContainersCount = containers.filter((c) => c.state === 'running').length;
  const stoppedContainersCount = containers.filter((c) => c.state !== 'running').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500/40 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb Navigation Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={onBack}
            className="hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Docker Hosts</span>
          </button>
          <span>/</span>
          <span className="text-white font-mono font-semibold">{host.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#111A2E] hover:bg-[#18233C] text-slate-200 border border-[#1E293B] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-semibold bg-[#0B1120] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] rounded-lg transition-colors cursor-pointer"
          >
            Return to Inventory
          </button>
        </div>
      </div>

      {/* Hero Banner matching AzureVMDetailView layout */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 lg:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#1E293B]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0089D6]/20 text-[#0089D6] flex items-center justify-center flex-shrink-0 shadow-inner">
              <DockerIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">{host.name}</h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-[#18233C] text-[#5EA0EF] border border-[#0089D6]/30 font-semibold">
                  {host.host || host.publicIp}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    isRunning
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{isRunning ? 'DAEMON RUNNING' : 'DAEMON STOPPED'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <Shield className="w-3 h-3" />
                  <span>SSH Monitored Node</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Docker Engine: <strong className="text-cyan-400 font-mono">{dockerVersion}</strong> • Cloud:{' '}
                <strong className="text-slate-200 capitalize">{host.cloudProvider === 'other' ? 'On-Premises' : host.cloudProvider}</strong> • Region:{' '}
                <strong className="text-slate-200">{host.region}</strong> • OS:{' '}
                <strong className="text-slate-200">{host.osName}</strong>
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onOpenTerminal?.(host)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-blue-600/30"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Connect SSH Terminal</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('deployment');
                handleRun1ClickDeploy();
              }}
              disabled={isDeploying}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-colors cursor-pointer shadow-sm shadow-purple-600/30"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Run 1-Click Deploy</span>
            </button>
          </div>
        </div>

        {/* 5 Summary KPI Cards inside Details */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Running Containers</span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">{runningContainersCount}</span>
            <span className="text-[10px] text-slate-500 block">Out of {containers.length} total</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Stopped Containers</span>
            <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">{stoppedContainersCount}</span>
            <span className="text-[10px] text-slate-500 block">Exited / Inactive</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Images</span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">{images.length}</span>
            <span className="text-[10px] text-slate-500 block">Local cached</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Persistent Volumes</span>
            <span className="text-xl font-bold text-purple-400 font-mono mt-1 block">{volumes.length}</span>
            <span className="text-[10px] text-slate-500 block">Stateful storage</span>
          </div>

          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Virtual Networks</span>
            <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">{networks.length}</span>
            <span className="text-[10px] text-slate-500 block">Bridges & Overlays</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Azure VM Detail View Style) */}
      <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-2 shadow-xl shadow-black/20 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'containers', label: 'Containers', icon: Boxes, badge: containers.length },
            { id: 'images', label: 'Images', icon: Layers, badge: images.length },
            { id: 'volumes', label: 'Volumes', icon: HardDrive, badge: volumes.length },
            { id: 'networks', label: 'Networks', icon: Network, badge: networks.length },
            { id: 'console', label: 'App Console', icon: Terminal },
            { id: 'deployment', label: '1-Click Deployment', icon: Rocket },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as DockerTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#18233C]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DockerIcon className="w-4 h-4 text-blue-400" />
              <span>Docker Daemon Configuration</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Docker Version</span>
                <span className="text-white font-mono font-bold">{dockerVersion}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Operating System</span>
                <span className="text-white">{engineInfo?.operatingSystem || host.osName}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Kernel Version</span>
                <span className="text-white font-mono">{engineInfo?.kernelVersion || 'Linux 6.8'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Storage Driver</span>
                <span className="text-cyan-400 font-mono">{engineInfo?.storageDriver || 'overlay2'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Cgroup Driver</span>
                <span className="text-purple-400 font-mono">{engineInfo?.cgroupDriver || 'systemd'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Root Directory</span>
                <span className="text-slate-300 font-mono">{engineInfo?.rootDir || '/var/lib/docker'}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Host Compute & Telemetry</span>
            </h3>
            <div className="divide-y divide-[#1E293B] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Total CPU Cores</span>
                <span className="text-white font-mono font-bold">{engineInfo?.cpus || 2} Cores</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Total Memory Available</span>
                <span className="text-white font-mono">
                  {engineInfo?.totalMemoryBytes
                    ? `${(engineInfo.totalMemoryBytes / (1024 ** 3)).toFixed(1)} GB`
                    : '8.0 GB'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Active Container Memory</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {containers.reduce((acc, c) => acc + (c.memoryPercent || 0), 0).toFixed(1)}% Allocated
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">Harmonized Stack Status</span>
                <span className="text-emerald-400 font-bold">1:1 Naming Configured</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-400">SSH Connection Status</span>
                <span className="text-emerald-400 font-bold">Verified & Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTAINERS TAB */}
      {activeTab === 'containers' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search containers by name, ID, or image..."
                value={containerSearch}
                onChange={(e) => setContainerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total: <strong className="text-white">{containers.length}</strong>
            </span>
          </div>

          {/* Containers Table */}
          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                    <th className="py-3 px-4">Container Name</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Image Name (1:1)</th>
                    <th className="py-3 px-3">CPU %</th>
                    <th className="py-3 px-3">RAM Usage</th>
                    <th className="py-3 px-3">Ports</th>
                    <th className="py-3 px-3">Uptime</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/60">
                  {containers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500 space-y-2">
                        <Boxes className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-sm font-semibold text-slate-400">No Docker containers running</p>
                      </td>
                    </tr>
                  ) : (
                    containers
                      .filter((c) =>
                        !containerSearch ||
                        c.name.toLowerCase().includes(containerSearch.toLowerCase()) ||
                        c.image.toLowerCase().includes(containerSearch.toLowerCase()) ||
                        c.shortId.toLowerCase().includes(containerSearch.toLowerCase())
                      )
                      .map((c) => {
                        const isOnline = c.state === 'running';
                        const isBusy = actionLoading?.includes(c.name);

                        return (
                          <tr key={c.id || c.name} className="hover:bg-[#18233C]/50 transition-colors">
                            {/* Name & ID */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-white font-mono flex items-center gap-2">
                                <span>{c.name}</span>
                                {c.isHarmonizedName && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                                    Harmonized
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">id: {c.shortId}</div>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                                <span>{c.state}</span>
                              </span>
                            </td>

                            {/* Matching Image Name */}
                            <td className="py-3 px-3 font-mono text-cyan-300 text-[11px]">
                              {c.image}
                            </td>

                            {/* CPU */}
                            <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">
                              {c.cpuPercent ?? 0}%
                            </td>

                            {/* RAM */}
                            <td className="py-3 px-3 font-mono text-purple-300">
                              {c.memoryUsage || '0 MB'}
                            </td>

                            {/* Ports */}
                            <td className="py-3 px-3 font-mono text-amber-300 text-[11px]">
                              {c.ports || '-'}
                            </td>

                            {/* Uptime */}
                            <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                              {c.status || 'Active'}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                {isOnline ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleContainerAction('restart', c.name)}
                                      disabled={isBusy}
                                      className="px-2 py-1 rounded bg-[#070B14] hover:bg-emerald-600/30 text-emerald-400 border border-[#1E293B] text-xs font-semibold cursor-pointer disabled:opacity-50"
                                      title="Restart Container"
                                    >
                                      Restart
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleContainerAction('stop', c.name)}
                                      disabled={isBusy}
                                      className="px-2 py-1 rounded bg-[#070B14] hover:bg-rose-600/30 text-rose-400 border border-[#1E293B] text-xs font-semibold cursor-pointer disabled:opacity-50"
                                      title="Stop Container"
                                    >
                                      Stop
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleContainerAction('start', c.name)}
                                    disabled={isBusy}
                                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                                    title="Start Container"
                                  >
                                    Start
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedContainerTarget(c.name);
                                    const prefix = c.name.split('-')[0].toLowerCase();
                                    if (['mern', 'python', 'java', 'dotnet'].includes(prefix)) {
                                      setSelectedStack(prefix);
                                    } else {
                                      setSelectedStack('all');
                                    }
                                    setActiveTab('console');
                                  }}
                                  className="p-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-400 hover:text-white border border-[#1E293B] cursor-pointer"
                                  title="View Live Logs"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleInspectResource('container', c.name)}
                                  className="px-2 py-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer transition flex items-center gap-1"
                                  title="Inspect Container JSON"
                                >
                                  <Eye className="w-3 h-3 text-cyan-400" />
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMAGES TAB */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search images by repository or tag..."
                value={imageSearch}
                onChange={(e) => setImageSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Images: <strong className="text-white">{images.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Repository / Image Name</th>
                  <th className="py-3 px-3">Tag</th>
                  <th className="py-3 px-3">Image ID</th>
                  <th className="py-3 px-3">Disk Size</th>
                  <th className="py-3 px-3">Container Usage</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {images.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No Docker images found on this server.
                    </td>
                  </tr>
                ) : (
                  images
                    .filter((img) => !imageSearch || img.repository.toLowerCase().includes(imageSearch.toLowerCase()))
                    .map((img) => (
                      <tr key={img.id} className="hover:bg-[#18233C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-300">{img.repository}</td>
                        <td className="py-3 px-3 font-mono text-purple-300 font-semibold">{img.tag}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{img.shortId}</td>
                        <td className="py-3 px-3 font-mono text-white">{img.size}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] border border-blue-500/20 font-bold">
                            {img.containerCount || 0} active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleInspectResource('image', img.repository !== '<none>' ? `${img.repository}:${img.tag}` : img.id)}
                            className="px-2.5 py-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer transition inline-flex items-center gap-1"
                            title="Inspect Image JSON"
                          >
                            <Eye className="w-3 h-3 text-cyan-400" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VOLUMES TAB */}
      {activeTab === 'volumes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search persistent volumes..."
                value={volumeSearch}
                onChange={(e) => setVolumeSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Volumes: <strong className="text-white">{volumes.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Volume Name (1:1)</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3">Host Mountpoint</th>
                  <th className="py-3 px-3">Connected Services</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {volumes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No Docker volumes discovered.
                    </td>
                  </tr>
                ) : (
                  volumes
                    .filter((v) => !volumeSearch || v.name.toLowerCase().includes(volumeSearch.toLowerCase()))
                    .map((vol) => {
                      const isDb = vol.name.includes('database') || vol.name.includes('postgres') || vol.name.includes('data');

                      return (
                        <tr key={vol.name} className="hover:bg-[#18233C]/50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-purple-300">{vol.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-400">{vol.driver}</td>
                          <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{vol.mountpoint}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400 text-[11px]">
                            {vol.connectedContainers?.join(', ') || 'Auto-bound'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isDb ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold font-mono">
                                  Preserved
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                                  Standard
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleInspectResource('volume', vol.name)}
                                className="px-2.5 py-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer transition inline-flex items-center gap-1"
                                title="Inspect Volume JSON"
                              >
                                <Eye className="w-3 h-3 text-cyan-400" />
                                <span>Inspect</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: NETWORKS TAB */}
      {activeTab === 'networks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-[#111A2E] border border-[#1E293B] p-3 rounded-xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search docker networks..."
                value={networkSearch}
                onChange={(e) => setNetworkSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-[#070B14] border border-[#1E293B] rounded-lg text-xs text-white placeholder-slate-500"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Networks: <strong className="text-white">{networks.length}</strong>
            </span>
          </div>

          <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#0B1120] text-[10px] uppercase font-bold text-slate-400">
                  <th className="py-3 px-4">Network Name</th>
                  <th className="py-3 px-3">Network ID</th>
                  <th className="py-3 px-3">Driver</th>
                  <th className="py-3 px-3">IPAM Subnet</th>
                  <th className="py-3 px-3">Gateway</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {networks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No Docker networks discovered.
                    </td>
                  </tr>
                ) : (
                  networks
                    .filter((n) => !networkSearch || n.name.toLowerCase().includes(networkSearch.toLowerCase()))
                    .map((net) => (
                      <tr key={net.id || net.name} className="hover:bg-[#18233C]/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-300">{net.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{net.id}</td>
                        <td className="py-3 px-3 font-mono text-cyan-400 font-semibold">{net.driver}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{net.subnet || '172.28.0.0/16'}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{net.gateway || '172.28.0.1'}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
                              {net.scope}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectResource('network', net.name)}
                              className="px-2.5 py-1 rounded bg-[#070B14] hover:bg-[#18233C] text-slate-300 text-xs font-semibold border border-[#1E293B] cursor-pointer transition inline-flex items-center gap-1"
                              title="Inspect Network JSON"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" />
                              <span>Inspect</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: APPLICATION LOGS CONSOLE (Frontend, Backend, Database, Combined) */}
      {activeTab === 'console' && (
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <span>Application Log Console</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time streaming console connected to live containers on <strong className="text-white">{host.name}</strong>.
              </p>
            </div>
          </div>

          {/* 1. Application / Stack Selection Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#070B14] p-3 rounded-xl border border-[#1E293B]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Application Stack Filter:
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Select which application stack to view
                </span>
              </div>
            </div>

            {/* Stack Selection Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableStacks.map((st) => {
                const isSelected = selectedStack === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStack(st.id);
                      setSelectedContainerTarget(''); // reset explicit target to auto-scope
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400/50 shadow-sm shadow-blue-600/30'
                        : 'bg-[#0B1120] text-slate-400 hover:text-white hover:bg-[#18233C] border-[#1E293B]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-slate-500'
                      }`}
                    />
                    <span>{st.name.split('(')[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Target Container & Console Controls Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#090E1A] p-3 rounded-xl border border-[#1E293B]">
            {/* Target Container Dropdown Selector */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span>Target Container:</span>
              </span>

              {/* Interactive Container Dropdown */}
              <div className="relative">
                <select
                  value={effectiveTargetContainer}
                  onChange={(e) => setSelectedContainerTarget(e.target.value)}
                  className="bg-[#070B14] border border-[#1E293B] hover:border-cyan-500/50 text-cyan-300 font-mono text-xs rounded-xl px-3 py-1.5 font-bold focus:border-cyan-500 focus:outline-none cursor-pointer transition shadow-inner"
                >
                  {selectedStack !== 'all' && currentStackContainers.length > 1 && (
                    <option value={currentStackContainers.map(c => c.name).join(',')}>
                      ⚡ All {selectedStack.toUpperCase()} Stack Containers Combined
                    </option>
                  )}
                  {selectedStack === 'all' && containers.length > 1 && (
                    <option value="all">
                      ⚡ All Fleet Containers Combined
                    </option>
                  )}
                  {currentStackContainers.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name} ({c.state} • {c.ports ? c.ports.split(',')[0] : 'internal'})
                    </option>
                  ))}
                  {currentStackContainers.length < containers.length && (
                    <optgroup label="── All Running Host Containers ──">
                      {containers.map((c) => (
                        <option key={`all-${c.id || c.name}`} value={c.name}>
                          {c.name} ({c.state} • {c.ports ? c.ports.split(',')[0] : 'internal'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Live Container Telemetry Tag */}
              {(() => {
                const activeC = containers.find((c) => c.name === effectiveTargetContainer);
                if (!activeC) return null;
                return (
                  <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#070B14] border border-[#1E293B] text-[11px]">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        activeC.state === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-slate-200 font-mono font-bold">{activeC.name}</span>
                    <span className="text-slate-500 border-l border-[#1E293B] pl-2 font-mono">
                      {activeC.image}
                    </span>
                    {activeC.ports && (
                      <span className="text-cyan-400 border-l border-[#1E293B] pl-2 font-mono font-semibold">
                        {activeC.ports.split(',')[0]}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Tail size selector */}
              <select
                value={consoleTail}
                onChange={(e) => setConsoleTail(Number(e.target.value))}
                className="bg-[#070B14] border border-[#1E293B] text-slate-300 text-xs rounded-lg px-2.5 py-1"
              >
                <option value={100}>Tail: 100 lines</option>
                <option value={200}>Tail: 200 lines</option>
                <option value={500}>Tail: 500 lines</option>
                <option value={1000}>Tail: 1000 lines</option>
              </select>

              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:text-white'
                }`}
              >
                {isPaused ? 'Resume Stream' : 'Pause Stream'}
              </button>

              <button
                type="button"
                onClick={() => setConsoleLogs('')}
                className="px-3 py-1 rounded-lg bg-[#070B14] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={fetchConsoleLogs}
                disabled={consoleLoading}
                className="p-1.5 rounded-lg bg-[#070B14] hover:bg-[#18233C] text-slate-300 border border-[#1E293B] cursor-pointer"
                title="Fetch Latest"
              >
                <RotateCw className={`w-3.5 h-3.5 ${consoleLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Terminal Display */}
          <div
            ref={terminalRef}
            className="bg-[#03060C] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed min-h-[360px] max-h-[500px] overflow-y-auto whitespace-pre-wrap select-text shadow-inner"
          >
            {consoleLoading && !consoleLogs ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                <span>Connecting to container stdout/stderr stream...</span>
              </div>
            ) : consoleLogs ? (
              consoleLogs
            ) : (
              <div className="py-20 text-center text-slate-500">
                No logs recorded yet for container target "{effectiveTargetContainer}".
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: 1-CLICK DEPLOYMENT TAB */}
      {activeTab === 'deployment' && (
        <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-5 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-purple-400" />
                  <span>Single-Click Application Deployment Studio</span>
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5 ${
                  (deploymentConfig.stackType === 'python') ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                  (deploymentConfig.stackType === 'java') ? 'text-orange-400 bg-orange-500/10 border-orange-500/30' :
                  (deploymentConfig.stackType === 'maven') ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                  (deploymentConfig.stackType === 'dotnet') ? 'text-purple-400 bg-purple-500/10 border-purple-500/30' :
                  'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
                }`}>
                  {renderStackIcon(deploymentConfig.stackType || 'mern')}
                  <span>{(deploymentConfig.stackType || 'mern').toUpperCase()} STACK PRESET</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated multi-container deployment pipeline for {(deploymentConfig.stackType || 'mern').toUpperCase()} stack with database volume preservation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Configuration</span>
              </button>

              <button
                type="button"
                onClick={handleRun1ClickDeploy}
                disabled={isDeploying}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <Rocket className={`w-4 h-4 ${isDeploying ? 'animate-bounce' : ''}`} />
                <span>{isDeploying ? 'Deploying...' : 'Run 1-Click Deploy'}</span>
              </button>
            </div>
          </div>

          {/* Quick Application Stack Switcher Matrix */}
          <div className="p-3.5 rounded-xl bg-[#070B14] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Select Stack to Deploy / Inspect:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {STACK_PRESETS.map((stack) => {
                const isSelected = (deploymentConfig.stackType || 'mern').toLowerCase() === stack.id;
                const isRunning = containers.some(
                  (c) => c.name.toLowerCase().startsWith(stack.id) && c.status.toLowerCase().includes('up')
                );
                return (
                  <button
                    key={stack.id}
                    type="button"
                    onClick={() => handleSelectStack(stack)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200 shadow-sm'
                        : 'bg-[#0B1120] border-[#1E293B] text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {renderStackIcon(stack.id)}
                    <span>{stack.name}</span>
                    {isRunning ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Containers running on this host" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5-Step Visual Pipeline Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[
              { name: '1. Git Sync', status: deploymentSteps[0]?.status || 'PENDING', desc: 'Pull latest code' },
              { name: '2. Dependencies', status: deploymentSteps[1]?.status || 'PENDING', desc: 'npm/pnpm install' },
              { name: '3. Docker Build', status: deploymentSteps[2]?.status || 'PENDING', desc: 'Build images' },
              { name: '4. Recreate', status: deploymentSteps[3]?.status || 'PENDING', desc: 'Preserve DB data' },
              { name: '5. Health Check', status: deploymentSteps[4]?.status || 'PENDING', desc: 'Verify endpoints' },
            ].map((step, idx) => {
              const isSucc = step.status === 'SUCCESS';
              const isRun = step.status === 'RUNNING';
              const isFail = step.status === 'FAILED';

              return (
                <div
                  key={step.name}
                  className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                    isSucc
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : isRun
                      ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 animate-pulse'
                      : isFail
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      : 'bg-[#070B14] border-[#1E293B] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-[11px]">{step.name}</span>
                    {isSucc ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isRun ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    ) : isFail ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">{step.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Active Configuration Overview Strip */}
          <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 text-xs space-y-3">
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Rocket className="w-3.5 h-3.5 text-purple-400" />
                <span>Active Deployment Parameters (Harmonized 1:1)</span>
              </span>
              <div className="flex items-center gap-2">
                {(() => {
                  const stackId = (deploymentConfig.stackType || 'mern').toLowerCase();
                  const runningCount = containers.filter(
                    (c) => c.name.toLowerCase().startsWith(stackId) && c.status.toLowerCase().includes('up')
                  ).length;
                  if (runningCount > 0) {
                    return (
                      <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {runningCount} Containers Active on Host
                      </span>
                    );
                  }
                  return (
                    <span className="text-amber-400 font-mono text-[10px] bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                      Ready for 1-Click Deploy
                    </span>
                  );
                })()}
                <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  DB Volume Protected
                </span>
              </div>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-400 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Repository & App:</span>
                <span className="text-slate-200 truncate block font-bold text-white" title={deploymentConfig.gitRepoUrl}>
                  {deploymentConfig.gitRepoUrl || 'Not specified'}
                </span>
                <span className="text-[10px] text-purple-400 font-mono mt-0.5 block">
                  App: {deploymentConfig.appName || `${deploymentConfig.stackType || 'mern'}-app`}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Branch & Host Directory:</span>
                <span className="text-cyan-300 block font-semibold">
                  {deploymentConfig.gitBranch || 'main'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate" title={deploymentConfig.appDirectory}>
                  {deploymentConfig.appDirectory}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Frontend & Backend:</span>
                <span className="text-purple-300 block">
                  {deploymentConfig.frontendContainerName} (:{deploymentConfig.frontendPort || 3001})
                </span>
                <span className="text-blue-300 text-[10px] block">
                  {deploymentConfig.backendContainerName} (:{deploymentConfig.backendPort || 5001})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Database Tier & Tool:</span>
                <span className="text-emerald-400 block">
                  {deploymentConfig.databaseContainerName} (:{deploymentConfig.databasePort || 5431})
                </span>
                <span className="text-[10px] text-amber-300 font-mono mt-0.5 block">
                  Build: {deploymentConfig.packageManager || 'npm'} ({deploymentConfig.buildCommand || 'standard'})
                </span>
              </div>
            </div>
          </div>

          {/* Deployment Execution Terminal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-white">Live Deployment Console</span>
              {isDeploying && <span className="text-cyan-400 animate-pulse">Running deployment steps...</span>}
            </div>
            <div className="bg-[#03060C] border border-[#1E293B] rounded-xl p-4 font-mono text-xs text-slate-300 leading-relaxed min-h-[220px] max-h-[350px] overflow-y-auto whitespace-pre-wrap select-text">
              {deploymentLogs || 'Ready to run 1-Click Deployment.'}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* EDIT CONFIGURATION MODAL (MODEL 1: INTERACTIVE STACK SELECTOR MATRIX)*/}
      {/* ------------------------------------------------------------------- */}
      {configModalOpen && (() => {
        const currentStackId = (deploymentConfig.stackType || 'mern').toLowerCase();
        const activePreset = STACK_PRESETS.find((s) => s.id === currentStackId) || STACK_PRESETS[0];

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl w-full max-w-4xl p-6 sm:p-7 space-y-5 shadow-2xl animate-in zoom-in-95 my-8 max-h-[92vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[#1E293B] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Configure Docker Application Deployment</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select your application tech stack preset (MERN, Python, Java, Maven, .NET) to auto-populate container names, ports, and build settings.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[#070B14] hover:bg-[#18233C] text-slate-400 hover:text-white flex items-center justify-center border border-[#1E293B] transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* MODEL 1: STACK SELECTOR MATRIX */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Application Tech Stack</span>
                  </label>
                  <span className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>1-Click Auto Configuration</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {STACK_PRESETS.map((stack) => {
                    const isSelected = currentStackId === stack.id;
                    return (
                      <button
                        key={stack.id}
                        type="button"
                        onClick={() => handleSelectStack(stack)}
                        className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? stack.activeGlow
                            : 'bg-[#070B14] hover:bg-[#142038] border-[#1E293B] hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        {/* Active Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-[#0B1120] border border-[#1E293B] flex items-center justify-center shrink-0 shadow-inner">
                            {renderStackIcon(stack.id)}
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {stack.name}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block line-clamp-1">{stack.tagline}</span>
                          <div className="mt-2 pt-2 border-t border-[#1E293B]/60 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-slate-500">Port</span>
                            <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                              {stack.backendPort}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Stack Feedback Banner */}
              <div className="p-3 rounded-xl bg-[#070B14] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${activePreset.badgeColor}`}>
                    {activePreset.name} Active
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    Auto-configured with <strong className="text-white">{activePreset.packageManager}</strong>, Port <strong className="text-cyan-300">{activePreset.backendPort}</strong>, and database <strong className="text-slate-200">{activePreset.databaseContainer}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectStack(activePreset)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 underline font-medium self-end sm:self-auto cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              {/* Form Fields arranged in 2 Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Left Column: Repository & Environment */}
                <div className="space-y-3.5 bg-[#070B14]/60 p-4 rounded-xl border border-[#1E293B]">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-[#1E293B] flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-blue-400" />
                    <span>Source Repository & Environment</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Application Name</label>
                    <input
                      type="text"
                      value={deploymentConfig.appName || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, appName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="my-app"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-400 font-semibold">Git Repository URL</label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-500">Preset:</span>
                        <select
                          value={deploymentConfig.gitRepoUrl || ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setDeploymentConfig({ ...deploymentConfig, gitRepoUrl: e.target.value });
                            }
                          }}
                          className="bg-[#0B1120] border border-[#1E293B] text-[10px] text-blue-400 font-mono rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Stack Repos --</option>
                          {STACK_PRESETS.map((s) => (
                            <option key={s.id} value={s.gitRepoUrl}>
                              {s.name}: {s.gitRepoUrl.split('/').pop()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={deploymentConfig.gitRepoUrl || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, gitRepoUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="https://github.com/organization/repo.git"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Git Branch</label>
                      <input
                        type="text"
                        value={deploymentConfig.gitBranch || ''}
                        onChange={(e) => setDeploymentConfig({ ...deploymentConfig, gitBranch: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                        placeholder="main"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Package Manager / Tool</label>
                      <select
                        value={deploymentConfig.packageManager || 'npm'}
                        onChange={(e) => setDeploymentConfig({ ...deploymentConfig, packageManager: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white focus:border-blue-500 focus:outline-none font-mono"
                      >
                        <option value="npm">npm (Node.js)</option>
                        <option value="pnpm">pnpm (Fast Node)</option>
                        <option value="yarn">yarn (Classic)</option>
                        <option value="pip">pip (Python)</option>
                        <option value="poetry">poetry (Python)</option>
                        <option value="mvn">mvn (Apache Maven)</option>
                        <option value="gradle">gradle (Java)</option>
                        <option value="dotnet">dotnet (.NET CLI)</option>
                        <option value="custom">custom / script</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Application Directory on Host</label>
                    <input
                      type="text"
                      value={deploymentConfig.appDirectory || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, appDirectory: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder={`/home/${host.username || 'azureuser'}/apps/${currentStackId}`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Build Command</label>
                    <input
                      type="text"
                      value={deploymentConfig.buildCommand || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, buildCommand: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-emerald-400 font-mono text-[11px] focus:border-blue-500 focus:outline-none"
                      placeholder="npm run build / mvn clean package"
                    />
                  </div>
                </div>

                {/* Right Column: Harmonized Container Names & Ports */}
                <div className="space-y-3.5 bg-[#070B14]/60 p-4 rounded-xl border border-[#1E293B]">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-[#1E293B] flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Harmonized Container Topology (1:1)</span>
                  </h4>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Frontend Container Name (1:1)</label>
                    <input
                      type="text"
                      value={deploymentConfig.frontendContainerName || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, frontendContainerName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="app-frontend"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Backend Container Name (1:1)</label>
                    <input
                      type="text"
                      value={deploymentConfig.backendContainerName || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, backendContainerName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="app-backend"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Database Container Name (1:1)</label>
                    <input
                      type="text"
                      value={deploymentConfig.databaseContainerName || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, databaseContainerName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-white font-mono focus:border-blue-500 focus:outline-none"
                      placeholder="app-mongodb / app-postgres"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Frontend Port</label>
                      <input
                        type="number"
                        value={deploymentConfig.frontendPort || 3000}
                        onChange={(e) => setDeploymentConfig({ ...deploymentConfig, frontendPort: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-cyan-300 font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-semibold">Backend Port</label>
                      <input
                        type="number"
                        value={deploymentConfig.backendPort || 5000}
                        onChange={(e) => setDeploymentConfig({ ...deploymentConfig, backendPort: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-cyan-300 font-mono focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Health Check URL</label>
                    <input
                      type="text"
                      value={deploymentConfig.healthCheckUrl || ''}
                      onChange={(e) => setDeploymentConfig({ ...deploymentConfig, healthCheckUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1120] border border-[#1E293B] rounded-lg text-slate-300 font-mono text-[11px] focus:border-blue-500 focus:outline-none"
                      placeholder="http://localhost:3000/api/health"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#1E293B]">
                <span className="text-[11px] text-slate-500">
                  Persistent database volumes are automatically preserved during deployment recreate.
                </span>

                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#070B14] hover:bg-[#18233C] text-slate-400 hover:text-white text-xs font-semibold border border-[#1E293B] transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    {isSavingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndDeploy}
                    disabled={isSavingConfig || isDeploying}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span>Save & 1-Click Deploy</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* UNIFIED DOCKER INSPECT MODAL (Containers, Images, Volumes, Networks)     */}
      {/* ========================================================================= */}
      {inspectModal.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1E293B] bg-[#070B14]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    inspectModal.type === 'container'
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                      : inspectModal.type === 'image'
                      ? 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      : inspectModal.type === 'volume'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full border ${
                        inspectModal.type === 'container'
                          ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                          : inspectModal.type === 'image'
                          ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                          : inspectModal.type === 'volume'
                          ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                          : 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                      }`}
                    >
                      {inspectModal.type} inspect
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono truncate max-w-[320px] sm:max-w-md">
                      {inspectModal.target}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Target host: <strong className="text-white">{host.name}</strong> ({host.host})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectModal.content);
                    setCopiedInspect(true);
                    setTimeout(() => setCopiedInspect(false), 2000);
                  }}
                  disabled={inspectModal.loading || !inspectModal.content}
                  className="px-3 py-1.5 rounded-xl bg-[#111A2E] hover:bg-[#18233C] text-slate-300 hover:text-white border border-[#1E293B] text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Copy JSON Output"
                >
                  {copiedInspect ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectModal((prev) => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-xl bg-[#111A2E] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#1E293B] hover:border-rose-500/30 transition cursor-pointer"
                  title="Close Inspector"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-auto bg-[#03060C] select-text">
              {inspectModal.loading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">
                    Executing docker {inspectModal.type} inspect {inspectModal.target}...
                  </span>
                </div>
              ) : (
                <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre overflow-x-auto p-2">
                  {inspectModal.content || '// No inspection telemetry returned.'}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-3 border-t border-[#1E293B] bg-[#070B14] text-xs">
              <span className="text-[11px] text-slate-500 font-mono">
                docker {inspectModal.type === 'volume' || inspectModal.type === 'network' ? `${inspectModal.type} ` : ''}inspect {inspectModal.target}
              </span>

              <button
                type="button"
                onClick={() => setInspectModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

