#!/usr/bin/env bash
# ==============================================================================
# Multi-Cloud DevOps Automation Engine - Centralized Installation Library
# File: devops-installations.sh
# Supported Distributions: Ubuntu, Debian, Amazon Linux 2/2023, RHEL, CentOS, Rocky, Alma
# ==============================================================================

set -o pipefail

# ANSI Color formatting
C_RESET='\033[0m'
C_BOLD='\033[1m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_BLUE='\033[0;34m'
C_CYAN='\033[0;36m'
C_WHITE='\033[1;37m'

log_info() {
  echo -e "${C_CYAN}[INFO $(date +'%H:%M:%S')]${C_RESET} $1"
}

log_success() {
  echo -e "${C_GREEN}[SUCCESS $(date +'%H:%M:%S')] ✓${C_RESET} $1"
}

log_warning() {
  echo -e "${C_YELLOW}[WARNING $(date +'%H:%M:%S')] ⚠${C_RESET} $1"
}

log_error() {
  echo -e "${C_RED}[ERROR $(date +'%H:%M:%S')] ✗${C_RESET} $1" >&2
}

log_step() {
  echo -e "\n${C_BOLD}${C_WHITE}======================================================================${C_RESET}"
  echo -e "${C_BOLD}${C_CYAN}  $1${C_RESET}"
  echo -e "${C_BOLD}${C_WHITE}======================================================================${C_RESET}"
}

# Sudo wrapper
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo &>/dev/null; then
    SUDO="sudo"
  else
    log_error "Non-root user and sudo is not installed or available."
    exit 1
  fi
fi

# Detect Linux Distribution and Package Manager
OS_ID=""
OS_VERSION_ID=""
OS_LIKE=""
PKG_MGR=""

detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="${ID:-unknown}"
    OS_VERSION_ID="${VERSION_ID:-}"
    OS_LIKE="${ID_LIKE:-}"
  elif [ -f /etc/redhat-release ]; then
    OS_ID="rhel"
  elif [ -f /etc/debian_version ]; then
    OS_ID="debian"
  else
    OS_ID="$(uname -s)"
  fi

  OS_ID="$(echo "$OS_ID" | tr '[:upper:]' '[:lower:]')"
  OS_LIKE="$(echo "$OS_LIKE" | tr '[:upper:]' '[:lower:]')"

  if [[ "$OS_ID" =~ (ubuntu|debian) ]] || [[ "$OS_LIKE" =~ (ubuntu|debian) ]]; then
    PKG_MGR="apt"
  elif [[ "$OS_ID" =~ (amzn|amazon) ]]; then
    PKG_MGR="yum"
  elif [[ "$OS_ID" =~ (rhel|centos|rocky|almalinux|fedora) ]] || [[ "$OS_LIKE" =~ (rhel|fedora) ]]; then
    if command -v dnf &>/dev/null; then
      PKG_MGR="dnf"
    else
      PKG_MGR="yum"
    fi
  else
    PKG_MGR="apt"
  fi

  log_info "Detected OS: ${C_WHITE}${OS_ID} ${OS_VERSION_ID}${C_RESET} (Family: ${PKG_MGR})"
}

pkg_update() {
  if [ "$PKG_MGR" = "apt" ]; then
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get update -y
  elif [ "$PKG_MGR" = "dnf" ]; then
    $SUDO dnf check-update -y || true
  elif [ "$PKG_MGR" = "yum" ]; then
    $SUDO yum check-update -y || true
  fi
}

pkg_install() {
  local packages=("$@")
  if [ "$PKG_MGR" = "apt" ]; then
    $SUDO env DEBIAN_FRONTEND=noninteractive apt-get install -y "${packages[@]}"
  elif [ "$PKG_MGR" = "dnf" ]; then
    $SUDO dnf install -y "${packages[@]}"
  elif [ "$PKG_MGR" = "yum" ]; then
    $SUDO yum install -y "${packages[@]}"
  fi
}

# ==============================================================================
# 1. PROGRAMMING LANGUAGES
# ==============================================================================

