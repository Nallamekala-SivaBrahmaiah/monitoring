import React from 'react';

// ==========================================
// 1. Core Cloud Provider Logos & Platform Brand
// ==========================================

export function MultiCloudBrandLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mcCloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4FF" />
          <stop offset="100%" stopColor="#0084FF" />
        </linearGradient>
        <linearGradient id="mcAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA826" />
          <stop offset="100%" stopColor="#FF9900" />
        </linearGradient>
      </defs>
      {/* Cloud Contour */}
      <path
        d="M48 45H19C14.03 45 10 40.97 10 36C10 31.34 13.53 27.51 18.1 27.06C18.55 19.35 24.85 13.5 32.95 13.5C40.15 13.5 45.99 18.45 47.34 25.2C51.84 25.65 55 29.25 55 33.75C55 40.05 50.5 45 48 45Z"
        stroke="url(#mcCloudGrad)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3 Internal Telemetry Bars */}
      <rect x="23.5" y="32" width="4.5" height="8" rx="2" fill="#0084FF" />
      <rect x="30" y="26" width="4.5" height="14" rx="2" fill="#00D4FF" />
      <rect x="36.5" y="20" width="4.5" height="20" rx="2" fill="url(#mcAmberGrad)" />
      {/* Orbiting AWS Amber Satellite Beacon */}
      <circle cx="50" cy="15" r="3.5" fill="url(#mcAmberGrad)" />
      <circle cx="50" cy="15" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

