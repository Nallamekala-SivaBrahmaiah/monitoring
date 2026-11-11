export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMonitoringScheduler, startDedicatedServerScheduler } = await import('@/lib/monitoring/scheduler');
    startMonitoringScheduler();
    startDedicatedServerScheduler();

    const { startTerminalWebSocketServer } = await import('@/lib/terminal/wsTerminalServer');
    startTerminalWebSocketServer();
  }
}

