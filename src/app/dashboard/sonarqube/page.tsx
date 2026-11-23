'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function RedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/jenkins?tab=sonarqube');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#070C18] text-cyan-400 gap-3 font-sans">
      <Loader2 className="w-6 h-6 animate-spin" />
      <span className="text-xs text-slate-300 font-semibold">Opening SonarQube in Jenkins DevOps Suite...</span>
    </div>
  );
}

export default function SonarQubeRedirect() {
  return (
    <Suspense fallback={null}>
      <RedirectContent />
    </Suspense>
  );
}