# install_java [version: 8|11|17|21]
install_java() {
  local ver="${1:-17}"
  log_step "Installing Java OpenJDK (Version: ${ver})"

  # Idempotency check
  if command -v java &>/dev/null; then
    local cur_ver
    cur_ver="$(java -version 2>&1 | head -n 1)"
    log_info "Found existing Java: ${cur_ver}"
    if echo "$cur_ver" | grep -qE "(${ver}\.|openjdk ${ver})"; then
      log_success "Java OpenJDK ${ver} is already installed. Skipping."
      return 0
    fi
  fi

  pkg_update

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install "openjdk-${ver}-jdk" "ca-certificates-java"
  elif [ "$PKG_MGR" = "dnf" ] || [ "$PKG_MGR" = "yum" ]; then
    if [ "$ver" = "8" ]; then
      pkg_install "java-1.8.0-openjdk-devel"
    else
      pkg_install "java-${ver}-openjdk-devel"
    fi
  fi

  if command -v java &>/dev/null; then
    log_success "Java successfully installed: $(java -version 2>&1 | head -n 1)"
  else
    log_error "Java installation completed but binary was not found in PATH."
    return 1
  fi
}

# install_python [version]
install_python() {
  local ver="${1:-latest}"
  log_step "Installing Python 3 & Pip (Version: ${ver})"

  if command -v python3 &>/dev/null; then
    log_info "Found existing Python: $(python3 --version)"
    if [ "$ver" = "latest" ] || python3 --version | grep -q "$ver"; then
      log_success "Python 3 is already installed and matches target. Skipping."
      return 0
    fi
  fi

  pkg_update

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install python3 python3-pip python3-venv python3-dev build-essential
  else
    pkg_install python3 python3-pip python3-devel
  fi

  if command -v python3 &>/dev/null; then
    log_success "Python 3 installed: $(python3 --version)"
    if command -v pip3 &>/dev/null; then
      log_info "Pip 3 available: $(pip3 --version)"
    fi
  else
    log_error "Python 3 installation failed."
    return 1
  fi
}

# install_nodejs [version: 18|20|22]
install_nodejs() {
  local ver="${1:-20}"
  log_step "Installing Node.js & NPM (NodeSource LTS ${ver}.x)"

  if command -v node &>/dev/null; then
    local cur_node
    cur_node="$(node -v)"
    log_info "Found existing Node.js: ${cur_node}"
    if echo "$cur_node" | grep -q "^v${ver}\."; then
      log_success "Node.js ${ver}.x is already installed. Skipping."
      return 0
    fi
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install curl ca-certificates gnupg
    curl -fsSL "https://deb.nodesource.com/setup_${ver}.x" | $SUDO -E bash -
    pkg_install nodejs
  else
    pkg_install curl
    curl -fsSL "https://rpm.nodesource.com/setup_${ver}.x" | $SUDO bash -
    pkg_install nodejs
  fi

  if command -v node &>/dev/null; then
    log_success "Node.js successfully installed: $(node -v) (NPM: $(npm -v))"
  else
    log_error "Node.js installation failed."
    return 1
  fi
}

# install_php [version]
install_php() {
  local ver="${1:-8.2}"
  log_step "Installing PHP & Common Modules (Target: ${ver})"

  if command -v php &>/dev/null; then
    log_info "Found existing PHP: $(php -v | head -n 1)"
    log_success "PHP is already installed. Skipping."
    return 0
  fi

  pkg_update

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install php php-cli php-common php-curl php-mbstring php-xml php-zip php-json php-mysql
  else
    pkg_install php php-cli php-common php-curl php-mbstring php-xml php-zip php-json php-mysqlnd
  fi

  if command -v php &>/dev/null; then
    log_success "PHP installed: $(php -v | head -n 1)"
  else
    log_error "PHP installation failed."
    return 1
  fi
}

# ==============================================================================
# 2. DEVOPS & CI/CD TOOLS
# ==============================================================================

