import type { Metadata } from 'next';
import './globals.css';
import { MonitoringProvider } from '@/context/MonitoringContext';
import { CloudOpsQuickHUD } from '@/components/dashboard/CloudOpsQuickHUD';

export const metadata: Metadata = {
  title: 'Multi-Cloud Monitoring Platform | AWS & Azure Infrastructure',
  description: 'Real-time observability, server health, EC2 instances, Azure VMs, Docker containers, and Kubernetes metrics.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b1120] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <MonitoringProvider>
          {children}
          <CloudOpsQuickHUD />
        </MonitoringProvider>
      </body>
    </html>
  );
}
