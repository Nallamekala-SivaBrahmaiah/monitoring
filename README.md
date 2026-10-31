# Multi-Cloud Infrastructure Monitoring Platform

A production-grade, full-stack observability and monitoring platform for **AWS** and **Azure** infrastructure built as a single, unified **Next.js** application with **React**, **Tailwind CSS**, **MongoDB & Mongoose**, **AWS SDK v3**, **Azure SDK**, and **Prometheus**.

---

## 🚀 Key Features

### 1. Unified Single Next.js Architecture
- **Full-Stack Next.js**: No separate backend or Express server. Frontend pages and backend Route Handlers run inside a single Next.js App Router project using the Node.js runtime.
- **Direct Database & Cloud SDKs**: Next.js server Route Handlers connect directly to MongoDB via Mongoose and use server-side AWS SDK v3 and Azure SDK.

### 2. Strict Cloud Provider Isolation
- **All Clouds**: Unified dashboard with aggregated health metrics, cross-cloud compute status, and telemetry for both AWS and Azure.
- **AWS Strict Mode**: Complete isolation. Displays EC2 instances, AWS regions, and AWS alerts only. All Azure resources, regions, and subscriptions are hidden.
- **Azure Strict Mode**: Complete isolation. Displays Azure Virtual Machines, AKS clusters, Azure regions, and Azure alerts only. All AWS resources, accounts, and regions are hidden.
- **Dynamic Filter Synchronization**: Global state in React Context with `localStorage` persistence.

### 3. Real Azure Cloud Monitoring
- **Service Principal Authentication**: Validates credentials (`Subscription ID`, `Tenant ID`, `Client ID`, `Client Secret`) via `@azure/identity` `ClientSecretCredential`.
- **Dynamic Region Discovery**: Automatically queries the Azure Resource Manager Locations API (`/subscriptions/{subscriptionId}/locations`) and enables all available regions by default.
- **Real VM Telemetry**: Queries the Azure Monitor Metrics API for live CPU, memory, disk, and network metrics. Displays *"Metric unavailable"* when metrics are not present; never generates fake numbers.

### 4. Real AWS Cloud Monitoring
- **STS Verification**: Validates credentials using `GetCallerIdentityCommand`.
- **Dynamic EC2 Discovery**: Queries regions and active EC2 instances across monitored regions.

---

## ⚙️ Environment Variables

Create `.env.local` in the project root:

```env
# MongoDB Connection String
MONGODB_URI=mongodb://127.0.0.1:27017/monitoring

# Public API URL (Leave blank for same-origin Next.js Route Handlers)
NEXT_PUBLIC_API_BASE_URL=
```

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Start
```bash
npm run build
npm run start
```

### 4. Production Process Management (PM2)
```bash
pm2 start npm --name "monitoring-platform" -- start -- -p 3000
```
