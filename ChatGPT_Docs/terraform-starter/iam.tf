# Service accounts for Cloud Run
resource "google_service_account" "api_sa" {
  account_id   = "wep-api-sa"
  display_name = "Walk Easy API SA"
}

resource "google_service_account" "web_sa" {
  account_id   = "wep-web-sa"
  display_name = "Walk Easy Web SA"
}

# Allow SA to connect to Cloud SQL
resource "google_project_iam_member" "api_sql_client" {
  role   = "roles/cloudsql.client"
  member = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "web_sql_client" {
  role   = "roles/cloudsql.client"
  member = "serviceAccount:${google_service_account.web_sa.email}"
}

# Secret Manager access for API SA
resource "google_secret_manager_secret_iam_member" "dburl_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api_sa.email}"
}