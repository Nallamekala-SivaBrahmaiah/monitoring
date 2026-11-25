'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RotateCw } from 'lucide-react';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const dest = params ? `/dashboard/notifications?${params}` : '/dashboard/notifications?tab=send-notification';
    router.replace(dest);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#070C18] text-slate-100 flex items-center justify-center">
      <div className="flex items-center gap-2 text-cyan-400 text-sm">
        <RotateCw className="w-5 h-5 animate-spin" />
        <span>Redirecting to Notification Channels &amp; DevOps Activity...</span>
      </div>
    </div>
  );
}

export default function DevOpsActivityCenterRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
