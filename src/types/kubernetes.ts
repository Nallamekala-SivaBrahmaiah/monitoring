export type K8sResourceType =
  | 'Pod'
  | 'Deployment'
  | 'ReplicaSet'
  | 'DaemonSet'
  | 'StatefulSet'
  | 'ConfigMap'
  | 'PersistentVolume'
  | 'PersistentVolumeClaim'
  | 'HelmRelease'
  | 'Namespace'
  | 'Service'
  | 'Ingress';

export type K8sServiceType = 'LoadBalancer' | 'ClusterIP' | 'NodePort' | 'ExternalName';

export interface K8sResourceMetric {
  percent: number;
  label: string;
}

export interface K8sUnifiedResource {
  id: string;
  name: string;
  kind: K8sResourceType;
  namespace: string;
  cluster: string;
  status: string;
  serviceType?: K8sServiceType;
  clusterIp?: string;
  externalIp?: string;
  targetPorts?: string;
  replicas?: {
    desired: number;
    ready: number;
    available?: number;
  };
  metrics: {
    cpu: K8sResourceMetric;
    ram: K8sResourceMetric;
    disk: K8sResourceMetric;
  };
  age: string;
  manifestYaml: string;
}

export interface K8sTelemetryOverview {
  cluster: string;
  status: string;
  healthPercent: number;
  cpu: {
    percent: number;
    coresText: string;
    trend: number[];
  };
  ram: {
    percent: number;
    usageText: string;
    trend: number[];
  };
  disk: {
    percent: number;
    usageText: string;
    trend: number[];
  };
  counts: {
    pods: number;
    deployments: number;
    replicaSets: number;
    daemonSets: number;
    statefulSets: number;
    configMaps: number;
    pv: number;
    pvc: number;
    helmReleases: number;
    namespaces: number;
    servicesTotal: number;
    servicesByType: {
      loadBalancer: number;
      clusterIp: number;
      nodePort: number;
      externalName: number;
    };
    ingress: number;
  };
}

