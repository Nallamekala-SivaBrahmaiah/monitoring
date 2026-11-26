const nodemailer = require('nodemailer');

const GMAIL_USER = 'nallasiva552@gmail.com';
const GMAIL_APP_PASSWORD = 'popz ptkh bdtu glqc';

const RECIPIENTS = [
  'nallasiva552@gmail.com',
  'nallamekalasivabrahmaiah7@gmail.com'
];

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD.replace(/\s+/g, '')
  },
  tls: { rejectUnauthorized: false }
});

const BASE_URL = 'https://multicloudwithsiva.online';

// ============================================================================
// 10 DISTINCT PROFESSIONAL EMAIL MODELS WITH INLINE CSS
// ============================================================================

const models = [
  // --------------------------------------------------------------------------
  // MODEL 1: CYBER COMMAND (Datadog & PagerDuty Dark Glass)
  // --------------------------------------------------------------------------
  {
    name: 'Model 1: Cyber Command (Datadog / PagerDuty Dark Glass)',
    subject: '[Model 1 - Cyber Command] CRITICAL: Docker Container Stopped (auth-service) on vm01siva-mon',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#030712;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#030712;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#0F172A;border:1px solid #1E293B;border-radius:14px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:22px 24px;background:linear-gradient(90deg,#450A0A,#0F172A);border-bottom:2px solid #EF4444;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#7F1D1D;color:#FCA5A5;border:1px solid #EF4444;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:0.8px;">
                      CRITICAL INCIDENT #INC-9481
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#94A3B8;font-family:monospace;">EXIT STATUS: CODE 137</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">
                      Docker Container Stopped: <span style="color:#EF4444;font-family:monospace;">auth-microservice-prod</span>
                    </h2>
                    <p style="margin:6px 0 0 0;font-size:12px;color:#94A3B8;">
                      Host: <strong style="color:#60A5FA;">vm01siva-mon (4.240.105.247)</strong> &bull; Azure centralindia
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- 3-stat Grid -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td width="32%" style="background-color:#090E1A;border:1px solid #1E293B;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Exit Status</div>
                    <div style="font-size:15px;font-weight:bold;color:#EF4444;font-family:monospace;margin-top:4px;">SIGKILL (137)</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#090E1A;border:1px solid #1E293B;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Failure Type</div>
                    <div style="font-size:15px;font-weight:bold;color:#F59E0B;margin-top:4px;">OOMKilled</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#090E1A;border:1px solid #1E293B;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Max Memory</div>
                    <div style="font-size:15px;font-weight:bold;color:#FFFFFF;font-family:monospace;margin-top:4px;">1024 MB Limit</div>
                  </td>
                </tr>
              </table>

              <!-- Root Cause Card -->
              <div style="background-color:#090E1A;border:1px solid #1D4ED8;border-radius:10px;padding:14px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#60A5FA;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  &#128269; Why Did This Happen (Root Cause)
                </div>
                <div style="font-size:13px;color:#CBD5E1;line-height:1.5;">
                  Container consumed 1024 MB during JWT crypto signing batch jobs, exceeding the configured Docker memory ceiling. The Linux kernel OOM-Killer terminated the process with SIGKILL (Exit 137).
                </div>
                <div style="font-size:11px;color:#FCD34D;font-family:monospace;margin-top:8px;padding-top:8px;border-top:1px solid #1E293B;">
                  &#128205; <strong>Location To Fix:</strong> /home/siva/monitoring/docker-compose.yml (Service: auth)
                </div>
              </div>

              <!-- Terminal Commands Card -->
              <div style="background-color:#090E1A;border:1px solid #059669;border-radius:10px;padding:14px;margin-bottom:20px;">
                <div style="font-size:11px;font-weight:bold;color:#34D399;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">
                  &gt;_ How To Solve (SSH Commands)
                </div>
                <pre style="margin:0;padding:10px;background-color:#020617;border:1px solid #1E293B;border-radius:6px;color:#38BDF8;font-family:monospace;font-size:12px;line-height:1.6;overflow-x:auto;"># 1. View container exit crash log
docker logs --tail 40 auth-microservice-prod

# 2. Restart container with higher memory
docker start auth-microservice-prod

# 3. Inspect live stats
docker stats --no-stream auth-microservice-prod</pre>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 28px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;box-shadow:0 4px 15px rgba(37,99,235,0.4);">
                  Inspect in Monitoring Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px;background-color:#090E1A;border-top:1px solid #1E293B;text-align:center;font-size:11px;color:#64748B;">
              Multi-Cloud DevOps Monitoring &bull; Automated Real-Time Dispatcher
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 2: MODERN CLEAN TECH (GitHub Actions / Stripe Style)
  // --------------------------------------------------------------------------
  {
    name: 'Model 2: Modern Clean Tech (GitHub Actions / Stripe)',
    subject: '[Model 2 - Clean Tech] WARNING: High CPU Utilization on vm01siva-mon reached 82.4%',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0F1D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0F1D;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#131B2E;border:1px solid #2A364F;border-radius:14px;overflow:hidden;box-shadow:0 15px 30px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #232E42;">
              <table width="100%">
                <tr>
                  <td>
                    <h3 style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;">Infrastructure Alert Notice</h3>
                    <p style="margin:3px 0 0 0;font-size:12px;color:#94A3B8;">High CPU Utilization Threshold Exceeded</p>
                  </td>
                  <td align="right">
                    <span style="display:inline-block;padding:5px 12px;background-color:#78350F;color:#FCD34D;border:1px solid #F59E0B;border-radius:20px;font-size:11px;font-weight:bold;">
                      WARNING 82.4%
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <div style="background-color:#0E1524;border:1px solid #222C3E;border-radius:10px;padding:16px;margin-bottom:20px;">
                <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Incident Summary</div>
                <div style="font-size:16px;font-weight:bold;color:#FFFFFF;margin-top:4px;">
                  CPU usage on <span style="color:#F59E0B;">vm01siva-mon</span> reached <span style="color:#EF4444;font-family:monospace;">82.4%</span> (Threshold: 70%)
                </div>
              </div>

              <!-- Key Value Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:20px;font-size:13px;">
                <tr style="border-bottom:1px solid #1E293B;">
                  <td style="padding:10px 0;color:#94A3B8;">Server &amp; Host</td>
                  <td align="right" style="padding:10px 0;color:#FFFFFF;font-weight:600;font-family:monospace;">vm01siva-mon (4.240.105.247)</td>
                </tr>
                <tr style="border-bottom:1px solid #1E293B;">
                  <td style="padding:10px 0;color:#94A3B8;">Cloud Provider</td>
                  <td align="right" style="padding:10px 0;color:#60A5FA;font-weight:600;">Azure &bull; Central India</td>
                </tr>
                <tr style="border-bottom:1px solid #1E293B;">
                  <td style="padding:10px 0;color:#94A3B8;">Root Cause</td>
                  <td align="right" style="padding:10px 0;color:#FCD34D;max-width:320px;line-height:1.4;">Next.js Turbopack build compiling TypeScript modules concurrently.</td>
                </tr>
                <tr style="border-bottom:1px solid #1E293B;">
                  <td style="padding:10px 0;color:#94A3B8;">Fix Location</td>
                  <td align="right" style="padding:10px 0;color:#38BDF8;font-family:monospace;">/home/siva/monitoring</td>
                </tr>
              </table>

              <!-- Terminal -->
              <div style="background-color:#080C14;border:1px solid #1E293B;border-radius:8px;padding:14px;margin-bottom:20px;">
                <div style="font-size:11px;color:#94A3B8;margin-bottom:6px;font-family:monospace;">Quick Action Terminal:</div>
                <pre style="margin:0;color:#34D399;font-family:monospace;font-size:12px;line-height:1.5;">ps aux --sort=-%cpu | head -10
pm2 restart monitoring-app</pre>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:10px 24px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
                  View in Monitoring Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#0B101D;border-top:1px solid #1E293B;text-align:center;font-size:11px;color:#64748B;">
              Multi-Cloud Monitoring Platform &bull; Automated Alert
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 3: SRE INCIDENT BRIEF (Grafana / CloudWatch On-Call Runbook)
  // --------------------------------------------------------------------------
  {
    name: 'Model 3: SRE Incident Brief (Grafana / CloudWatch Runbook)',
    subject: '[Model 3 - SRE Runbook] [ALERTING] KUBERNETES POD CRASH: payment-gateway (CrashLoopBackOff)',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#050811;font-family:monospace;color:#E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050811;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#0A0E17;border:2px solid #EF4444;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:16px 20px;background-color:#450A0A;border-bottom:1px solid #7F1D1D;">
              <table width="100%">
                <tr>
                  <td><strong style="color:#FCA5A5;font-size:14px;letter-spacing:1px;">[ALERTING] KUBERNETES POD CRASH</strong></td>
                  <td align="right" style="color:#CBD5E1;font-size:11px;">UTC: ${new Date().toISOString().substring(11, 19)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;font-size:12px;line-height:1.6;">
              <div style="margin-bottom:16px;background-color:#020617;padding:12px;border:1px solid #1E293B;border-radius:6px;">
                <div><strong style="color:#94A3B8;">TARGET:</strong> <span style="color:#FFFFFF;">payment-gateway-7f89bc9-4k2x1</span></div>
                <div><strong style="color:#94A3B8;">NAMESPACE:</strong> <span style="color:#38BDF8;">production</span></div>
                <div><strong style="color:#94A3B8;">CLUSTER/HOST:</strong> <span style="color:#FFFFFF;">vm01siva-mon (Azure centralindia)</span></div>
                <div><strong style="color:#94A3B8;">STATE:</strong> <span style="color:#EF4444;font-weight:bold;">CrashLoopBackOff (Restart Count: 5)</span></div>
              </div>

              <!-- Root Cause -->
              <div style="background-color:#020617;border:1px solid #D97706;border-radius:6px;padding:12px;margin-bottom:16px;">
                <div style="color:#FCD34D;font-weight:bold;margin-bottom:4px;">ROOT CAUSE DIAGNOSIS:</div>
                <div style="color:#CBD5E1;">Pod entrypoint crashed with exit code 1. Exception: <code>Cannot read properties of undefined (reading 'PAYMENT_SECRET_KEY')</code>.</div>
                <div style="color:#38BDF8;margin-top:6px;">WHERE TO FIX: ConfigMap / Secret: <code>k8s/secrets/payment-secrets.yaml</code></div>
              </div>

              <!-- Runbook -->
              <div style="background-color:#020617;border:1px solid #059669;border-radius:6px;padding:12px;margin-bottom:20px;">
                <div style="color:#34D399;font-weight:bold;margin-bottom:6px;">SRE REMEDIATION RUNBOOK:</div>
                <div style="color:#94A3B8;">1. Inspect previous crash logs:</div>
                <div style="color:#38BDF8;margin:2px 0 8px 0;">kubectl logs payment-gateway-7f89bc9-4k2x1 -n production --previous</div>
                <div style="color:#94A3B8;">2. Rollback to last healthy release:</div>
                <div style="color:#38BDF8;margin-top:2px;">kubectl rollout undo deployment/payment-gateway -n production</div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/kubernetes" style="display:inline-block;padding:10px 22px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:4px;font-weight:bold;font-size:12px;">
                  ACKNOWLEDGE &amp; OPEN KUBERNETES &rarr;
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 4: VISUAL GAUGE & METRIC BAR CARD
  // --------------------------------------------------------------------------
  {
    name: 'Model 4: Visual Gauge & Metric Bar Card',
    subject: '[Model 4 - Visual Gauge] CRITICAL: Server Memory Utilization at 88.5% on vm01siva-mon',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#070C18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#070C18;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#0E1526;border:1px solid #1E2B45;border-radius:14px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:22px 24px;background-color:#131D33;border-bottom:1px solid #1E2B45;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="padding:4px 10px;background-color:#4C1D95;color:#DDD6FE;border:1px solid #8B5CF6;border-radius:6px;font-size:11px;font-weight:bold;">
                      SERVER CAPACITY METRIC &bull; vm01siva-mon
                    </span>
                  </td>
                  <td align="right">
                    <span style="padding:4px 10px;background-color:#7F1D1D;color:#FCA5A5;border:1px solid #EF4444;border-radius:6px;font-size:11px;font-weight:bold;font-family:monospace;">
                      CRITICAL 88.5%
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:20px;font-weight:bold;color:#FFFFFF;">RAM Memory Threshold Exceeded</h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- Progress Bar Gauge -->
              <div style="background-color:#080D1A;border:1px solid #1E2B45;border-radius:10px;padding:16px;margin-bottom:18px;">
                <table width="100%" style="font-size:12px;margin-bottom:8px;">
                  <tr>
                    <td style="color:#94A3B8;">Current RAM Usage:</td>
                    <td align="right" style="color:#EF4444;font-weight:bold;font-family:monospace;font-size:16px;">
                      88.5% <span style="font-size:11px;color:#64748B;">(7.1 GB / 8.0 GB)</span>
                    </td>
                  </tr>
                </table>
                <!-- Gauge Bar -->
                <div style="background-color:#1E293B;height:12px;border-radius:6px;overflow:hidden;">
                  <div style="width:88.5%;height:100%;background:linear-gradient(90deg,#F59E0B,#EF4444);border-radius:6px;"></div>
                </div>
                <table width="100%" style="font-size:10px;font-family:monospace;color:#64748B;margin-top:4px;">
                  <tr>
                    <td>0%</td>
                    <td align="center" style="color:#F59E0B;">70% Warning Threshold</td>
                    <td align="right">100%</td>
                  </tr>
                </table>
              </div>

              <!-- 2-Col Diagnosis Cards -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td width="49%" style="vertical-align:top;background-color:#080D1A;border:1px solid #1E2B45;border-radius:10px;padding:12px;">
                    <div style="font-size:11px;font-weight:bold;color:#60A5FA;margin-bottom:4px;">&#10067; Why Did It Increase?</div>
                    <div style="font-size:12px;color:#CBD5E1;line-height:1.4;">
                      V8 Node.js heap expansion during continuous metrics polling + system buffers cache not reclaimed.
                    </div>
                  </td>
                  <td width="2%"></td>
                  <td width="49%" style="vertical-align:top;background-color:#080D1A;border:1px solid #1E2B45;border-radius:10px;padding:12px;">
                    <div style="font-size:11px;font-weight:bold;color:#34D399;margin-bottom:4px;">&#128295; Where &amp; How To Fix?</div>
                    <div style="font-size:12px;color:#CBD5E1;line-height:1.4;">
                      <strong>Location:</strong> /home/siva/monitoring<br>
                      <strong>Fix:</strong> Clear OS drop_caches and restart PM2 worker.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- CLI Box -->
              <div style="background-color:#020617;border:1px solid #1E293B;border-radius:8px;padding:12px;margin-bottom:20px;font-family:monospace;font-size:12px;color:#38BDF8;">
                <div style="font-size:10px;color:#64748B;margin-bottom:4px;"># Flush memory caches &amp; reload:</div>
                <div>sudo sync; sudo echo 3 &gt; /proc/sys/vm/drop_caches</div>
                <div>pm2 restart monitoring-app</div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 26px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">
                  Inspect Server in Monitoring Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#080D1A;border-top:1px solid #1E2B45;text-align:center;font-size:11px;color:#64748B;">
              Multi-Cloud Monitoring Platform &bull; Automated Capacity Guard
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 5: AWS CLOUDWATCH OPERATIONS CENTER (AWS Orange Style)
  // --------------------------------------------------------------------------
  {
    name: 'Model 5: AWS CloudWatch Operations Center (AWS Style)',
    subject: '[Model 5 - AWS CloudWatch] ALARM: DiskStorageExceeded (/dev/root at 91.4%) on EC2 vm01siva-mon',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0F141C;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#EAEDED;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0F141C;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#161E2E;border:1px solid #232F3E;border-radius:12px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:20px 24px;background-color:#232F3E;border-bottom:3px solid #FF9900;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#FF9900;color:#0F141C;border-radius:4px;font-size:11px;font-weight:bold;">
                      AWS CLOUDWATCH ALARM
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#FF9900;font-family:monospace;font-weight:bold;">STATE: ALARM</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:10px;">
                    <h2 style="margin:0;font-size:19px;font-weight:bold;color:#FFFFFF;">
                      Alarm: HighDiskUtilization (/dev/root &gt; 85%)
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#AAB7B8;">
                      Instance: <strong style="color:#FFFFFF;">i-09ab12cd34ef56789 (vm01siva-mon)</strong> &bull; Region: centralindia
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <div style="background-color:#0D1117;border:1px solid #30363D;border-radius:8px;padding:14px;margin-bottom:16px;">
                <div style="font-size:11px;color:#8B949E;text-transform:uppercase;font-family:monospace;">Metric Alarm Reason</div>
                <div style="font-size:13px;color:#F0F6FC;margin-top:4px;line-height:1.5;">
                  Threshold Crossed: 1 datapoint [91.4%] was greater than or equal to the threshold (85.0%). Disk space on root mount <code>/</code> is critically low (2.4 GB remaining of 30 GB).
                </div>
              </div>

              <!-- Why it happened -->
              <div style="background-color:#0D1117;border-left:4px solid #FF9900;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#FF9900;margin-bottom:4px;">&#128269; ROOT CAUSE ANALYSIS</div>
                <div style="font-size:12px;color:#C9D1D9;line-height:1.5;">
                  Next.js repeated build cache (<code>.next/cache</code>: 12 GB) and Docker build layers (<code>/var/lib/docker</code>: 9 GB) filled root partition storage.
                </div>
                <div style="font-size:11px;color:#58A6FF;font-family:monospace;margin-top:6px;">
                  Location To Fix: /home/siva/monitoring &amp; /var/log/journal
                </div>
              </div>

              <!-- CLI Remediation -->
              <div style="background-color:#05070A;border:1px solid #30363D;border-radius:6px;padding:12px;margin-bottom:20px;font-family:monospace;font-size:12px;color:#7EE787;">
                <div style="font-size:10px;color:#8B949E;margin-bottom:4px;"># Free disk space immediately:</div>
                <div>rm -rf /home/siva/monitoring/.next/cache</div>
                <div>sudo journalctl --vacuum-time=2d</div>
                <div>docker system prune -af</div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 24px;background-color:#FF9900;color:#0F141C;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
                  Inspect in AWS Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#0D1117;border-top:1px solid #232F3E;text-align:center;font-size:11px;color:#8B949E;">
              Amazon Web Services &bull; CloudWatch Operations Center
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 6: DEVOPS CI/CD PIPELINE FAILURE (Jenkins / GitLab CI)
  // --------------------------------------------------------------------------
  {
    name: 'Model 6: DevOps CI/CD Pipeline (Jenkins / GitLab CI)',
    subject: '[Model 6 - CI/CD Pipeline] BUILD FAILED: Jenkins Pipeline #412 (Maven Test Failure) - origin/main',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#080C16;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080C16;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#101827;border:1px solid #1F2937;border-radius:12px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:20px 24px;background-color:#1E293B;border-bottom:2px solid #DC2626;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#991B1B;color:#FEE2E2;border-radius:4px;font-size:11px;font-weight:bold;">
                      JENKINS PIPELINE FAILED &#10060;
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#94A3B8;font-family:monospace;">BUILD #412</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:10px;">
                    <h2 style="margin:0;font-size:19px;font-weight:bold;color:#FFFFFF;">
                      Job: <span style="color:#60A5FA;">multicloud-monitoring-master</span>
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#94A3B8;">
                      Branch: <strong style="color:#FFFFFF;">origin/main</strong> &bull; Commit: <code style="color:#FCD34D;">a15332e</code> by siva
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- Stage Progress Bar -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;font-size:11px;text-align:center;">
                <tr>
                  <td width="30%" style="background-color:#064E3B;color:#6EE7B7;border:1px solid #059669;padding:8px;border-radius:6px;">
                    1. Checkout &#10003;
                  </td>
                  <td width="5%"></td>
                  <td width="30%" style="background-color:#7F1D1D;color:#FCA5A5;border:1px solid #DC2626;padding:8px;border-radius:6px;font-weight:bold;">
                    2. Maven Test &#10007;
                  </td>
                  <td width="5%"></td>
                  <td width="30%" style="background-color:#1E293B;color:#64748B;border:1px solid #374151;padding:8px;border-radius:6px;">
                    3. Deploy (Skipped)
                  </td>
                </tr>
              </table>

              <!-- Error Box -->
              <div style="background-color:#030712;border:1px solid #DC2626;border-radius:8px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#EF4444;margin-bottom:4px;">BUILD CONSOLE FAILURE:</div>
                <pre style="margin:0;color:#FCA5A5;font-family:monospace;font-size:11px;line-height:1.5;">[ERROR] Failed to execute goal org.apache.maven.plugins:maven-surefire-plugin
[ERROR] Test failure in: com.monitoring.security.TokenAuthTest
[ERROR] Expected: 200 OK, Got: 401 Unauthorized at line 84</pre>
                <div style="font-size:11px;color:#FCD34D;font-family:monospace;margin-top:6px;">
                  Location To Fix: /home/siva/monitoring/src/test/TokenAuthTest.java
                </div>
              </div>

              <!-- Terminal Fix -->
              <div style="background-color:#030712;border:1px solid #374151;border-radius:6px;padding:12px;margin-bottom:20px;font-family:monospace;font-size:12px;color:#38BDF8;">
                <div style="font-size:10px;color:#94A3B8;margin-bottom:4px;"># Reproduce and fix locally:</div>
                <div>mvn clean test -Dtest=TokenAuthTest</div>
                <div>git commit -am "fix(auth): update test mock header" &amp;&amp; git push</div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 24px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
                  View Jenkins Console Output &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#0F172A;border-top:1px solid #1F2937;text-align:center;font-size:11px;color:#64748B;">
              Jenkins CI/CD Automation &bull; Automated Build Dispatcher
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 7: DEVSECOPS SECURITY SCAN (Trivy / Snyk Style)
  // --------------------------------------------------------------------------
  {
    name: 'Model 7: DevSecOps Vulnerability Brief (Trivy / Snyk)',
    subject: '[Model 7 - DevSecOps Shield] SECURITY ALERT: 1 Critical CVE Vulnerability in multicloud-monitoring:latest',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0B0714;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0B0714;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#130E24;border:1px solid #2B1D4A;border-radius:14px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:22px 24px;background-color:#1E153B;border-bottom:2px solid #9333EA;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#701A75;color:#F5D0FE;border:1px solid #C026D3;border-radius:6px;font-size:11px;font-weight:bold;">
                      &#128737; TRIVY SECURITY AUDIT
                    </span>
                  </td>
                  <td align="right">
                    <span style="padding:4px 10px;background-color:#7F1D1D;color:#FCA5A5;border:1px solid #EF4444;border-radius:6px;font-size:11px;font-weight:bold;font-family:monospace;">
                      CRITICAL (CVSS 9.8)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:19px;font-weight:bold;color:#FFFFFF;">
                      Container Vulnerability Detected
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#A78BFA;">
                      Image: <strong style="color:#FFFFFF;">multicloud-monitoring:latest</strong> &bull; Host: vm01siva-mon
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- CVE Table -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0514;border:1px solid #2B1D4A;border-radius:8px;margin-bottom:18px;font-size:12px;">
                <tr style="border-bottom:1px solid #2B1D4A;">
                  <td style="padding:10px 14px;color:#A78BFA;">Vulnerability ID</td>
                  <td align="right" style="padding:10px 14px;color:#EF4444;font-weight:bold;font-family:monospace;">CVE-2026-24836</td>
                </tr>
                <tr style="border-bottom:1px solid #2B1D4A;">
                  <td style="padding:10px 14px;color:#A78BFA;">Vulnerable Library</td>
                  <td align="right" style="padding:10px 14px;color:#FFFFFF;font-family:monospace;">libssl3 (v3.0.2-0ubuntu1.10)</td>
                </tr>
                <tr style="border-bottom:1px solid #2B1D4A;">
                  <td style="padding:10px 14px;color:#A78BFA;">Fixed In Version</td>
                  <td align="right" style="padding:10px 14px;color:#34D399;font-weight:bold;font-family:monospace;">v3.0.2-0ubuntu1.14</td>
                </tr>
                <tr>
                  <td style="padding:10px 14px;color:#A78BFA;">Impact Type</td>
                  <td align="right" style="padding:10px 14px;color:#FCD34D;">Remote Code Execution / Buffer Overflow</td>
                </tr>
              </table>

              <!-- Remediation -->
              <div style="background-color:#0A0514;border:1px solid #059669;border-radius:8px;padding:14px;margin-bottom:20px;">
                <div style="font-size:11px;font-weight:bold;color:#34D399;margin-bottom:6px;">HOW TO PATCH &amp; REMEDIATE:</div>
                <div style="font-size:12px;color:#CBD5E1;line-height:1.4;margin-bottom:8px;">
                  Update the Dockerfile base image to the latest Ubuntu LTS patch to apply the updated OpenSSL package.
                </div>
                <pre style="margin:0;padding:10px;background-color:#05020A;border:1px solid #2B1D4A;border-radius:6px;color:#C084FC;font-family:monospace;font-size:12px;"># In Dockerfile:
apt-get update &amp;&amp; apt-get install --only-upgrade libssl3 -y</pre>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 26px;background-color:#7C3AED;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">
                  Open Security Audit Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#0A0514;border-top:1px solid #2B1D4A;text-align:center;font-size:11px;color:#6B7280;">
              DevSecOps Security Pipeline &bull; Automated Trivy Scanner
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 8: CODE QUALITY GATE ALERT (SonarQube Style)
  // --------------------------------------------------------------------------
  {
    name: 'Model 8: Code Quality Gate (SonarQube Style)',
    subject: '[Model 8 - Quality Gate] SONARQUBE FAILED: Quality Gate Failed on multi-cloud-monitoring-engine',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0F1D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0F1D;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#111A2E;border:1px solid #1E293B;border-radius:12px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:22px 24px;background-color:#16233B;border-bottom:3px solid #DC2626;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#7F1D1D;color:#FCA5A5;border:1px solid #EF4444;border-radius:4px;font-size:11px;font-weight:bold;">
                      QUALITY GATE FAILED &#10060;
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#94A3B8;font-family:monospace;">SONARQUBE SCAN</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:19px;font-weight:bold;color:#FFFFFF;">
                      Project: multi-cloud-monitoring-engine
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#94A3B8;">
                      Profile: <strong>Sonar Way Strict</strong> &bull; Branch: main
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- 4-Metric Grid -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
                <tr>
                  <td width="23%" style="background-color:#0A0F1D;border:1px solid #1E293B;border-radius:6px;padding:10px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;">Blocker Bugs</div>
                    <div style="font-size:16px;font-weight:bold;color:#EF4444;margin-top:2px;">2 Failed</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="background-color:#0A0F1D;border:1px solid #1E293B;border-radius:6px;padding:10px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;">Vulnerabilities</div>
                    <div style="font-size:16px;font-weight:bold;color:#F59E0B;margin-top:2px;">1 High</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="background-color:#0A0F1D;border:1px solid #1E293B;border-radius:6px;padding:10px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;">Code Coverage</div>
                    <div style="font-size:16px;font-weight:bold;color:#EF4444;margin-top:2px;">68.4%</div>
                  </td>
                  <td width="2%"></td>
                  <td width="23%" style="background-color:#0A0F1D;border:1px solid #1E293B;border-radius:6px;padding:10px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;">Duplications</div>
                    <div style="font-size:16px;font-weight:bold;color:#10B981;margin-top:2px;">1.8% Ok</div>
                  </td>
                </tr>
              </table>

              <!-- Detailed Reason -->
              <div style="background-color:#0A0F1D;border:1px solid #1E293B;border-radius:8px;padding:14px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#F59E0B;margin-bottom:4px;">&#9888; CRITICAL QUALITY GATE CONDITIONS FAILED:</div>
                <ul style="margin:0;padding-left:18px;font-size:12px;color:#CBD5E1;line-height:1.6;">
                  <li><strong>Coverage on New Code:</strong> 68.4% is less than required 80.0%.</li>
                  <li><strong>Blocker Bug:</strong> Null pointer exception in <code>src/lib/notifications/emailService.ts:722</code>.</li>
                </ul>
                <div style="font-size:11px;color:#38BDF8;font-family:monospace;margin-top:8px;">
                  Location To Fix: src/lib/notifications/emailService.ts
                </div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 24px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
                  Inspect in SonarQube Dashboard &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#0A0F1D;border-top:1px solid #1E293B;text-align:center;font-size:11px;color:#64748B;">
              SonarQube Code Quality Platform &bull; Automated Gate Check
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 9: INFRASTRUCTURE AS CODE (Terraform & Ansible Style)
  // --------------------------------------------------------------------------
  {
    name: 'Model 9: Infra as Code (Terraform & Ansible)',
    subject: '[Model 9 - Infra as Code] TERRAFORM APPLY FAILED: State Lock Acquisition Error on Azure VPC',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#080711;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#080711;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#120E21;border:1px solid #271E42;border-radius:12px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding:22px 24px;background-color:#1C1433;border-bottom:2px solid #844FBA;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#5B21B6;color:#EDE9FE;border:1px solid #8B5CF6;border-radius:4px;font-size:11px;font-weight:bold;">
                      TERRAFORM / ANSIBLE IAC ALERT
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#C4B5FD;font-family:monospace;">STATE LOCK ERROR</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:19px;font-weight:bold;color:#FFFFFF;">
                      Terraform Apply Failed: <span style="color:#A78BFA;">azure_virtual_network</span>
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#94A3B8;">
                      Workspace: <strong style="color:#FFFFFF;">prod-azure-infrastructure</strong> &bull; Host: vm01siva-mon
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <div style="background-color:#090614;border:1px solid #DC2626;border-radius:8px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#EF4444;margin-bottom:4px;">TERRAFORM CLI ERROR:</div>
                <pre style="margin:0;color:#FCA5A5;font-family:monospace;font-size:11px;line-height:1.5;">Error acquiring the state lock: ConditionalCheckFailedException
Lock Info:
  ID:        b8c49e71-82d1-4203-9bb5-4f227a192801
  Path:      terraform-state/prod.tfstate
  Who:       siva@vm01siva-mon
  Created:   2026-11-26 13:42:10 UTC</pre>
              </div>

              <!-- Root Cause & Fix -->
              <div style="background-color:#090614;border:1px solid #271E42;border-radius:8px;padding:12px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:bold;color:#A78BFA;margin-bottom:4px;">&#128269; WHY DID THIS HAPPEN:</div>
                <div style="font-size:12px;color:#CBD5E1;line-height:1.5;">
                  A previous Terraform deployment was abruptly killed (SIGINT/SIGTERM) before releasing the state file lock in Azure Blob Storage.
                </div>
                <div style="font-size:11px;color:#FCD34D;font-family:monospace;margin-top:6px;">
                  Location To Fix: /home/siva/monitoring/infra/terraform
                </div>
              </div>

              <!-- CLI Fix -->
              <div style="background-color:#05020D;border:1px solid #271E42;border-radius:6px;padding:12px;margin-bottom:20px;font-family:monospace;font-size:12px;color:#38BDF8;">
                <div style="font-size:10px;color:#94A3B8;margin-bottom:4px;"># Release lock and re-run apply:</div>
                <div>terraform force-unlock b8c49e71-82d1-4203-9bb5-4f227a192801</div>
                <div>terraform apply -auto-approve</div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard/notifications" style="display:inline-block;padding:12px 24px;background-color:#844FBA;color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
                  Open Terraform Console &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:12px;background-color:#090614;border-top:1px solid #271E42;text-align:center;font-size:11px;color:#6B7280;">
              Infrastructure as Code &bull; Terraform &amp; Ansible Orchestrator
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  },

  // --------------------------------------------------------------------------
  // MODEL 10: EXECUTIVE HEALTH DIGEST (SaaS Health Report)
  // --------------------------------------------------------------------------
  {
    name: 'Model 10: Executive Summary & Health Digest (SaaS Report)',
    subject: '[Model 10 - Health Digest] 24H Infrastructure Health Digest: 98.9% Uptime, 1 Active Warning',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0F1D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0A0F1D;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:620px;background-color:#111B30;border:1px solid #1E2D4A;border-radius:14px;overflow:hidden;box-shadow:0 15px 35px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding:24px;background:linear-gradient(90deg,#1E3A8A,#111B30);border-bottom:2px solid #3B82F6;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="display:inline-block;padding:4px 10px;background-color:#1E3A8A;color:#93C5FD;border:1px solid #3B82F6;border-radius:6px;font-size:11px;font-weight:bold;">
                      EXECUTIVE DIGEST &bull; DAILY REPORT
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#93C5FD;font-family:monospace;">UPTIME: 98.9%</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <h2 style="margin:0;font-size:21px;font-weight:bold;color:#FFFFFF;">
                      Multi-Cloud Infrastructure Health Summary
                    </h2>
                    <p style="margin:4px 0 0 0;font-size:12px;color:#94A3B8;">
                      Host: <strong>vm01siva-mon</strong> (4.240.105.247) &bull; Central India
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              <!-- 3 Health Stat Badges -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr>
                  <td width="32%" style="background-color:#0C1424;border:1px solid #1E2D4A;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Servers Health</div>
                    <div style="font-size:15px;font-weight:bold;color:#10B981;margin-top:4px;">100% Online</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#0C1424;border:1px solid #1E2D4A;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Docker Containers</div>
                    <div style="font-size:15px;font-weight:bold;color:#38BDF8;margin-top:4px;">4 Running / 0 Down</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color:#0C1424;border:1px solid #1E2D4A;border-radius:8px;padding:12px;text-align:center;">
                    <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Active Alerts</div>
                    <div style="font-size:15px;font-weight:bold;color:#F59E0B;margin-top:4px;">1 Warning</div>
                  </td>
                </tr>
              </table>

              <!-- Executive Insights -->
              <div style="background-color:#0C1424;border:1px solid #1E2D4A;border-radius:10px;padding:16px;margin-bottom:20px;">
                <div style="font-size:11px;font-weight:bold;color:#60A5FA;text-transform:uppercase;margin-bottom:8px;">
                  Key Operations &amp; Resource Insights:
                </div>
                <div style="font-size:12px;color:#CBD5E1;line-height:1.6;">
                  &bull; <strong>CPU Peak:</strong> Spiked to 72.1% during Next.js release deployment; currently normalized.<br>
                  &bull; <strong>RAM Footprint:</strong> Healthy at 41.2% memory utilization across PM2 clusters.<br>
                  &bull; <strong>Disk Storage:</strong> Root volume healthy at 44.8% capacity.<br>
                  &bull; <strong>Incident Dispatcher Hub:</strong> Operational &bull; Dispatched 4 real-time alerts successfully.
                </div>
              </div>

              <div style="text-align:center;">
                <a href="${BASE_URL}/dashboard" style="display:inline-block;padding:12px 28px;background-color:#2563EB;color:#FFFFFF;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;box-shadow:0 4px 15px rgba(37,99,235,0.4);">
                  Open Executive Cloud Dashboard &rarr;
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px;background-color:#0C1424;border-top:1px solid #1E2D4A;text-align:center;font-size:11px;color:#64748B;">
              Multi-Cloud Infrastructure Monitoring Platform &bull; Daily Operations Digest
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  }
];

// ============================================================================
// DISPATCH ALL 10 EMAIL MODELS
// ============================================================================
async function run() {
  console.log(`🚀 Starting dispatch of all 10 Email Models to recipients: [${RECIPIENTS.join(', ')}]...`);
  
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    console.log(`\n📨 Dispatching [${i + 1}/10] ${m.name}...`);
    try {
      const info = await transporter.sendMail({
        from: `"Multi-Cloud DevOps Alert" <${GMAIL_USER}>`,
        to: RECIPIENTS.join(', '),
        subject: m.subject,
        html: m.html
      });
      console.log(`   ✅ Sent successfully! MessageId: ${info.messageId}`);
      // Small pause between emails to avoid hitting rapid rate limits
      await new Promise(r => setTimeout(r, 1200));
    } catch (err) {
      console.error(`   ❌ Failed sending ${m.name}:`, err.message);
    }
  }

  console.log('\n🎉 Finished dispatching all 10 Email Models!');
}

run();