export function AwsLogo({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="awsBgGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#232F3E" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="awsBorderGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="awsSmileGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#FFA41C" />
        </linearGradient>
      </defs>
      {/* Sleek rounded squircle background */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill="url(#awsBgGrad_sb)"
        stroke="url(#awsBorderGrad_sb)"
        strokeWidth="1"
      />
      {/* High-precision AWS typography and iconic smile curve */}
      <g transform="translate(0.5, 5.8) scale(0.28)">
        <path
          d="M18 21.5c0 1 .1 1.8.5 2.5.3.6.7 1.2 1.1 1.7l-2.5 1.6c-.5-.6-.9-1.3-1.2-2-.3-.8-.5-1.8-.5-3 0-1.5.3-2.7 1-3.6.7-1 1.6-1.7 2.8-2.2 1.2-.5 2.7-.7 4.5-.7.9 0 1.8.1 2.7.2v-1.4c0-1.4-.3-2.5-1-3.1-.6-.6-1.7-1-3.1-1-1 0-1.9.2-2.9.4-1 .3-1.8.6-2.6 1.1l-1-2.2c1-.6 2.2-1.1 3.4-1.4 1.2-.3 2.4-.5 3.8-.5 2.4 0 4.2.6 5.3 1.6 1.1 1 1.7 2.7 1.7 5v8.4h-2.7l-.2-1.7c-.6.6-1.4 1.2-2.3 1.5-.9.3-1.8.5-3 .5-1.9 0-3.4-.5-4.5-1.4-1-.9-1.5-2.2-1.5-3.8 0-1.4.5-2.6 1.4-3.3 1-.8 2.3-1.3 4.1-1.4l3.8-.3v-.9c0-1-.2-1.7-.7-2.1-.5-.4-1.2-.6-2.2-.6-.9 0-1.7.2-2.4.5-.7.3-1.4.7-1.8 1.3l-1.4-1.8zm6.6 1.8v-1.8l-2.9.2c-1 .1-1.7.3-2.2.7-.5.4-.7 1-.7 1.7 0 .7.2 1.3.8 1.7.6.4 1.3.6 2.2.6.9 0 1.6-.2 2.2-.7.5-.5.6-1.3.6-2.4z"
          fill="#FFFFFF"
        />
        <path
          d="M35.5 25.5l-3.6-14h3.1l2.4 10.2 2.6-10.2h2.9l2.6 10.2 2.4-10.2h3.1l-3.6 14h-3.4l-2.6-9.8-2.6 9.8h-3.3z"
          fill="#FFFFFF"
        />
        <path
          d="M53.6 21.5c.6.3 1.3.6 2.1.9.8.2 1.6.3 2.4.3 1.2 0 2.2-.2 2.8-.6.6-.4 1-1 1-1.8 0-.6-.2-1.1-.7-1.5-.5-.4-1.3-.7-2.4-1.1-1.4-.5-2.6-1-3.3-1.5-.8-.6-1.1-1.4-1.1-2.6 0-1.4.6-2.5 1.7-3.3 1.1-.8 2.6-1.2 4.6-1.2 1 0 1.9.1 2.8.3.9.2 1.7.6 2.3 1l-1 2.2c-.6-.3-1.3-.6-1.9-.7-.6-.2-1.4-.2-2.1-.2-1.1 0-1.9.2-2.5.6-.6.4-.9 1-.9 1.7 0 .6.2 1 .7 1.4.5.3 1.3.6 2.4 1 1.5.5 2.6 1 3.3 1.6.8.6 1.1 1.4 1.1 2.6 0 1.4-.6 2.6-1.7 3.4-1.1.8-2.7 1.2-4.8 1.2-1.1 0-2.2-.2-3.3-.5-1-.3-1.9-.7-2.7-1.3l1-2.2z"
          fill="#FFFFFF"
        />
        <path
          d="M17.2 29.5c7.4 4.4 20.4 6.2 32.8 1 .5-.2 1 .3.6.7-11.8 8-27 5.2-34-.6-.3-.3 0-.9.6-.7z"
          fill="url(#awsSmileGrad_sb)"
        />
        <path
          d="M51.4 27.6c.6-.8 2.2-.6 3.3-.2.3.1.3.4.1.6-1.6 1.8-4.2 2.8-5 1.8-.4-.6.4-1.4 1.6-2.2z"
          fill="url(#awsSmileGrad_sb)"
        />
      </g>
    </svg>
  );
}

export function AzureLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="azBgGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F2744" />
          <stop offset="100%" stopColor="#0A192F" />
        </linearGradient>
        <linearGradient id="azBorderGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="azG1_sb" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#005BA1" />
          <stop offset="100%" stopColor="#0089D6" />
        </linearGradient>
        <linearGradient id="azG2_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EA0EF" />
          <stop offset="100%" stopColor="#0078D4" />
        </linearGradient>
      </defs>
      {/* Sleek rounded squircle background */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill="url(#azBgGrad_sb)"
        stroke="url(#azBorderGrad_sb)"
        strokeWidth="1"
      />
      {/* Official Microsoft Azure 3D Folded Ribbon */}
      <g transform="translate(5, 6.5) scale(0.055)">
        <path
          d="M118.4 187.7c32.9-5.8 60.1-10.6 60.4-10.7l.6-.1-31.1-36.9c-17.1-20.3-31.1-37-31.1-37.1 0-.2 32.1-88.5 32.2-88.8.1-.1 21.9 37.6 52.9 91.3 29 50.3 53 91.8 53.2 92.2l.4.7h-197.4l59.9-10.6z"
          fill="url(#azG1_sb)"
        />
        <path
          d="M0 176.4c0-.1 14.6-25.5 32.5-56.4l32.5-56.3 37.9-31.8C123.8 14.4 140.9 0 141 0c.1 0-.2.7-.6 1.5s-18.9 40.6-41.1 88.3l-40.4 86.7H0z"
          fill="url(#azG2_sb)"
        />
      </g>
    </svg>
  );
}

// ==========================================
// 2. Official Brand & DevOps Tool Logos
// ==========================================

