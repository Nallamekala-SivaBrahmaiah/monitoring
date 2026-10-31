import React from 'react';

export function AwsLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 30" fill="none" className={className}>
      <path
        d="M17.4 17.6c-2.4 1.8-6.1 2.8-9.1 2.8-4.3 0-8.2-1.6-11.1-4.2-.3-.2-.1-.6.3-.5 3.1 1.6 6.9 2.6 10.8 2.6 2.7 0 5.8-.8 8.6-2.2.5-.3.9.2.5.5zm1.5-1.1c-.4-.5-2.6-.3-3.6-.2-.3 0-.4-.2-.1-.4 1.8-1.3 4.8-1 5.3-.3.4.6-.2 3.5-1.9 5.1-.3.3-.5.1-.4-.2.4-1.2.9-3.4.7-4z"
        fill="#FF9900"
      />
      <path
        d="M10.8 12.3c.4 1.3 1.5 2.1 3 2.1 1.4 0 2.4-.7 3-1.6l2.1 1.4c-1.1 1.6-3 2.6-5.2 2.6-3.2 0-5.4-2.1-5.4-5.4 0-3.4 2.3-5.5 5.5-5.5 2.1 0 4 1 5.1 2.6l-2.1 1.4c-.6-.9-1.6-1.5-3-1.5-1.5 0-2.6.9-3 2.3v1.6zm13.7-6.2h2.5l3.8 10.4h-2.6l-.8-2.4h-3.4l-.8 2.4h-2.5l3.8-10.4zm2.1 6l-1-3.2-1 3.2h2zm7.9-6l1.9 6.8 1.9-6.8h2.3l2 6.8 1.9-6.8h2.5l-3.2 10.4h-2.4l-2-6.5-2 6.5h-2.4L32 6.1h2.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AzureLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" fill="currentColor" className={className}>
      <path
        d="M52.3 8.2l-21.6 39 17.5 22.8c2.2 2.9 6.6 2.4 8.1-.9l23.5-52c1.7-3.8-1.7-8-5.8-7.7l-21.7 1.2c-.3 0-.5.1-.7.2l.7-2.6z"
        fill="#0078D4"
      />
      <path
        d="M33.8 42.1L8.3 78.4C6.5 81 8.4 84.6 11.6 84.6h38.7c2.3 0 4.3-1.3 5.3-3.3l6.5-14.4-28.3-24.8z"
        fill="#5EA0EF"
      />
      <path
        d="M48.2 70.1L30.7 47.3l21.6-39.1c.2-.4.7-.6 1.1-.6h.5c4.1-.3 7.5 3.9 5.8 7.7l-23.5 52c-1.5 3.3-5.9 3.8-8.1.9z"
        fill="#0089D6"
      />
    </svg>
  );
}

export function Ec2Icon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded bg-[#FF9900]/20 text-[#FF9900] ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M7 9h10M7 12h10M7 15h10" />
      </svg>
    </div>
  );
}

export function EksIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded bg-[#FF9900]/20 text-[#FF9900] ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
      </svg>
    </div>
  );
}

export function AzureVmIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded bg-[#0089D6]/20 text-[#0089D6] ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    </div>
  );
}

export function AksIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded bg-[#0089D6]/20 text-[#0089D6] ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="4" />
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    </div>
  );
}

export function DockerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.186.185.186zm-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.186.185.186zm-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.186.186.186zm5.893 2.715h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185zm-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185zm-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H5.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185zm-2.928 0h2.12a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186H2.208a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185zm21.616 2.47c-.514-.373-1.635-.558-2.617-.468-.135-.88-.636-1.66-1.393-2.22l-.467-.34-.343.468c-.642.875-.883 1.94-.672 2.98-.445.148-.908.33-1.37.545H1.365a.692.692 0 00-.69.69c0 2.213.626 4.316 1.764 6.09 1.488 2.316 3.738 3.977 6.335 4.675 4.305 1.157 9.176.626 13.003-1.42 2.65-1.417 4.54-3.86 5.32-6.88.24-.925.32-1.92.24-2.895-.03-.38-.28-.9-.63-1.22z" />
    </svg>
  );
}

export function KubernetesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.64 5.64l4.24 4.24M14.12 14.12l4.24 4.24M5.64 18.36l4.24-4.24M14.12 9.88l4.24-4.24" />
    </svg>
  );
}
