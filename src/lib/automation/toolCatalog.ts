export type ToolCategory =
  | 'programming'
  | 'devops'
  | 'security'
  | 'webservers'
  | 'databases'
  | 'monitoring'
  | 'utilities';

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  badge?: string;
  functionName: string;
  defaultVersion?: string;
  supportedVersions?: string[];
  port?: number;
  dependencies?: string[];
  verificationCommand: string;
  iconName?: string;
  isCustom?: boolean;
  isCustomized?: boolean;
  installScript?: string;
  _id?: string;
}

export const TOOL_CATEGORIES: { id: ToolCategory; title: string; description: string; icon: string }[] = [
  {
    id: 'programming',
    title: 'Programming Languages',
    description: 'Runtimes, compilers, and development SDKs',
    icon: 'Code2',
  },
  {
    id: 'devops',
    title: 'DevOps & CI/CD Tools',
    description: 'Container engines, orchestrators, automation, and CI/CD pipelines',
    icon: 'Workflow',
  },
  {
    id: 'security',
    title: 'Security & Quality Tools',
    description: 'Vulnerability scanners, code quality gates, and container security',
    icon: 'ShieldCheck',
  },
  {
    id: 'webservers',
    title: 'Web Servers & Reverse Proxies',
    description: 'High-performance HTTP engines, load balancers, and reverse proxies',
    icon: 'Globe',
  },
  {
    id: 'databases',
    title: 'Databases & Storage',
    description: 'Relational, NoSQL, and document database engines',
    icon: 'Database',
  },
  {
    id: 'monitoring',
    title: 'Monitoring & Observability',
    description: 'Metrics scrapers, telemetry aggregators, and dashboard visualization',
    icon: 'Activity',
  },
  {
    id: 'utilities',
    title: 'Linux Utilities & Tools',
    description: 'Essential command-line utilities, network tools, and archive handlers',
    icon: 'Terminal',
  },
];