export function MavenLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <defs>
        <linearGradient id="mvnFeather1_sb" x1="15%" y1="100%" x2="85%" y2="0%">
          <stop offset="0%" stopColor="#C32057" />
          <stop offset="25%" stopColor="#D92837" />
          <stop offset="50%" stopColor="#EB5729" />
          <stop offset="70%" stopColor="#EFA426" />
          <stop offset="100%" stopColor="#25A4D4" />
        </linearGradient>
        <linearGradient id="mvnFeather2_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#28B8D5" />
          <stop offset="40%" stopColor="#306EB2" />
          <stop offset="80%" stopColor="#6C3992" />
          <stop offset="100%" stopColor="#B3236A" />
        </linearGradient>
      </defs>
      {/* Quill / Central stem */}
      <path
        d="M20 85 C 35 65, 55 45, 82 15"
        stroke="#E6E8EC"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Left vane */}
      <path
        d="M82 15 C 65 20, 40 38, 25 65 C 22 72, 28 72, 33 67 C 42 56, 58 42, 82 15 Z"
        fill="url(#mvnFeather1_sb)"
      />
      {/* Right vane */}
      <path
        d="M82 15 C 75 32, 60 55, 38 78 C 34 83, 39 85, 45 80 C 60 66, 74 44, 82 15 Z"
        fill="url(#mvnFeather2_sb)"
      />
      {/* Detail highlights */}
      <path
        d="M62 30 C 50 42, 38 56, 28 70"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AnsibleLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="ansibleGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#ansibleGrad_sb)" />
      {/* Official Ansible 'A' lettermark */}
      <path
        d="M12 5.5L7 17.5h2.4l1.1-2.8h3.8l1.1 2.8H18L13 5.5h-1zm.5 2.7l1.3 3.6h-2.6l1.3-3.6z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function NginxLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className}>
      {/* Official Nginx Emerald Hexagon */}
      <path
        d="M16 2.5L28 9.5V22.5L16 29.5L4 22.5V9.5L16 2.5Z"
        fill="#009639"
      />
      {/* Central N symbol */}
      <path
        d="M11 21.5V10.5L13.8 10.5L21 19.5V10.5H23V21.5L20.2 21.5L13 12.5V21.5H11Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function DockerLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="dockGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#dockGrad_sb)" />
      {/* Official Docker Whale & Cargo Containers */}
      <g fill="#FFFFFF">
        <rect x="5.5" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="7.4" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="11.2" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="7.4" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="11.2" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="5.8" width="1.6" height="1.4" rx="0.2" />
        <path d="M18.8 11.4c-.4-.3-1.3-.4-2-.3-.1-.7-.5-1.3-1.1-1.7l-.4-.3-.3.4c-.5.7-.7 1.5-.5 2.3-.3.1-.7.2-1 .4H4.5c-.3 0-.5.2-.5.5 0 1.7.5 3.3 1.4 4.7 1.2 1.8 2.9 3 5 3.5 3.3.9 7 .5 9.9-1.1 2-1.1 3.5-3 4.1-5.3.2-.7.2-1.5.2-2.2 0-.3-.2-.7-.5-.9zm-6.2 3.8c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z" />
      </g>
    </svg>
  );
}

export function DockerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <g fill="#2496ED">
        <rect x="5.5" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="7.4" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="11.2" y="9.2" width="1.6" height="1.4" rx="0.2" />
        <rect x="7.4" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="11.2" y="7.5" width="1.6" height="1.4" rx="0.2" />
        <rect x="9.3" y="5.8" width="1.6" height="1.4" rx="0.2" />
        <path d="M18.8 11.4c-.4-.3-1.3-.4-2-.3-.1-.7-.5-1.3-1.1-1.7l-.4-.3-.3.4c-.5.7-.7 1.5-.5 2.3-.3.1-.7.2-1 .4H4.5c-.3 0-.5.2-.5.5 0 1.7.5 3.3 1.4 4.7 1.2 1.8 2.9 3 5 3.5 3.3.9 7 .5 9.9-1.1 2-1.1 3.5-3 4.1-5.3.2-.7.2-1.5.2-2.2 0-.3-.2-.7-.5-.9zm-6.2 3.8c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z" />
      </g>
    </svg>
  );
}

export function KubernetesLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="k8sGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#326CE5" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      {/* Official Kubernetes Heptagon */}
      <path
        d="M12 2.2L19.5 5.5L22 13L17.5 20L6.5 20L2 13L4.5 5.5L12 2.2Z"
        fill="url(#k8sGrad_sb)"
      />
      {/* Kubernetes Helm Steering Wheel */}
      <circle cx="12" cy="12" r="5.8" stroke="#FFFFFF" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="1.1" fill="#326CE5" />
      {/* 7 Spoke handles */}
      <path
        d="M12 4.8v2.6M16.8 7l-1.8 1.9M18.2 12.3l-2.5-.4M15.2 17l-1.8-1.9M8.8 17l1.8-1.9M5.8 12.3l2.5-.4M7.2 7l1.8 1.9"
        stroke="#FFFFFF"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function KubernetesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return <KubernetesLogo className={className} />;
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

// ==========================================
// 3. Official Cloud Compute Badges
// ==========================================

export function Ec2Icon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="ec2Grad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#EC7211" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ec2Grad_sb)" />
      {/* AWS Compute Chevron Brackets < > */}
      <path
        d="M7 8L4.5 12L7 16"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 8L19.5 12L17 16"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Server Processor Core */}
      <rect x="8.5" y="8" width="7" height="8" rx="1.2" fill="#FFFFFF" fillOpacity="0.95" />
      <line x1="10" y1="10" x2="14" y2="10" stroke="#EC7211" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="10" y1="12" x2="14" y2="12" stroke="#EC7211" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="10" y1="14" x2="14" y2="14" stroke="#EC7211" strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

