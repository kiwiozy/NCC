# 🚀 Terraform Starter — Walk Easy Patient Platform (GCP)

This starter provisions a **production-ready baseline** on **Google Cloud**:

- Cloud Run services: **API** and **Web**
- Cloud SQL **PostgreSQL** (private IP, backups, PITR)
- Serverless **VPC Connector** (Cloud Run → Cloud SQL)
- **Secret Manager** (DB URL, Xero, SMS Broadcast)
- **Cloud Storage** (documents, images)
- **Cloud Tasks** + **Cloud Scheduler** (reminders)
- Required APIs + IAM roles per service account
- Outputs for URLs and connection names

> Default region: `australia-southeast1` (Sydney). You can change in `terraform.tfvars`.

---

## Prereqs

1. **Install Terraform** (>= 1.5) and **gcloud**.
2. Authenticate and set project:
   ```bash
   gcloud auth application-default login
   gcloud config set project <YOUR_GCP_PROJECT_ID>
   ```
3. Ensure you have **Owner** or equivalent IAM to bootstrap.

---

## How to use

```bash
# 1) Edit variables (project id, names, db password)
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars

# 2) Init & apply
terraform init
terraform plan
terraform apply
```

After apply:
- API URL and Web URL are printed in outputs
- Add your container images to the services or deploy via CI (see notes in `cloud_run.tf`)
- Store app secrets using `gcloud secrets versions add ...`

---

## Notes

- **Images**: This starter sets placeholders for container images. Update `var.api_image` and `var.web_image` or deploy later with `gcloud run deploy` against the created services.
- **Cloud SQL**: A database and user are created; use the **Secret Manager** `DATABASE_URL` to configure the app.
- **Networking**: Serverless VPC Connector is created to allow private access to Cloud SQL.
- **Backups**: Automated backups + Point-in-Time Recovery are enabled.
- **Queues**: Cloud Tasks queue created for reminders; Scheduler example for a daily 09:00 Sydney job.

---

## Destroy (careful)

```bash
terraform destroy
```
This will remove infra (DB snapshots not retained beyond backup policy).