# install_docker
install_docker() {
  log_step "Installing Docker Engine & Docker Compose Plugin"

  if command -v docker &>/dev/null; then
    log_info "Found existing Docker: $(docker --version)"
    log_success "Docker is already installed."
    $SUDO systemctl enable --now docker || true
    return 0
  fi

  pkg_update

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install ca-certificates curl gnupg lsb-release
    $SUDO install -m 0755 -d /etc/apt/keyrings
    curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
    $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | $SUDO tee /etc/apt/sources.list.d/docker.list > /dev/null
    $SUDO apt-get update -y
    pkg_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    if [[ "$OS_ID" =~ (amzn|amazon) ]]; then
      pkg_install docker
    else
      pkg_install yum-utils
      $SUDO yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
      pkg_install docker-ce docker-ce-cli containerd.io docker-compose-plugin
    fi
  fi

  $SUDO systemctl enable --now docker
  # Add current user to docker group if non-root
  if [ "$(id -u)" -ne 0 ]; then
    $SUDO usermod -aG docker "$USER" || true
  fi

  if command -v docker &>/dev/null; then
    log_success "Docker Engine installed: $(docker --version)"
  else
    log_error "Docker installation failed."
    return 1
  fi
}

# install_jenkins
install_jenkins() {
  log_step "Installing Jenkins CI/CD Automation Server (Port 8080)"

  if systemctl is-active --quiet jenkins; then
    log_success "Jenkins service is already running. Skipping."
    return 0
  fi

  # Ensure Java 17/11 is installed as dependency
  if ! command -v java &>/dev/null; then
    log_info "Jenkins requires Java. Installing Java 17 prerequisite..."
    install_java "17"
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | $SUDO tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
    echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/ | $SUDO tee /etc/apt/sources.list.d/jenkins.list > /dev/null
    $SUDO apt-get update -y
    pkg_install jenkins
  else
    $SUDO curl -o /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
    $SUDO rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    pkg_install jenkins
  fi

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now jenkins

  if systemctl is-active --quiet jenkins; then
    log_success "Jenkins is running on port 8080!"
  else
    log_warning "Jenkins service started. Verify status with 'systemctl status jenkins'."
  fi
}

# install_maven
install_maven() {
  log_step "Installing Apache Maven"

  if command -v mvn &>/dev/null; then
    log_success "Apache Maven is already installed: $(mvn -version | head -n 1)"
    return 0
  fi

  if ! command -v java &>/dev/null; then
    log_info "Maven requires Java runtime. Installing Java 17..."
    install_java "17"
  fi

  pkg_update
  pkg_install maven

  if command -v mvn &>/dev/null; then
    log_success "Maven installed: $(mvn -version | head -n 1)"
  else
    log_error "Maven installation failed."
    return 1
  fi
}

# install_ansible
install_ansible() {
  log_step "Installing Ansible Automation Engine"

  if command -v ansible &>/dev/null; then
    log_success "Ansible is already installed: $(ansible --version | head -n 1)"
    return 0
  fi

  pkg_update

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install software-properties-common
    $SUDO add-apt-repository --yes --update ppa:ansible/ansible || true
    pkg_install ansible
  else
    pkg_install epel-release || true
    pkg_install ansible || pkg_install ansible-core
  fi

  if command -v ansible &>/dev/null; then
    log_success "Ansible installed: $(ansible --version | head -n 1)"
  else
    log_error "Ansible installation failed."
    return 1
  fi
}

# install_terraform
install_terraform() {
  log_step "Installing HashiCorp Terraform"

  if command -v terraform &>/dev/null; then
    log_success "Terraform is already installed: $(terraform -version | head -n 1)"
    return 0
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install gnupg software-properties-common curl
    curl -fsSL https://apt.releases.hashicorp.com/gpg | $SUDO gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg --yes
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | $SUDO tee /etc/apt/sources.list.d/hashicorp.list > /dev/null
    $SUDO apt-get update -y
    pkg_install terraform
  else
    pkg_install yum-utils
    $SUDO yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo || true
    pkg_install terraform
  fi

  if command -v terraform &>/dev/null; then
    log_success "Terraform installed: $(terraform -version | head -n 1)"
  else
    log_error "Terraform installation failed."
    return 1
  fi
}

