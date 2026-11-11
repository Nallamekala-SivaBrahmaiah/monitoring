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
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              nextjs-portal,
              [data-nextjs-dev-tools-button],
              [data-nextjs-toast-wrapper] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                width: 0 !important;
                height: 0 !important;
                position: absolute !important;
                top: -9999px !important;
                left: -9999px !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function purgeNextDevOverlay() {
                  try {
                    var elms = document.querySelectorAll('nextjs-portal, [data-nextjs-dev-tools-button]');
                    for (var i = 0; i < elms.length; i++) {
                      elms[i].remove();
                    }
                  } catch (e) {}
                }
                if (typeof window !== 'undefined') {
                  purgeNextDevOverlay();
                  var obs = new MutationObserver(purgeNextDevOverlay);
                  if (document.documentElement) {
                    obs.observe(document.documentElement, { childList: true, subtree: true });
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-[#0b1120] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <MonitoringProvider>
          {children}
          <CloudOpsQuickHUD />
        </MonitoringProvider>
      </body>
    </html>
  );
}
