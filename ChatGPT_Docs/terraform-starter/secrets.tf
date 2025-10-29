# Secret Manager entries
resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"
  replication { auto {} }
}

# Placeholder versions can be added via gcloud or CI after Terraform
# gcloud secrets versions add DATABASE_URL --data-file=<(echo -n "postgres://wep_user:***@/wep_app?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}")