# install_kubectl
install_kubectl() {
  log_step "Installing Kubernetes CLI (kubectl)"

  if command -v kubectl &>/dev/null; then
    log_success "kubectl is already installed: $(kubectl version --client 2>&1 | head -n 1)"
    return 0
  fi

  log_info "Downloading stable kubectl binary..."
  curl -fsSL -o /tmp/kubectl "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  $SUDO install -o root -g root -m 0755 /tmp/kubectl /usr/local/bin/kubectl
  rm -f /tmp/kubectl

  if command -v kubectl &>/dev/null; then
    log_success "kubectl installed: $(kubectl version --client 2>&1 | head -n 1)"
  else
    log_error "kubectl installation failed."
    return 1
  fi
}

# install_helm
install_helm() {
  log_step "Installing Helm 3 (The Kubernetes Package Manager)"

  if command -v helm &>/dev/null; then
    log_success "Helm is already installed: $(helm version --short)"
    return 0
  fi

  log_info "Downloading official Helm 3 installer..."
  curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

  if command -v helm &>/dev/null; then
    log_success "Helm installed: $(helm version --short)"
  else
    log_error "Helm installation failed."
    return 1
  fi
}

# ==============================================================================
# 3. SECURITY TOOLS
# ==============================================================================

# install_sonarqube (SonarScanner CLI)
install_sonarqube() {
  log_step "Installing SonarScanner CLI for SonarQube Quality Analysis"

  if command -v sonar-scanner &>/dev/null; then
    log_success "SonarScanner is already installed."
    return 0
  fi

  pkg_install unzip curl
  local SCANNER_VER="5.0.1.3006"
  log_info "Fetching SonarScanner v${SCANNER_VER}..."
  curl -fsSL -o /tmp/sonar-scanner.zip "https://binaries.sonarsource.com/Distribution/sonar-scanner-cli/sonar-scanner-cli-${SCANNER_VER}-linux.zip"
  $SUDO unzip -q -o /tmp/sonar-scanner.zip -d /opt
  $SUDO ln -sf "/opt/sonar-scanner-${SCANNER_VER}-linux/bin/sonar-scanner" /usr/local/bin/sonar-scanner
  rm -f /tmp/sonar-scanner.zip

  if command -v sonar-scanner &>/dev/null; then
    log_success "SonarScanner CLI installed successfully!"
  else
    log_warning "SonarScanner placed at /opt/sonar-scanner-${SCANNER_VER}-linux/bin/sonar-scanner"
  fi
}

# install_trivy
install_trivy() {
  log_step "Installing Aqua Trivy Vulnerability & Security Scanner"

  if command -v trivy &>/dev/null; then
    log_success "Trivy is already installed: $(trivy --version | head -n 1)"
    return 0
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install wget apt-transport-https gnupg lsb-release
    wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | $SUDO gpg --dearmor -o /usr/share/keyrings/trivy.gpg --yes
    echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | $SUDO tee -a /etc/apt/sources.list.d/trivy.list > /dev/null
    $SUDO apt-get update -y
    pkg_install trivy
  else
    $SUDO rpm -ivh https://github.com/aquasecurity/trivy/releases/latest/download/trivy_Linux-64bit.rpm || true
  fi

  if command -v trivy &>/dev/null; then
    log_success "Aqua Trivy installed: $(trivy --version | head -n 1)"
  else
    log_error "Trivy installation failed."
    return 1
  fi
}

# ==============================================================================
# 4. WEB SERVERS
# ==============================================================================

