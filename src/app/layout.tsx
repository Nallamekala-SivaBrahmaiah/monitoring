import type { Metadata } from 'next';
import './globals.css';
import { MonitoringProvider } from '@/context/MonitoringContext';

export const metadata: Metadata = {
  title: 'Multi-Cloud Monitoring Platform | AWS & Azure Infrastructure',
  description: 'Real-time observability, server health, EC2 instances, Azure VMs, Docker containers, and Kubernetes metrics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0b1120] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <MonitoringProvider>{children}</MonitoringProvider>
      </body>
    </html>
  );
}
