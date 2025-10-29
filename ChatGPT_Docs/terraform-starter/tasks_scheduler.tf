# Cloud Tasks queue for reminders
resource "google_cloud_tasks_queue" "reminders" {
  name     = "wep-reminders"
  location = var.region
}

# Example: Daily 9am Australia/Sydney job hitting your API endpoint
resource "google_cloud_scheduler_job" "daily_reminders" {
  name        = "wep-daily-reminders"
  description = "Kick off T-24h reminder scan"
  schedule    = "0 9 * * *"
  time_zone   = "Australia/Sydney"

  http_target {
    uri = "${google_cloud_run_v2_service.api.uri}/internal/jobs/run-daily-reminders"
    http_method = "GET"
    oidc_token {
      service_account_email = google_service_account.api_sa.email
    }
  }
  depends_on = [google_cloud_run_v2_service.api]
}