# install_nginx
install_nginx() {
  log_step "Installing Nginx Web Server & Reverse Proxy (Port 80/443)"

  if command -v nginx &>/dev/null; then
    log_success "Nginx is already installed: $(nginx -v 2>&1)"
    $SUDO systemctl enable --now nginx || true
    return 0
  fi

  pkg_update
  pkg_install nginx
  $SUDO systemctl enable --now nginx

  if systemctl is-active --quiet nginx; then
    log_success "Nginx service is running and enabled on port 80!"
  else
    log_warning "Nginx installed. Verify service status with 'systemctl status nginx'."
  fi
}

# install_apache
install_apache() {
  log_step "Installing Apache HTTP Server (Port 80)"

  if command -v apache2 &>/dev/null || command -v httpd &>/dev/null; then
    log_success "Apache HTTP Server is already installed."
    return 0
  fi

  pkg_update
  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install apache2
    $SUDO systemctl enable --now apache2
  else
    pkg_install httpd
    $SUDO systemctl enable --now httpd
  fi

  log_success "Apache HTTP Server installed and running!"
}

# ==============================================================================
# 5. DATABASES
# ==============================================================================

# install_mongodb
install_mongodb() {
  log_step "Installing MongoDB Community Database Server (Port 27017)"

  if command -v mongod &>/dev/null; then
    log_success "MongoDB is already installed: $(mongod --version | head -n 1)"
    $SUDO systemctl enable --now mongod || true
    return 0
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install gnupg curl
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | $SUDO gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg --yes
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | $SUDO tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null
    $SUDO apt-get update -y
    pkg_install mongodb-org
  else
    cat <<EOF | $SUDO tee /etc/yum.repos.d/mongodb-org-7.0.repo
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
    pkg_install mongodb-org
  fi

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now mongod || true
  log_success "MongoDB Community Server installed on port 27017!"
}

# install_mysql
install_mysql() {
  log_step "Installing MySQL Server 8.0 (Port 3306)"

  if command -v mysql &>/dev/null; then
    log_success "MySQL is already installed: $(mysql --version)"
    return 0
  fi

  pkg_update
  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install mysql-server
    $SUDO systemctl enable --now mysql
  else
    pkg_install mysql-server || pkg_install mariadb-server
    $SUDO systemctl enable --now mysqld || $SUDO systemctl enable --now mariadb
  fi

  log_success "MySQL Server installed and listening on port 3306!"
}

# install_postgresql
install_postgresql() {
  log_step "Installing PostgreSQL Database Server (Port 5432)"

  if command -v psql &>/dev/null; then
    log_success "PostgreSQL is already installed: $(psql --version)"
    return 0
  fi

  pkg_update
  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install postgresql postgresql-contrib
    $SUDO systemctl enable --now postgresql
  else
    pkg_install postgresql-server postgresql-contrib
    $SUDO postgresql-setup --initdb || true
    $SUDO systemctl enable --now postgresql
  fi

  log_success "PostgreSQL installed and running on port 5432!"
}

# ==============================================================================
# 6. MONITORING & OBSERVABILITY
# ==============================================================================

# install_prometheus
install_prometheus() {
  log_step "Installing Prometheus Metrics Server (Port 9090)"

  if command -v prometheus &>/dev/null || [ -f /usr/local/bin/prometheus ]; then
    log_success "Prometheus binary is already present."
    return 0
  fi

  local PROM_VER="2.52.0"
  pkg_install wget tar
  log_info "Downloading Prometheus v${PROM_VER}..."
  wget -q "https://github.com/prometheus/prometheus/releases/download/v${PROM_VER}/prometheus-${PROM_VER}.linux-amd64.tar.gz" -O /tmp/prometheus.tar.gz
  tar -xzf /tmp/prometheus.tar.gz -C /tmp
  $SUDO mv /tmp/prometheus-${PROM_VER}.linux-amd64/prometheus /usr/local/bin/
  $SUDO mv /tmp/prometheus-${PROM_VER}.linux-amd64/promtool /usr/local/bin/
  $SUDO mkdir -p /etc/prometheus /var/lib/prometheus
  $SUDO mv /tmp/prometheus-${PROM_VER}.linux-amd64/consoles /etc/prometheus/ || true
  $SUDO mv /tmp/prometheus-${PROM_VER}.linux-amd64/console_libraries /etc/prometheus/ || true
  $SUDO mv /tmp/prometheus-${PROM_VER}.linux-amd64/prometheus.yml /etc/prometheus/ || true
  rm -rf /tmp/prometheus*

  # Create systemd service unit
  cat <<EOF | $SUDO tee /etc/systemd/system/prometheus.service > /dev/null
[Unit]
Description=Prometheus Time Series Collection and Alerting Server
Wants=network-online.target
After=network-online.target

[Service]
User=root
Type=simple
ExecStart=/usr/local/bin/prometheus --config.file=/etc/prometheus/prometheus.yml --storage.tsdb.path=/var/lib/prometheus/
Restart=always

[Install]
WantedBy=multi-user.target
EOF

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now prometheus
  log_success "Prometheus server installed and running on port 9090!"
}

