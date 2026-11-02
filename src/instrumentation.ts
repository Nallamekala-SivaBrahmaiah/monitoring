export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startMonitoringScheduler } = await import('@/lib/monitoring/scheduler');
    startMonitoringScheduler();

    const { startTerminalWebSocketServer } = await import('@/lib/terminal/wsTerminalServer');
    startTerminalWebSocketServer();
  }
}

