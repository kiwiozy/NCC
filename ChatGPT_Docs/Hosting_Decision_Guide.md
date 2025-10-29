# 🏗️ Hosting Decision Guide — Walk Easy Patient Platform

**Goal:** Choose the best hosting model for a clinical-grade web app (Next.js + Django/DRF + PostgreSQL) handling PHI/PII, with AU data residency and low ops overhead.

---

## 1) Non‑Negotiable Requirements
- **Data residency:** Australia (Sydney region preferred).
- **Security:** TLS everywhere, KMS‑backed encryption, least‑privilege IAM, audit logs.
- **Compliance:** Align with NDIS privacy expectations; HIPAA‑style principles (not formally required) — avoid PHI in logs, rotate secrets.
- **Availability:** ≥99.9% target for app API; async jobs resilient to retries.
- **Ops:** Small team; prefer managed services over self‑managed VMs/Kubernetes.
- **Cost visibility:** Predictable monthly baseline, scale linearly with traffic.
- **Integrations:** FileMaker Data API (export), SMS Broadcast, Xero, optional Google Calendar sync.

---

## 2) Options Compared

| Option | What it looks like | Pros | Cons | Fit |
|---|---|---|---|---|
| **GCP: Cloud Run + Cloud SQL (Postgres) + GCS + Secret Manager** | Serverless containers; managed Postgres; object storage | You already use this; AU‑Sydney region; autoscaling; low ops; per‑second billing; first‑class logs | Some VPC/egress tuning; cold starts for very spiky traffic | **Excellent** |
| **AWS: Fargate (ECS) + Aurora Postgres + S3 + Secrets Manager** | Serverless containers; managed Postgres‑compatible DB | Mature ecosystem; easy if you standardise on AWS; Pinpoint/SNS native | Slightly higher ops overhead than Cloud Run; more knobs to tune | Good |
| **Kubernetes (GKE/EKS)** | Full K8s cluster running API, workers, web | Maximum control/flexibility | Highest ops burden; cluster mgmt, upgrades, cost floor | Overkill now |
| **PaaS (Render/Railway/Fly.io)** | Simple deploy, managed DB optional | Quick start, good DX | Unclear AU residency/compliance; limited VPC/private networking | Risky for PHI |
| **VMs (GCE/EC2)** | DIY on virtual machines | Full control | Patch mgmt, scaling, backups = your job | Not recommended |

**Verdict:** Stay on **GCP (Cloud Run + Cloud SQL + GCS)** to minimise ops, keep AU residency, and reuse existing org/policies.

---

## 3) Recommended Reference Architecture (GCP)

```
+-------------------------+         +----------------------+
| Next.js (SSR/SPA)       |  HTTPS  | Django/DRF API       |
| Cloud Run (web)         +-------->+ Cloud Run (api)      |
|                         |         | - App logic          |
+-------------------------+         | - SMS/Xero gateways  |
                                    +----------+-----------+
                                               |
                                               | Serverless VPC Access
                                               v
                                    +----------------------+
                                    | Cloud SQL (Postgres) |
                                    | - Primary AU-Sydney  |
                                    +----------+-----------+
                                               |
                                               v
+-------------------------+         +----------------------+
| Cloud Storage (GCS)     |<------->| API (Signed URLs)    |
| - Documents/Images      |         +----------------------+
+-------------------------+
         ^                                        ^
         |                                        |
         |                                        |
+--------+-----+                           +------+---------+
| Cloud Tasks  |                           | Secret Manager |
| - Reminders  |                           | - API keys     |
| - Webhooks   |                           | - DB creds     |
+--------------+                           +----------------+

Observability: Cloud Logging, Metrics, Error Reporting (Sentry), Uptime checks
Network: HTTPS Load Balancer -> Cloud Run; Private IP for Cloud SQL via VPC connector
```

### Services
- **Compute:** Cloud Run (web, api, worker jobs).
- **DB:** Cloud SQL for Postgres (AU‑Sydney), automated backups + PITR.
- **Storage:** GCS buckets for containers/docs; signed URLs for access.
- **Scheduling/Queues:** Cloud Tasks + Cloud Scheduler.
- **Secrets:** Secret Manager (rotate quarterly).
- **Monitoring:** Cloud Monitoring, Error Reporting, Sentry.
- **VPC:** Serverless VPC Connector to reach Cloud SQL on private IP.

---

## 4) Sizing & Scaling Guidance

- **Cloud Run (api):** start 1 vCPU / 512–1024MB; max concurrency 40; autoscale 0→N; enable min instances = 1 for warm starts.
- **Cloud Run (web):** 0.5–1 vCPU / 512MB; static assets on CDN (Cloud CDN) if SSR heavy.
- **Cloud SQL:** db-custom-2-8 (2 vCPU / 8GB) for production; auto‑storage increase; connection pooler (Cloud SQL Proxy/Connector).
- **GCS:** Standard storage; lifecycle rules (e.g., move to Nearline after 90 days if appropriate).
- **Tasks:** default rate 5–20/s; exponential retry with DLQ pattern if needed.

