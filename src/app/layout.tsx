import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { MonitoringProvider } from '@/context/MonitoringContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Background3DCanvas } from '@/components/dashboard/Background3DCanvas';
import { NavigationScrollManager } from '@/components/navigation/NavigationScrollManager';
import { IndividualModuleStudioModal } from '@/components/dashboard/style-studio/IndividualModuleStudioModal';
import { GeminiDevOpsDrawer } from '@/components/dashboard/gemini/GeminiDevOpsDrawer';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('mcm_theme_config_v2');
                  if (saved) {
                    var c = JSON.parse(saved);
                    if (c.backgroundColor) {
                      document.documentElement.style.setProperty('--background', c.backgroundColor);
                      document.documentElement.style.setProperty('--card-bg', c.cardBackground || '#0D131F');
                      document.documentElement.style.setProperty('--card-border', c.borderColor || '#1E293B');
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <Suspense fallback={null}>
          <NavigationScrollManager />
        </Suspense>
        <ThemeProvider>
          <Background3DCanvas />
          <IndividualModuleStudioModal />
          <MonitoringProvider>
            {children}
            <Suspense fallback={null}>
              <GeminiDevOpsDrawer />
            </Suspense>
          </MonitoringProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