export const TOOL_CATALOG: ToolDefinition[] = [
  // --- Programming Languages ---
  {
    id: 'java',
    name: 'Java Development Kit (JDK)',
    category: 'programming',
    description: 'OpenJDK enterprise runtime and development platform.',
    badge: 'Enterprise Standard',
    functionName: 'install_java',
    defaultVersion: '17',
    supportedVersions: ['8', '11', '17', '21'],
    verificationCommand: 'java -version',
    iconName: 'Coffee',
  },
  {
    id: 'python',
    name: 'Python 3',
    category: 'programming',
    description: 'High-level programming language with pip, setuptools, and venv.',
    functionName: 'install_python',
    defaultVersion: 'latest',
    supportedVersions: ['latest', '3.12', '3.11', '3.10'],
    verificationCommand: 'python3 --version',
    iconName: 'FileCode',
  },
  {
    id: 'nodejs',
    name: 'Node.js & NPM',
    category: 'programming',
    description: 'V8 JavaScript runtime engine with Node Package Manager.',
    badge: 'LTS Ready',
    functionName: 'install_nodejs',
    defaultVersion: '20',
    supportedVersions: ['22', '20', '18'],
    verificationCommand: 'node -v && npm -v',
    iconName: 'Server',
  },
  {
    id: 'php',
    name: 'PHP & Common Extensions',
    category: 'programming',
    description: 'Popular web development scripting language with curl, mbstring, and zip.',
    functionName: 'install_php',
    defaultVersion: '8.2',
    supportedVersions: ['8.3', '8.2', '8.1'],
    verificationCommand: 'php -v',
    iconName: 'Code',
  },

  // --- DevOps Tools ---
  {
    id: 'docker',
    name: 'Docker Engine & Compose',
    category: 'devops',
    description: 'Container engine with Docker CLI, containerd, and Compose plugin.',
    badge: 'Production Engine',
    functionName: 'install_docker',
    verificationCommand: 'docker --version && docker compose version',
    iconName: 'Container',
  },
  {
    id: 'jenkins',
    name: 'Jenkins CI/CD Automation',
    category: 'devops',
    description: 'Automated CI/CD build server with systemd management.',
    badge: 'CI/CD LTS',
    functionName: 'install_jenkins',
    port: 8080,
    dependencies: ['java'],
    verificationCommand: 'jenkins --version || systemctl status jenkins --no-pager',
    iconName: 'GitMerge',
  },
  {
    id: 'maven',
    name: 'Apache Maven',
    category: 'devops',
    description: 'Java build automation and project lifecycle management framework.',
    functionName: 'install_maven',
    dependencies: ['java'],
    verificationCommand: 'mvn -version',
    iconName: 'Boxes',
  },
  {
    id: 'ansible',
    name: 'Ansible Automation Engine',
    category: 'devops',
    description: 'Agentless IT automation, configuration management, and provisioning.',
    functionName: 'install_ansible',
    verificationCommand: 'ansible --version',
    iconName: 'Cpu',
  },
  {
    id: 'terraform',
    name: 'HashiCorp Terraform',
    category: 'devops',
    description: 'Infrastructure as Code (IaC) tool for cloud resources provisioning.',
    badge: 'Cloud IaC',
    functionName: 'install_terraform',
    verificationCommand: 'terraform -version',
    iconName: 'Layers',
  },
  {
    id: 'kubectl',
    name: 'Kubernetes CLI (kubectl)',
    category: 'devops',
    description: 'Command line tool for controlling and communicating with Kubernetes clusters.',
    functionName: 'install_kubectl',
    verificationCommand: 'kubectl version --client',
    iconName: 'Cloud',
  },
  {
    id: 'helm',
    name: 'Helm Package Manager',
    category: 'devops',
    description: 'The package manager for Kubernetes to define, install, and upgrade complex apps.',
    functionName: 'install_helm',
    verificationCommand: 'helm version --short',
    iconName: 'Compass',
  },

  // --- Security Tools ---
  {
    id: 'sonarqube',
    name: 'SonarQube Scanner / CLI',
    category: 'security',
    description: 'Code quality scanner for detecting bugs, security vulnerabilities, and code smells.',
    functionName: 'install_sonarqube',
    port: 9000,
    verificationCommand: 'sonar-scanner -v || command -v sonar-scanner',
    iconName: 'ShieldAlert',
  },
  {
    id: 'trivy',
    name: 'Aqua Trivy Security Scanner',
    category: 'security',
    description: 'Comprehensive CVE scanner for container images, filesystems, and Git repos.',
    badge: 'Aqua Security',
    functionName: 'install_trivy',
    verificationCommand: 'trivy --version',
    iconName: 'Shield',
  },

  // --- Web Servers ---
  {
    id: 'nginx',
    name: 'Nginx Web Server',
    category: 'webservers',
    description: 'High-performance HTTP server, reverse proxy, and mail proxy.',
    badge: 'High Performance',
    functionName: 'install_nginx',
    port: 80,
    verificationCommand: 'nginx -v',
    iconName: 'Globe',
  },
  {
    id: 'apache',
    name: 'Apache HTTP Server',
    category: 'webservers',
    description: 'Robust, commercial-grade, open-source HTTP server.',
    functionName: 'install_apache',
    port: 80,
    verificationCommand: 'apache2 -v || httpd -v',
    iconName: 'Server',
  },

  // --- Databases ---
  {
    id: 'mongodb',
    name: 'MongoDB Community Server',
    category: 'databases',
    description: 'Document-oriented NoSQL database system.',
    functionName: 'install_mongodb',
    port: 27017,
    verificationCommand: 'mongod --version',
    iconName: 'Database',
  },
  {
    id: 'mysql',
    name: 'MySQL Server 8.0',
    category: 'databases',
    description: 'World’s most popular open-source relational database management system.',
    functionName: 'install_mysql',
    port: 3306,
    verificationCommand: 'mysql --version',
    iconName: 'Database',
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL Database',
    category: 'databases',
    description: 'Powerful, open-source object-relational database system with high reliability.',
    functionName: 'install_postgresql',
    port: 5432,
    verificationCommand: 'psql --version',
    iconName: 'Database',
  },

  // --- Monitoring Tools ---
  {
    id: 'prometheus',
    name: 'Prometheus Monitoring',
    category: 'monitoring',
    description: 'Time-series metrics monitoring and alerting toolkit.',
    badge: 'Time-Series',
    functionName: 'install_prometheus',
    port: 9090,
    verificationCommand: 'prometheus --version || /usr/local/bin/prometheus --version',
    iconName: 'Activity',
  },
  {
    id: 'grafana',
    name: 'Grafana Dashboard',
    category: 'monitoring',
    description: 'Analytics and interactive visualization web application.',
    badge: 'Visualization',
    functionName: 'install_grafana',
    port: 3000,
    verificationCommand: 'grafana-server -v || systemctl status grafana-server --no-pager',
    iconName: 'LineChart',
  },

  // --- Linux Utilities ---
  {
    id: 'git',
    name: 'Git Version Control',
    category: 'utilities',
    description: 'Fast and scalable distributed version control system.',
    functionName: 'install_git',
    verificationCommand: 'git --version',
    iconName: 'GitBranch',
  },
  {
    id: 'curl',
    name: 'cURL Network Utility',
    category: 'utilities',
    description: 'Command line tool for transferring data with URLs.',
    functionName: 'install_curl',
    verificationCommand: 'curl --version',
    iconName: 'Download',
  },
  {
    id: 'wget',
    name: 'Wget Download Tool',
    category: 'utilities',
    description: 'Non-interactive network downloader for HTTP, HTTPS, and FTP.',
    functionName: 'install_wget',
    verificationCommand: 'wget --version',
    iconName: 'DownloadCloud',
  },
  {
    id: 'zip',
    name: 'ZIP Archiver',
    category: 'utilities',
    description: 'Package and compress files into standard zip archives.',
    functionName: 'install_zip',
    verificationCommand: 'zip -v',
    iconName: 'FileArchive',
  },
  {
    id: 'unzip',
    name: 'Unzip Extractor',
    category: 'utilities',
    description: 'Decompress and extract zip archives.',
    functionName: 'install_unzip',
    verificationCommand: 'unzip -v',
    iconName: 'FolderArchive',
  },
  {
    id: 'net-tools',
    name: 'Net-Tools (ifconfig, netstat)',
    category: 'utilities',
    description: 'Networking diagnostic and interface configuration utilities.',
    functionName: 'install_net_tools',
    verificationCommand: 'ifconfig --version || netstat --version',
    iconName: 'Network',
  },
];
