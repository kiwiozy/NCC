# Cloud SQL Postgres with private IP
resource "google_sql_database_instance" "postgres" {
  name             = "wep-postgres"
  database_version = var.db_version
  region           = var.region
  settings {
    tier = var.db_tier
    ip_configuration {
      ipv4_enabled    = false
      private_network = "projects/${var.project_id}/global/networks/default"
    }
    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }
    insights_config {
      query_plans_per_minute = 5
      query_string_length    = 1024
      record_application_tags = true
      record_client_address   = true
    }
    availability_type = "ZONAL"
    deletion_protection_enabled = true
  }
  depends_on = [google_project_service.services]
}

resource "google_sql_database" "appdb" {
  name     = "wep_app"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "appuser" {
  name     = "wep_user"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}