---

## 5) HA/DR & Backups

- **RPO:** ≤ 5 min using **Point‑in‑Time Recovery** (PITR).
- **RTO:** ≤ 2 hours regional incident (promote read replica or restore from PITR).
- **Backups:** Daily automated; keep 30 days; test restores quarterly.
- **Multi‑region files:** If required, replicate critical documents to **dual‑region** bucket (within AU).

---

## 6) Security Checklist

- [ ] HTTPS only; HSTS; TLS >= 1.2  
- [ ] Private IP for Cloud SQL; deny public DB access  
- [ ] IAM least privilege; per‑service accounts for web/api/worker  
- [ ] Secret Manager for API keys (Xero, SMS Broadcast); never in code  
- [ ] Signed URLs for GCS file access; time‑limited (e.g., 15–60 min)  
- [ ] VPC egress rules — restrict outbound if possible  
- [ ] Log redaction for PII/PHI; do not log SMS contents or PHI  
- [ ] Sentry PII scrubbing enabled  
- [ ] Regular dependency scanning (Dependabot) and container image scanning  

---

## 7) Cost Framing (order‑of‑magnitude)

- **Cloud Run:** pay per vCPU‑sec & GiB‑sec + requests; scales to zero off hours.
- **Cloud SQL:** main fixed component; cost tied to vCPU/RAM/storage/IO; PITR adds storage.
- **GCS:** storage GB/month + egress; signed URL downloads billed as egress if outside GCP.
- **Cloud Tasks/Scheduler:** very low (per million ops).
- **Sentry/3rd‑party:** add per‑project licensing if used.

> Keep **Cloud SQL** right‑sized with performance insights; set budget alerts in Billing with anomaly detection.

---

## 8) Dev/Test/Prod Environments

- **dev** (shared): smallest Cloud SQL tier + preemptible costs; Cloud Run min instances = 0.
- **staging**: mirrors prod settings with smaller DB; gated deploys; synthetic test data only.
- **prod**: regional Cloud SQL + backups, min‑instance warmers for web/api.

**Promotion:** `dev → staging → prod` via GitHub Actions/Cloud Build with approvals.

---

## 9) Migration Plan (from FileMaker)

1. Stand up **staging** stack on GCP.
2. Run export/ETL jobs (FileMaker Data API) into **staging Postgres**.
3. Validate data model, permissions, and calendar flows.
4. Performance test (calendar week view, 1k reminders/day, Xero sync).
5. Go‑live: create **prod** environment; switch DNS; read‑only mode on legacy for a week.
6. Post‑cutover: monitor errors, tune Cloud SQL, enable dual‑region GCS if needed.

---

## 10) Alternative (AWS) Layout — if you must

- **Compute:** ECS + Fargate (api/web/workers)
- **DB:** Aurora Postgres (Regional); Backups + PITR
- **Storage:** S3 + signed URLs; optionally CloudFront
- **Secrets:** Secrets Manager
- **Queues/Crons:** SQS + EventBridge Scheduler
- **Obs:** CloudWatch + Sentry
- **Networking:** Private subnets + NAT; Security Groups

**Trade‑off:** Comparable capability; slightly more ops effort than Cloud Run; choose AWS only if your broader team standardises there or you need an AWS‑native feature (e.g., Pinpoint).

---

## 11) Final Recommendation

Stay on **GCP** with this stack:
- Cloud Run (web/api/workers), Cloud SQL (Postgres, AU‑Sydney), GCS, Secret Manager, Cloud Tasks/Scheduler, Cloud Logging/Monitoring.
- Add **Cloud CDN** if front‑end SSR is heavy or you serve many assets.
- Keep **Kubernetes** off the table unless requirements grow (multi‑tenant, heavy custom networking).

**Why:** Lowest ops, AU residency, aligns with your current environment, easy scaling, and clear path to compliance.

---

## 12) Next Steps (Actionable)

- [ ] Create **staging** project in GCP; replicate infra with Terraform or console.
- [ ] Provision Cloud SQL (Postgres 15+), private IP, PITR on, daily backups.
- [ ] Create Cloud Run services (`web`, `api`, `worker`) with per‑service accounts.
- [ ] Wire Serverless VPC Connector for API → Cloud SQL.
- [ ] Configure Secret Manager (Xero, SMS Broadcast, DB).
- [ ] Set Cloud Scheduler jobs for reminders; Cloud Tasks queues for async work.
- [ ] Enable Monitoring dashboards + Uptime checks + Sentry.
- [ ] Set budgets + anomaly alerts.
- [ ] Run staging data import; execute smoke tests; sign‑off; go‑live plan.