export const AwsEc2Logo = Ec2Icon;

export function AzureVmIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="azVmGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0078D4" />
          <stop offset="100%" stopColor="#005A9E" />
        </linearGradient>
        <linearGradient id="azScreenGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EA0EF" />
          <stop offset="100%" stopColor="#0078D4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#azVmGrad_sb)" />
      {/* Host Monitor */}
      <rect x="4.5" y="4.5" width="15" height="11" rx="1.5" fill="url(#azScreenGrad_sb)" stroke="#FFFFFF" strokeWidth="0.9" />
      {/* Virtual Machine Layer */}
      <rect x="7" y="6.5" width="10" height="7" rx="1" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="8.5" y="8" width="7" height="4" rx="0.5" fill="#0078D4" />
      <line x1="10" y1="9.5" x2="12" y2="9.5" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="10" y1="10.7" x2="14" y2="10.7" stroke="#5EA0EF" strokeWidth="0.8" strokeLinecap="round" />
      {/* Monitor base */}
      <path d="M12 15.5v2.5M9.5 18h5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export const AzureVmLogo = AzureVmIcon;

// ==========================================
// 4. Specialized Dashboard & Module Icons
// ==========================================

export function DashboardIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="dashGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#dashGrad_sb)" />
      {/* 4 Mission Control Metric Tiles */}
      <rect x="5" y="5" width="6" height="5.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.95" />
      <rect x="13" y="5" width="6" height="5.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M14.5 8h3M14.5 6.5h1.8" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
      <rect x="5" y="12.5" width="6" height="6.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M6.5 16.5l1.5-2 1.2 1.2 1.8-2" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="13" y="12.5" width="6" height="6.5" rx="1.2" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="16" cy="15.75" r="1.3" fill="#2563EB" />
    </svg>
  );
}

export function CloudAccountsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="cloudAccGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="cloudAccBorder_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0078D4" />
        </linearGradient>
        <linearGradient id="cloudAccGold_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#cloudAccGrad_sb)" stroke="url(#cloudAccBorder_sb)" strokeWidth="1" />
      {/* Cloud silhouette */}
      <path
        d="M6.5 14.2a2.8 2.8 0 01-.3-5.5 3.8 3.8 0 017.2-1.4 3.2 3.2 0 013.8 3.2 2.8 2.8 0 01-.7 5.7H6.5z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      {/* Multi-cloud key / security check */}
      <circle cx="11.5" cy="11" r="1.3" fill="#0078D4" />
      <path d="M11.5 12.3v2M10.5 13.5h2" stroke="#0078D4" strokeWidth="1" strokeLinecap="round" />
      {/* Verified cloud badge */}
      <circle cx="16.5" cy="7" r="2.2" fill="url(#cloudAccGold_sb)" />
      <path d="M15.5 7l.7.7 1.3-1.4" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RegionsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="regGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#regGrad_sb)" />
      {/* Global coordinate globe */}
      <circle cx="12" cy="12" r="6.8" stroke="#FFFFFF" strokeWidth="1.2" />
      {/* Latitude lines */}
      <path d="M5.5 12h13" stroke="#FFFFFF" strokeWidth="0.9" strokeOpacity="0.8" />
      <path d="M7 8.8c1.5.7 3.1 1 5 1s3.5-.3 5-1" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.65" />
      <path d="M7 15.2c1.5-.7 3.1-1 5-1s3.5.3 5 1" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.65" />
      {/* Longitude meridian */}
      <ellipse cx="12" cy="12" rx="3.3" ry="6.8" stroke="#FFFFFF" strokeWidth="0.9" strokeOpacity="0.8" />
      {/* Glowing regional beacon node */}
      <circle cx="14.5" cy="9.5" r="1.6" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.8" />
    </svg>
  );
}

export function ServersFleetIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="srvGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#srvGrad_sb)" stroke="#475569" strokeWidth="0.8" />
      {/* Top Server Blade */}
      <rect x="4.5" y="5" width="15" height="5.5" rx="1.2" fill="#1E293B" stroke="#64748B" strokeWidth="0.8" />
      <line x1="6.5" y1="7.75" x2="10.5" y2="7.75" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
      <circle cx="15.5" cy="7.75" r="0.9" fill="#10B981" />
      <circle cx="17.5" cy="7.75" r="0.9" fill="#38BDF8" />
      {/* Bottom Server Blade */}
      <rect x="4.5" y="13.5" width="15" height="5.5" rx="1.2" fill="#1E293B" stroke="#64748B" strokeWidth="0.8" />
      <line x1="6.5" y1="16.25" x2="10.5" y2="16.25" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
      <circle cx="15.5" cy="16.25" r="0.9" fill="#10B981" />
      <circle cx="17.5" cy="16.25" r="0.9" fill="#38BDF8" />
    </svg>
  );
}