# install_grafana
install_grafana() {
  log_step "Installing Grafana Visualization Dashboard (Port 3000)"

  if systemctl is-active --quiet grafana-server || command -v grafana-server &>/dev/null; then
    log_success "Grafana is already installed. Skipping."
    return 0
  fi

  if [ "$PKG_MGR" = "apt" ]; then
    pkg_install apt-transport-https software-properties-common wget
    $SUDO mkdir -p /etc/apt/keyrings/
    wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | $SUDO tee /etc/apt/keyrings/grafana.gpg > /dev/null
    echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | $SUDO tee -a /etc/apt/sources.list.d/grafana.list > /dev/null
    $SUDO apt-get update -y
    pkg_install grafana
  else
    cat <<EOF | $SUDO tee /etc/yum.repos.d/grafana.repo
[grafana]
name=grafana
baseurl=https://rpm.grafana.com
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://rpm.grafana.com/gpg.key
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
EOF
    pkg_install grafana
  fi

  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now grafana-server
  log_success "Grafana installed and running on port 3000!"
}

# ==============================================================================
# 7. LINUX UTILITIES
# ==============================================================================

# install_git
install_git() {
  log_step "Installing Git Distributed Version Control"
  if command -v git &>/dev/null; then
    log_success "Git is already installed: $(git --version)"
    return 0
  fi
  pkg_update
  pkg_install git
  log_success "Git installed: $(git --version)"
}

# install_curl
install_curl() {
  log_step "Installing cURL"
  if command -v curl &>/dev/null; then
    log_success "cURL is already installed: $(curl --version | head -n 1)"
    return 0
  fi
  pkg_update
  pkg_install curl
  log_success "cURL installed: $(curl --version | head -n 1)"
}

# install_wget
install_wget() {
  log_step "Installing Wget"
  if command -v wget &>/dev/null; then
    log_success "Wget is already installed: $(wget --version | head -n 1)"
    return 0
  fi
  pkg_update
  pkg_install wget
  log_success "Wget installed: $(wget --version | head -n 1)"
}

# install_zip
install_zip() {
  log_step "Installing ZIP Archiver"
  if command -v zip &>/dev/null; then
    log_success "ZIP is already installed."
    return 0
  fi
  pkg_update
  pkg_install zip
  log_success "ZIP installed: $(zip -v | head -n 1)"
}

# install_unzip
install_unzip() {
  log_step "Installing Unzip"
  if command -v unzip &>/dev/null; then
    log_success "Unzip is already installed."
    return 0
  fi
  pkg_update
  pkg_install unzip
  log_success "Unzip installed: $(unzip -v | head -n 1)"
}

# install_net_tools
install_net_tools() {
  log_step "Installing Net-Tools (ifconfig, netstat, route)"
  if command -v ifconfig &>/dev/null && command -v netstat &>/dev/null; then
    log_success "Net-Tools is already installed."
    return 0
  fi
  pkg_update
  pkg_install net-tools
  log_success "Net-tools installed successfully!"
}

# ==============================================================================
# Helper for executing selected tools only
# ==============================================================================
run_automation() {
  detect_os
  log_info "Multi-Cloud Automation Engine initialized."
}
