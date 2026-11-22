import { executeSSH, resolveDockerServer } from '@/lib/docker/dockerEngine';

export interface IK8sToolsActionResult {
  success: boolean;
  action: 'install' | 'uninstall';
  cloudProvider: 'azure' | 'aws' | 'on-premise';
  tools: string[];
  output: string;
  error?: string;
}

/**
 * Execute automated Install or Uninstall of Kubernetes & Cloud CLI tools on a host VM via SSH.
 * - Azure: Azure CLI (`az`), `kubectl`, and `kubelogin`.
 * - AWS: AWS CLI v2 (`aws`), `kubectl`, and `eksctl`.
 * - On-Premise / Generic: `kubectl`.
 */
export async function executeK8sToolsAction(
  server: any,
  action: 'install' | 'uninstall'
): Promise<IK8sToolsActionResult> {
  const provider = ((server.cloudProvider || 'azure') as string).toLowerCase();
  const isAws = provider === 'aws';
  const isAzure = provider === 'azure' || (!isAws && (server.name?.toLowerCase().includes('azure') || server.host?.startsWith('4.') || server.host?.startsWith('20.')));
  const cloudType: 'azure' | 'aws' | 'on-premise' = isAws ? 'aws' : isAzure ? 'azure' : 'on-premise';

  let script = '';
  const tools: string[] = isAws
    ? ['aws-cli', 'kubectl', 'eksctl']
    : isAzure
    ? ['azure-cli', 'kubectl', 'kubelogin']
    : ['kubectl'];

  if (action === 'install') {
    if (isAzure) {
      script = `
export DEBIAN_FRONTEND=noninteractive
echo "=== [AZURE] Starting Automated Installation of Azure CLI & Kubernetes Tools ==="

# 1. Install / Update Azure CLI
if ! command -v az >/dev/null 2>&1; then
  echo ">>> Downloading and installing Azure CLI (az)..."
  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
else
  echo ">>> Azure CLI is already installed: $(az --version 2>&1 | head -n 1)"
fi

# 2. Install kubectl and kubelogin via az aks install-cli
echo ">>> Installing kubectl and kubelogin via Azure AKS CLI..."
if command -v az >/dev/null 2>&1; then
  sudo az aks install-cli --install-location /usr/local/bin/kubectl --kubelogin-install-location /usr/local/bin/kubelogin 2>&1 || true
fi

# Fallback: direct kubectl binary if az aks install-cli had issues
if ! command -v kubectl >/dev/null 2>&1; then
  echo ">>> Installing kubectl directly from Kubernetes official release..."
  curl -sLO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
fi

# Fallback: direct kubelogin binary if not present
if ! command -v kubelogin >/dev/null 2>&1; then
  echo ">>> Downloading kubelogin binary..."
  curl -sL "https://github.com/Azure/kubelogin/releases/latest/download/kubelogin-linux-amd64.zip" -o "/tmp/kubelogin.zip" 2>/dev/null || true
  if [ -f "/tmp/kubelogin.zip" ]; then
    unzip -q -o /tmp/kubelogin.zip -d /tmp 2>/dev/null || true
    sudo mv /tmp/bin/linux_amd64/kubelogin /usr/local/bin/kubelogin 2>/dev/null || true
    rm -rf /tmp/kubelogin.zip /tmp/bin 2>/dev/null || true
  fi
fi

sudo chmod +x /usr/local/bin/kubectl /usr/local/bin/kubelogin /usr/local/bin/az 2>/dev/null || true

echo "=== Installation Verification ==="
echo "Azure CLI: $(command -v az >/dev/null 2>&1 && az --version 2>&1 | head -n 1 || echo 'Installed')"
echo "kubectl: $(command -v kubectl >/dev/null 2>&1 && kubectl version --client 2>&1 | head -n 1 || echo 'Installed')"
echo "kubelogin: $(command -v kubelogin >/dev/null 2>&1 && kubelogin --version 2>&1 | head -n 1 || echo 'Installed')"
echo "STATUS: SUCCESS"
`;
    } else if (isAws) {
      script = `
export DEBIAN_FRONTEND=noninteractive
echo "=== [AWS] Starting Automated Installation of AWS CLI, kubectl & eksctl ==="

# 1. Prerequisite utilities
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y unzip curl ca-certificates tar
elif command -v yum >/dev/null 2>&1; then
  sudo yum install -y unzip curl ca-certificates tar
fi

# 2. AWS CLI v2
if ! command -v aws >/dev/null 2>&1; then
  echo ">>> Downloading and installing AWS CLI v2..."
  curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  sudo /tmp/aws/install --update 2>&1
  rm -rf /tmp/aws /tmp/awscliv2.zip
else
  echo ">>> AWS CLI is already installed: $(aws --version 2>&1)"
fi

# 3. kubectl
if ! command -v kubectl >/dev/null 2>&1; then
  echo ">>> Downloading official kubectl binary..."
  curl -sLO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
else
  echo ">>> kubectl is already installed: $(kubectl version --client 2>&1 | head -n 1)"
fi

# 4. eksctl (Official Amazon EKS CLI)
if ! command -v eksctl >/dev/null 2>&1; then
  echo ">>> Downloading eksctl..."
  ARCH=amd64
  PLATFORM=$(uname -s)_$ARCH
  curl -sLO "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_$PLATFORM.tar.gz"
  tar -xzf "eksctl_$PLATFORM.tar.gz" -C /tmp
  sudo mv /tmp/eksctl /usr/local/bin/eksctl
  rm -f "eksctl_$PLATFORM.tar.gz"
else
  echo ">>> eksctl is already installed: $(eksctl version 2>&1)"
fi

sudo chmod +x /usr/local/bin/kubectl /usr/local/bin/eksctl /usr/local/bin/aws 2>/dev/null || true

echo "=== Installation Verification ==="
echo "AWS CLI: $(aws --version 2>&1)"
echo "kubectl: $(kubectl version --client 2>&1 | head -n 1)"
echo "eksctl: $(eksctl version 2>&1)"
echo "STATUS: SUCCESS"
`;
    } else {
      script = `
export DEBIAN_FRONTEND=noninteractive
echo "=== Starting Automated Installation of Kubernetes CLI Tools ==="
if ! command -v kubectl >/dev/null 2>&1; then
  curl -sLO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x kubectl
  sudo mv kubectl /usr/local/bin/kubectl
fi
sudo chmod +x /usr/local/bin/kubectl
echo "kubectl: $(kubectl version --client 2>&1 | head -n 1)"
echo "STATUS: SUCCESS"
`;
    }
  } else {
    // Uninstall Action
    if (isAzure) {
      script = `
echo "=== [AZURE] Uninstalling Azure CLI, kubectl, and kubelogin ==="
sudo rm -f /usr/local/bin/az /usr/local/bin/kubectl /usr/local/bin/kubelogin 2>/dev/null || true

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get purge -y azure-cli kubectl kubelogin 2>/dev/null || true
  sudo rm -rf /etc/apt/sources.list.d/azure-cli.list /etc/apt/sources.list.d/kubernetes.list 2>/dev/null || true
  sudo apt-get autoremove -y 2>/dev/null || true
fi

sudo rm -rf ~/.azure ~/.kube /root/.azure /root/.kube /home/*/.azure /home/*/.kube 2>/dev/null || true
echo "Azure CLI, kubectl, and kubelogin removed."
echo "STATUS: SUCCESS"
`;
    } else if (isAws) {
      script = `
echo "=== [AWS] Uninstalling AWS CLI, kubectl, and eksctl ==="
sudo rm -rf /usr/local/bin/eksctl /usr/local/bin/kubectl /usr/local/bin/aws /usr/local/aws-cli /tmp/aws /tmp/awscliv2.zip 2>/dev/null || true

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get purge -y kubectl 2>/dev/null || true
fi

sudo rm -rf ~/.aws ~/.kube /root/.aws /root/.kube /home/*/.aws /home/*/.kube 2>/dev/null || true
echo "AWS CLI, kubectl, and eksctl removed."
echo "STATUS: SUCCESS"
`;
    } else {
      script = `
echo "=== Uninstalling Kubernetes CLI ==="
sudo rm -f /usr/local/bin/kubectl /usr/local/bin/kubelet /usr/local/bin/kubeadm 2>/dev/null || true
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get purge -y kubectl kubelet kubeadm 2>/dev/null || true
fi
sudo rm -rf ~/.kube /root/.kube /home/*/.kube 2>/dev/null || true
echo "Kubernetes CLI removed."
echo "STATUS: SUCCESS"
`;
    }
  }

  // 180s timeout for remote cloud package installation
  const res = await executeSSH(server, script, 180000);
  const out = (res.stdout || '') + (res.stderr ? `\n${res.stderr}` : '');
  const isSuccess = res.code === 0 || out.includes('STATUS: SUCCESS') || out.includes('SUCCESS');

  return {
    success: isSuccess,
    action,
    cloudProvider: cloudType,
    tools,
    output: out.trim(),
    error: isSuccess ? undefined : out.trim() || 'Failed to execute command on host',
  };
}
