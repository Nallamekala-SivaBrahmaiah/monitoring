export interface AzureMonitorMetricsResult {
  cpuUtilization: number | null;
  memoryUtilization: number | null;
  diskUtilization: number | null;
  networkIn: number | null;
  networkOut: number | null;
}

export async function fetchAzureVMMetrics(
  resourceUri: string,
  token: string
): Promise<AzureMonitorMetricsResult> {
  const result: AzureMonitorMetricsResult = {
    cpuUtilization: null,
    memoryUtilization: null,
    diskUtilization: null,
    networkIn: null,
    networkOut: null,
  };

  if (!token || !resourceUri) return result;

  try {
    const metricNames = 'Percentage CPU,Available Memory Bytes,Disk Read Bytes,Disk Write Bytes,Network In Total,Network Out Total';
    const timespan = 'PT1H';
    const interval = 'PT5M';

    const cleanUri = resourceUri.startsWith('/') ? resourceUri.slice(1) : resourceUri;
    const url = `https://management.azure.com/${cleanUri}/providers/microsoft.insights/metrics?api-version=2018-01-01&metricnames=${encodeURIComponent(
      metricNames
    )}&timespan=${timespan}&interval=${interval}&aggregation=Average,Total`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return result;
    }

    const data = await res.json();
    if (!Array.isArray(data.value)) {
      return result;
    }

    for (const m of data.value) {
      const name = m.name?.value;
      const timeseries = m.timeseries?.[0]?.data;
      if (!Array.isArray(timeseries) || timeseries.length === 0) continue;

      const validPoints = timeseries.filter(
        (p: any) =>
          (p.average !== null && p.average !== undefined && !isNaN(p.average)) ||
          (p.total !== null && p.total !== undefined && !isNaN(p.total))
      );
      if (validPoints.length === 0) continue;
      const lastPoint = validPoints[validPoints.length - 1];

      if (name === 'Percentage CPU' && lastPoint.average !== null && lastPoint.average !== undefined) {
        result.cpuUtilization = Math.round(lastPoint.average * 10) / 10;
      } else if (name === 'Available Memory Bytes' && lastPoint.average !== null && lastPoint.average !== undefined) {
        const memPercent = Math.round((1 - lastPoint.average / (8 * 1024 * 1024 * 1024)) * 100);
        result.memoryUtilization = Math.max(0, Math.min(100, memPercent));
      } else if (name === 'Disk Read Bytes' || name === 'Disk Write Bytes') {
        const bytes = lastPoint.total ?? lastPoint.average ?? 0;
        const percent = Math.min(100, Math.round((bytes / (100 * 1024 * 1024)) * 100));
        result.diskUtilization = percent;
      } else if (name === 'Network In Total' && lastPoint.total !== null && lastPoint.total !== undefined) {
        result.networkIn = Math.round((lastPoint.total / (1024 * 1024)) * 10) / 10;
      } else if (name === 'Network Out Total' && lastPoint.total !== null && lastPoint.total !== undefined) {
        result.networkOut = Math.round((lastPoint.total / (1024 * 1024)) * 10) / 10;
      }
    }
  } catch (err) {
    console.warn('[Azure Monitor] Telemetry query note:', err);
  }

  return result;
}