export function SchedulingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="schedGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#schedGrad_sb)" />
      {/* Calendar body */}
      <rect x="4.5" y="5.5" width="15" height="13.5" rx="1.8" fill="#FFFFFF" fillOpacity="0.2" stroke="#FFFFFF" strokeWidth="0.9" />
      <line x1="4.5" y1="9" x2="19.5" y2="9" stroke="#FFFFFF" strokeWidth="0.9" />
      {/* Calendar binder pegs */}
      <line x1="8" y1="4" x2="8" y2="6.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="16" y1="4" x2="16" y2="6.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
      {/* Embedded Automation Clock */}
      <circle cx="12" cy="14" r="3.8" fill="#FFFFFF" fillOpacity="0.95" />
      <path d="M12 12.2v1.8l1.3.8" stroke="#6366F1" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricsExplorerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="metricsGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#metricsGrad_sb)" />
      {/* Waveform Sparkline */}
      <path
        d="M4.5 14L8 14L10.5 8L13.5 16L16 11L18 13.5L19.5 13.5"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pulse Peak Nodes */}
      <circle cx="10.5" cy="8" r="1.6" fill="#FFFFFF" />
      <circle cx="16" cy="11" r="1.2" fill="#FFFFFF" fillOpacity="0.8" />
    </svg>
  );
}

export function AlertsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="alertsGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#alertsGrad_sb)" />
      {/* Warning Triangle */}
      <path
        d="M12 5.5L4.5 18H19.5L12 5.5Z"
        fill="#FFFFFF"
      />
      <path
        d="M12 9.5v4"
        stroke="#EF4444"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="0.9" fill="#EF4444" />
    </svg>
  );
}

export function NotificationChannelsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="notifGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#notifGrad_sb)" />
      {/* Chime Bell */}
      <path
        d="M11 6a3 3 0 013 3v2.5l1.5 2H6.5L8 11.5V9a3 3 0 013-3z"
        fill="#FFFFFF"
      />
      <path
        d="M9.5 15.5a1.5 1.5 0 003 0"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Broadcast waves */}
      <path
        d="M16.5 8.5a4 4 0 010 5M18.5 7a6.5 6.5 0 010 8"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SettingsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="settingsGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#settingsGrad_sb)" stroke="#64748B" strokeWidth="0.8" />
      {/* Precision Cog */}
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        fill="#FFFFFF"
      />
      <path
        d="M19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V19a2 2 0 01-4 0v-.09A1.65 1.65 0 009 17.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="#FFFFFF"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function NotificationsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="notifFeedGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#notifFeedGrad_sb)" />
      {/* Bell silhouette */}
      <path
        d="M12 6a3 3 0 00-3 3v2.5L7.5 14h9L15 11.5V9a3 3 0 00-3-3z"
        fill="#FFFFFF"
      />
      <path
        d="M10.2 15.5a1.8 1.8 0 003.6 0"
        stroke="#FFFFFF"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Pulse beacon dot */}
      <circle cx="17.5" cy="6.5" r="2.2" fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.8" />
    </svg>
  );
}

export function MonitoringOverviewIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="monGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#monGrad_sb)" />
      {/* Pulse Heartbeat / Health line */}
      <path
        d="M4.5 12h3l1.8-4 2.8 8 2.2-5.5 1.5 2.5 3.7-.8"
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.3" cy="8" r="1.2" fill="#34D399" />
    </svg>
  );
}

export function LogsIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <defs>
        <linearGradient id="logsGrad_sb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#logsGrad_sb)" />
      {/* Terminal prompt symbol */}
      <path
        d="M6 8l3 2.5-3 2.5"
        stroke="#FFFFFF"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Console line cursor */}
      <line x1="11" y1="13" x2="15" y2="13" stroke="#A5B4FC" strokeWidth="1.5" strokeLinecap="round" />
      {/* Additional log entries */}
      <line x1="6" y1="16.5" x2="17.5" y2="16.5" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
