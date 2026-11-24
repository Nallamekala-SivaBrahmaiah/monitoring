export type DevopsToolName = 'jenkins' | 'sonarqube' | 'trivy';

export interface IDevopsToolConfigData {
  tool: DevopsToolName;
  installCommands: string;
  uninstallCommands: string;
  verificationCommands?: string;
  serviceName?: string;
  port?: number;
  healthCheckCommand?: string;
  lastExecutionAt?: Date | string;
  lastExecutionStatus?: 'success' | 'failed' | 'running';
  lastExecutionServerName?: string;
  lastExecutionServerHost?: string;
  lastExecutionAction?: 'install' | 'uninstall' | 'test';
  lastExecutionLog?: string;
  lastExecutionExitCode?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export const DEFAULT_DEVOPS_COMMANDS: Record<
  DevopsToolName,
  {
    installCommands: string;
    uninstallCommands: string;
    verificationCommands: string;
    serviceName: string;
    port: number;
    healthCheckCommand: string;
  }
> = {
  jenkins: {
    installCommands: `# Official Jenkins Installation on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y fontconfig openjdk-21-jre-headless openjdk-21-jdk-headless wget curl gnupg
sudo mkdir -p /etc/apt/keyrings
sudo chmod 755 /etc/apt/keyrings
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee /etc/apt/keyrings/jenkins-keyring.asc > /dev/null
sudo chmod 644 /etc/apt/keyrings/jenkins-keyring.asc
echo "deb [trusted=yes signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update
sudo apt-get install -y jenkins
sudo systemctl daemon-reload
sudo systemctl enable --now jenkins
jenkins --version`,
    uninstallCommands: `# Jenkins Complete Removal & Purge
sudo systemctl stop jenkins 2>/dev/null || true
sudo systemctl disable jenkins 2>/dev/null || true
sudo pkill -9 -f 'jenkins' 2>/dev/null || true
sudo apt-get purge -y jenkins 2>/dev/null || sudo dpkg --purge --force-all jenkins 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true
sudo rm -f /usr/share/java/jenkins.war /usr/bin/jenkins
sudo rm -f /etc/apt/sources.list.d/jenkins.list /etc/apt/keyrings/jenkins-keyring.asc
sudo rm -rf /etc/systemd/system/jenkins.service.d /etc/systemd/system/jenkins.service /lib/systemd/system/jenkins.service
sudo rm -rf /var/lib/jenkins /var/log/jenkins /etc/default/jenkins
sudo systemctl daemon-reload
sudo systemctl reset-failed jenkins 2>/dev/null || true`,
    verificationCommands: `systemctl is-active jenkins && (jenkins --version 2>/dev/null || which jenkins)`,
    serviceName: 'jenkins',
    port: 8080,
    healthCheckCommand: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/login 2>/dev/null || echo "offline"`,
  },
  sonarqube: {
    installCommands: `# SonarQube Community Container Deployment via Docker
sudo sysctl -w vm.max_map_count=262144
sudo sysctl -w fs.file-max=65536
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y docker.io
  sudo systemctl enable --now docker
  sudo usermod -aG docker $USER || true
fi
sudo docker pull sonarqube:community || sudo docker pull sonarqube:lts-community
sudo docker stop sonarqube 2>/dev/null || true
sudo docker rm sonarqube 2>/dev/null || true
sudo docker run -d --name sonarqube --restart unless-stopped -p 9000:9000 sonarqube:community`,
    uninstallCommands: `# SonarQube Container Removal & Cleanup
sudo docker stop sonarqube 2>/dev/null || true
sudo docker rm sonarqube 2>/dev/null || true
sudo docker rmi sonarqube:community 2>/dev/null || true`,
    verificationCommands: `sudo docker ps --filter "name=sonarqube" --format "{{.Names}} - {{.Status}}"`,
    serviceName: 'sonarqube',
    port: 9000,
    healthCheckCommand: `curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/api/system/status 2>/dev/null || echo "offline"`,
  },
  trivy: {
    installCommands: `# Aqua Security Trivy Vulnerability Scanner Installation
sudo apt-get install -y wget apt-transport-https gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor | sudo tee /etc/apt/keyrings/trivy.gpg > /dev/null
CODENAME=$(lsb_release -sc 2>/dev/null || echo 'noble')
echo "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb \${CODENAME} main" | sudo tee /etc/apt/sources.list.d/trivy.list > /dev/null
if sudo apt-get update -y && sudo apt-get install -y trivy; then
  echo "Trivy installed successfully via apt."
else
  echo "Falling back to official binary release..."
  ARCH=$(uname -m)
  [ "$ARCH" = "x86_64" ] && TRIVY_ARCH="64bit" || TRIVY_ARCH="ARM64"
  wget -q https://github.com/aquasecurity/trivy/releases/download/v0.59.1/trivy_0.59.1_Linux-\${TRIVY_ARCH}.tar.gz -O /tmp/trivy.tar.gz || true
  if [ -f /tmp/trivy.tar.gz ]; then
    sudo tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy
    sudo chmod +x /usr/local/bin/trivy
    sudo ln -sf /usr/local/bin/trivy /usr/bin/trivy 2>/dev/null || true
    rm -f /tmp/trivy.tar.gz
  fi
fi
which trivy && trivy --version`,
    uninstallCommands: `# Aqua Security Trivy Scanner Removal
sudo apt-get purge -y trivy 2>/dev/null || sudo dpkg --purge --force-all trivy 2>/dev/null || true
sudo rm -f /usr/local/bin/trivy /usr/bin/trivy /etc/apt/sources.list.d/trivy.list /etc/apt/keyrings/trivy.gpg /usr/share/keyrings/trivy.gpg
sudo rm -rf /root/.cache/trivy /home/*/.cache/trivy /tmp/trivy* 2>/dev/null || true`,
    verificationCommands: `which trivy && trivy --version`,
    serviceName: 'trivy',
    port: 0,
    healthCheckCommand: `trivy --version`,
  },
};
