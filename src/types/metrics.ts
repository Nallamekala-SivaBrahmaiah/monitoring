export type MetricType = 'CPU' | 'Memory' | 'Disk' | 'Network';

export interface PerformanceMetricPoint {
  timestamp: string;
  cpu: number | null;
  memory: number | null;
  disk: number | null;
  network: number | null;
}

export interface ResourceMetric {
  resourceId: string;
  resourceName: string;
  metricType: MetricType;
  unit: string;
  currentValue: number | null;
  history: { timestamp: string; value: number }[];
}

export interface OverviewMetrics {
  totalResources: number;
  totalVms: number;
  runningVms: number;
  stoppedVms: number;
  totalContainers: number;
  k8sClusters: number;
  k8sPods: number;
  activeAlerts: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}
