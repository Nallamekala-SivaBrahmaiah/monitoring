# Multi-Cloud Infrastructure Monitoring Platform

A production-grade, full-stack observability and monitoring platform for **AWS** and **Azure** infrastructure built with **Next.js 16**, **React 19**, **Node.js Express**, **MongoDB**, **Prometheus**, **Docker Compose**, and **Nginx**.

Deployed at: **http://multicloudwithsiva.online** (Server Public IP: `20.235.241.140`)

---

## 🚀 Key Features

### 1. Strict Cloud Provider Isolation
- **All Clouds**: Unified dashboard with aggregated health metrics, cross-cloud compute status, and independent metric telemetry for both AWS and Azure.
- **AWS Strict Mode**: Complete isolation. Displays EC2 instances, EKS clusters, AWS Docker hosts, and AWS alerts only. All Azure resources, regions, and subscriptions are hidden.
- **Azure Strict Mode**: Complete isolation. Displays Azure Virtual Machines, AKS clusters, Azure Docker hosts, and Azure alerts only. All AWS resources, accounts, and regions are hidden.
- **Dynamic Filter Synchronization**: Global state in React Context with `localStorage` persistence. Switching providers resets conflicting account and region selections.

### 2. Multi-Cloud Resource Discovery & Monitoring
- **AWS Compute**: EC2 instance inventory, CPU, memory, disk, network, and status telemetry.
- **Azure Compute**: Virtual Machine inventory, power states, resource groups, and sizing metrics.
- **Containers & Kubernetes**: Docker container monitoring and EKS/AKS cluster health.
- **Alerting & Notification Engine**: Severity filtering, multi-channel alerting (Slack, PagerDuty, Webhooks, Email).

### 3. Backend & Database Filtering
- Full REST API with query parameters: `?provider=aws|azure|all&accountId=...&subscriptionId=...&region=...`.
- MongoDB `Resource` schema adhering to strict provider, account/subscription, and region boundaries.

---

## 🏗️ Architecture & Docker Deployment

The platform is containerized using `docker-compose.yml`:

```
Internet (multicloudwithsiva.online / 20.235.241.140)
       │
   [Port 80 / 443]
       ▼
 ┌───────────────────────────────────────┐
 │       Nginx Reverse Proxy             │
 └───────┬───────────────────────┬───────┘
         │ /                     │ /api/ & /metrics
         ▼                       ▼
 ┌───────────────┐       ┌───────────────┐
 │    Next.js    │       │ Express.js    │
 │   Frontend    │       │    Backend    │
 │  (Port 3000)  │       │  (Port 5000)  │
 └───────────────┘       └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │    MongoDB    │
                         │  (Port 27017) │
                         └───────────────┘
```

---

## 🛠️ Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed.

### 1. Clone the Repository
```bash
git clone https://github.com/Nallamekala-SivaBrahmaiah/monitoring.git
cd monitoring
```

### 2. Run with Docker Compose
```bash
docker compose up -d --build
```

### 3. Verify Containers
```bash
docker compose ps
```

Access the platform at:
- **Web UI**: `http://multicloudwithsiva.online` or `http://localhost`
- **Backend API**: `http://multicloudwithsiva.online/api/dashboard/overview`
- **Prometheus Metrics**: `http://multicloudwithsiva.online/metrics`

---

## 🔒 Free SSL Setup (HTTPS)

To enable Let's Encrypt SSL certificates for `multicloudwithsiva.online`:

```bash
docker compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d multicloudwithsiva.online -d www.multicloudwithsiva.online --email admin@multicloudwithsiva.online --agree-tos --no-eff-email
```

---

## 💻 Local Development

### Frontend (Next.js)
```bash
npm install
npm run dev
# Running on http://localhost:3000
```

### Backend (Express.js)
```bash
cd server
npm install
npm run dev
# Running on http://localhost:5000
```
