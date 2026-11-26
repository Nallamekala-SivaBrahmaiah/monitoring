import { NextRequest, NextResponse } from 'next/server';
import { dispatchDevOpsAlert, DevOpsAlertEvent } from '@/lib/notifications/devopsNotificationDispatcher';

const PRESETS: Record<string, DevOpsAlertEvent> = {
  server_cpu: {
    category: 'server',
    toolName: 'Server OS Telemetry',
    eventName: 'High CPU Utilization Exceeded',
    severity: 'critical',
    status: 'Active',
    resourceName: 'vm01siva-mon',
    resourceId: 'srv-6aff0e3786776b10084ecb75',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Host Server: /home/siva/monitoring',
    reason:
      'CPU usage spiked to 88.5% (Threshold: 70%). Cause: Node.js Next.js production build process or runaway background async loop consuming excessive core cycles.',
    metrics: { cpu: 88.5, threshold: 70 },
    remediationSteps: [
      'SSH into the server and identify the top CPU-consuming process ID.',
      'Check if it is a temporary compilation build or a runaway background worker.',
      'Restart the specific PM2 process or kill the runaway process ID.',
      'Verify CPU usage drops back below 10%.',
    ],
    remediationCommands: `ps aux --sort=-%cpu | head -10\npm2 restart monitoring-app\npm2 logs monitoring-app --lines 30`,
    link: '/dashboard/servers',
  },

  server_memory: {
    category: 'server',
    toolName: 'Server OS Telemetry',
    eventName: 'High RAM Memory Utilization',
    severity: 'high',
    status: 'Active',
    resourceName: 'vm01siva-mon',
    resourceId: 'srv-6aff0e3786776b10084ecb75',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Host Server: RAM / Swap Memory',
    reason:
      'RAM memory usage reached 86% (Threshold: 70%). Cause: Node.js heap leak or MongoDB buffer cache accumulation in RAM without garbage collection.',
    metrics: { memory: 86, threshold: 70 },
    remediationSteps: [
      'Check free memory and swap allocation with free -h.',
      'Identify memory-heavy processes using ps aux.',
      'Restart PM2 with max-memory-restart flag to auto-flush unreleased heap.',
    ],
    remediationCommands: `free -h\nps aux --sort=-%mem | head -10\npm2 restart monitoring-app --max-memory-restart 1.5G`,
    link: '/dashboard/servers',
  },

  server_disk: {
    category: 'server',
    toolName: 'Server OS Telemetry',
    eventName: 'High Root Disk Space Usage',
    severity: 'warning',
    status: 'Warning',
    resourceName: 'vm01siva-mon',
    resourceId: 'srv-6aff0e3786776b10084ecb75',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Filesystem Mount: / (root partition)',
    reason:
      'Root partition (/) capacity reached 79% (Threshold: 70%). Cause: Application logs accumulating in ~/.pm2/logs, Docker dangling build cache, and systemd journal logs.',
    metrics: { disk: 79, threshold: 70 },
    remediationSteps: [
      'Check available disk space per partition with df -h.',
      'Flush PM2 application log files.',
      'Prune unused Docker images and build layers.',
      'Vacuum system logs older than 3 days.',
    ],
    remediationCommands: `df -h\npm2 flush\ndocker system prune -af --volumes\nsudo journalctl --vacuum-time=3d`,
    link: '/dashboard/servers',
  },

  docker_stop: {
    category: 'docker',
    toolName: 'Docker Engine',
    eventName: 'Container Unexpectedly Exited / Stopped',
    severity: 'critical',
    status: 'Stopped',
    resourceName: 'auth-microservice-prod',
    resourceId: 'c-8f921ab047de',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Server 4.240.105.247 &bull; Docker Engine',
    reason:
      'Container auth-microservice-prod exited with Code 137 (OOMKilled - Out Of Memory). The container exceeded its 1.0 GB memory limit during token hashing.',
    metrics: { exitCode: 137 },
    remediationSteps: [
      'Inspect exited container logs to confirm the crash stack trace.',
      'Increase container memory ceiling in docker-compose.yml or docker run flags.',
      'Restart the container.',
      'Verify container health status becomes healthy.',
    ],
    remediationCommands: `docker logs --tail 50 auth-microservice-prod\ndocker start auth-microservice-prod\ndocker stats --no-stream auth-microservice-prod`,
    link: '/dashboard/containers',
  },

  docker_delete: {
    category: 'docker',
    toolName: 'Docker Engine',
    eventName: 'Container Removed / Deleted',
    severity: 'high',
    status: 'Warning',
    resourceName: 'payment-gateway-container',
    resourceId: 'c-31a89c02ff1e',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Server 4.240.105.247 &bull; Docker daemon',
    reason:
      'Container payment-gateway-container was ungracefully removed via external CLI or automated cleanup script.',
    remediationSteps: [
      'Verify whether removal was part of an automated CI/CD redeployment or unauthorized deletion.',
      'Relaunch the container using the verified image tag.',
      'Inspect host docker events log.',
    ],
    remediationCommands: `docker run -d --name payment-gateway-container --restart=always -p 8080:8080 payment-service:latest\ndocker ps -a | grep payment`,
    link: '/dashboard/containers',
  },

  kubernetes_fail: {
    category: 'kubernetes',
    toolName: 'Kubernetes Cluster',
    eventName: 'Pod CrashLoopBackOff & Deployment Degraded',
    severity: 'critical',
    status: 'Failed',
    resourceName: 'frontend-deployment-7f89bc9-4k2x1',
    resourceId: 'k8s-pod-frontend-01',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Namespace: production &bull; Pod: frontend-deployment',
    reason:
      'Pod repeatedly crashing on startup (CrashLoopBackOff). Reason: Missing environment variable NEXT_PUBLIC_API_URL causing initialization exception.',
    remediationSteps: [
      'Inspect previous container logs using kubectl logs --previous.',
      'Describe pod events to inspect termination reason and exit code.',
      'Correct the ConfigMap or secret with the missing variable.',
      'Rollout restart the deployment or undo the faulty release.',
    ],
    remediationCommands: `kubectl logs frontend-deployment-7f89bc9-4k2x1 -n production --previous\nkubectl describe pod frontend-deployment-7f89bc9-4k2x1 -n production\nkubectl rollout undo deployment/frontend-deployment -n production`,
    link: '/dashboard/kubernetes',
  },

  kubernetes_pass: {
    category: 'kubernetes',
    toolName: 'Kubernetes Cluster',
    eventName: 'Deployment Rollout Completed Successfully',
    severity: 'info',
    status: 'Passed',
    resourceName: 'order-service-deployment',
    resourceId: 'k8s-dep-orders-v2',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Namespace: production',
    reason:
      'Zero-downtime rolling update completed. All 3/3 replicas updated to order-service:v2.4.0 and passed readiness & liveness probes.',
    remediationSteps: [
      'No remediation required. The deployment is healthy and serving live traffic.',
    ],
    remediationCommands: `kubectl get deployment order-service-deployment -n production\nkubectl get pods -l app=order-service -n production`,
    link: '/dashboard/kubernetes',
  },

  jenkins_fail: {
    category: 'jenkins',
    toolName: 'Jenkins CI/CD',
    eventName: 'Pipeline Build Failed',
    severity: 'high',
    status: 'Failed',
    resourceName: 'MultiCloud-Backend-Pipeline #142',
    resourceId: 'jenkins-job-142',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Jenkins Master: http://4.240.105.247:8080 &bull; Stage: Unit Tests',
    reason:
      'Build failed in stage "Run Unit Tests". 2 tests failed in AuthControllerTest due to assertNull expectation violation.',
    remediationSteps: [
      'Inspect Jenkins console output for failure stack trace.',
      'Checkout branch and fix failing unit test assertions locally.',
      'Push commit to trigger automated rebuild.',
    ],
    remediationCommands: `git pull origin main\nnpm test -- AuthController.test.ts\ngit commit -am "fix(tests): resolve auth assertion" && git push`,
    link: '/dashboard/jenkins',
  },

  sonarqube_fail: {
    category: 'sonarqube',
    toolName: 'SonarQube Quality Gate',
    eventName: 'Quality Gate Failed',
    severity: 'high',
    status: 'Failed',
    resourceName: 'Monitoring-Core-API',
    resourceId: 'sonar-proj-mon-api',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'SonarQube Dashboard: http://4.240.105.247:9000 &bull; Project: Monitoring-Core-API',
    reason:
      'Quality Gate failed: Found 3 Security Hotspots and Code Coverage dropped to 68.4% (Minimum required: 80.0%).',
    remediationSteps: [
      'Log in to SonarQube dashboard and review flagged Security Hotspots in authMiddleware.',
      'Add missing unit test cases for uncovered branches.',
      'Re-execute sonar-scanner analysis.',
    ],
    remediationCommands: `npm run test:coverage\nsonar-scanner -Dsonar.projectKey=Monitoring-Core-API -Dsonar.sources=src`,
    link: '/dashboard/sonarqube',
  },

  trivy_cve: {
    category: 'trivy',
    toolName: 'Trivy Security Scanner',
    eventName: 'Critical CVE Vulnerabilities Detected',
    severity: 'critical',
    status: 'Active',
    resourceName: 'node:18-alpine &bull; CVE-2024-38816',
    resourceId: 'trivy-scan-srv-01',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Dockerfile &bull; Base image node:18-alpine',
    reason:
      'Trivy discovered 1 CRITICAL and 3 HIGH CVE vulnerabilities in container base image node:18-alpine. Affected package: libcurl (Remote Code Execution risk).',
    metrics: { vulnerabilitiesCount: 4 },
    remediationSteps: [
      'Upgrade Dockerfile base image to node:20-alpine or patched alpine image.',
      'Rebuild docker image without cache.',
      'Re-run trivy image scan to verify zero CRITICAL vulnerabilities.',
    ],
    remediationCommands: `sed -i 's/node:18-alpine/node:20-alpine/g' Dockerfile\ndocker build --no-cache -t app:secure .\ntrivy image --severity CRITICAL,HIGH app:secure`,
    link: '/dashboard/trivy',
  },

  ansible_fail: {
    category: 'ansible',
    toolName: 'Ansible Automation',
    eventName: 'Playbook Execution Failed',
    severity: 'high',
    status: 'Failed',
    resourceName: 'deploy-nginx-cluster.yml',
    resourceId: 'ansible-exec-89',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Host: 10.0.0.4 &bull; Task: Restart Nginx Service',
    reason:
      'Playbook failed on target host 10.0.0.4 at task "Restart Nginx Service". Error: nginx: [emerg] duplicate listen option for [::]:80.',
    metrics: { failedTasks: 1 },
    remediationSteps: [
      'Inspect /etc/nginx/sites-enabled configuration on host 10.0.0.4 for duplicate port bindings.',
      'Remove duplicate listen directive in virtual host block.',
      'Re-run Ansible playbook with --tags=nginx.',
    ],
    remediationCommands: `ansible 10.0.0.4 -m shell -a "nginx -t"\nansible-playbook -i inventory deploy-nginx-cluster.yml --tags=nginx`,
    link: '/dashboard/ansible',
  },

  terraform_fail: {
    category: 'terraform',
    toolName: 'Terraform Infrastructure',
    eventName: 'Terraform Apply Failed',
    severity: 'critical',
    status: 'Failed',
    resourceName: 'azure-production-vpc',
    resourceId: 'tf-run-204',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Workspace: terraform/azure &bull; State: azurerm_virtual_network.vpc',
    reason:
      'Terraform Apply failed: Error acquiring state lock. Storage blob lease exists from previous aborted pipeline run.',
    remediationSteps: [
      'Verify that no concurrent Terraform pipeline is executing.',
      'Force-unlock the state lock using the lock ID from error log.',
      'Re-run terraform plan & terraform apply.',
    ],
    remediationCommands: `terraform force-unlock <LOCK_ID>\nterraform refresh\nterraform apply -auto-approve`,
    link: '/dashboard/terraform',
  },

  maven_fail: {
    category: 'maven',
    toolName: 'Maven Build Engine',
    eventName: 'Maven Compilation / Test Failed',
    severity: 'high',
    status: 'Failed',
    resourceName: 'spring-boot-order-service (pom.xml)',
    resourceId: 'mvn-build-301',
    serverName: 'vm01siva-mon',
    ipAddress: '4.240.105.247',
    provider: 'Azure',
    region: 'centralindia',
    locationToFix: 'Directory: /home/siva/workspace/order-service &bull; pom.xml',
    reason:
      'Maven build failed: [ERROR] Non-resolvable parent POM for com.company:order-service:2.1.0. Could not transfer artifact from central repository (Network timeout).',
    remediationSteps: [
      'Verify outbound internet connectivity and Maven proxy configuration in ~/.m2/settings.xml.',
      'Clean local Maven cache repository.',
      'Re-run Maven build with -U (force update snapshots).',
    ],
    remediationCommands: `mvn clean install -U -DskipTests=false\nmvn dependency:tree`,
    link: '/dashboard/maven',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const presetKey = searchParams.get('preset');
    const body = await request.json().catch(() => ({}));

    const eventPayload: DevOpsAlertEvent = presetKey && PRESETS[presetKey]
      ? { ...PRESETS[presetKey], ...body }
      : body.eventName
      ? body
      : PRESETS.server_cpu;

    const result = await dispatchDevOpsAlert(eventPayload);

    return NextResponse.json({
      success: result.success,
      event: eventPayload.eventName,
      tool: eventPayload.toolName,
      recipients: result.recipients,
      recipientsCount: result.recipientsCount,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    availablePresets: Object.keys(PRESETS),
    descriptions: Object.entries(PRESETS).map(([key, val]) => ({
      key,
      tool: val.toolName,
      event: val.eventName,
      severity: val.severity,
    })),
  });
}
