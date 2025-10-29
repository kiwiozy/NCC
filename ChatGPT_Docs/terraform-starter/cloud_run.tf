# Cloud Run (API)
resource "google_cloud_run_v2_service" "api" {
  name     = "wep-api"
  location = var.region
  template {
    service_account = google_service_account.api_sa.email
    containers {
      image = var.api_image
      env {
        name  = "GOOGLE_CLOUD_SQL_CONNECTION_NAME"
        value = google_sql_database_instance.postgres.connection_name
      }
      env {
        name  = "DATABASE_URL_SECRET"
        value = "DATABASE_URL"
      }
    }
    vpc_access {
      connector = google_vpc_access_connector.serverless.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }
  }
  depends_on = [google_project_service.services]
}

# Allow unauthenticated access to API (adjust if you want auth only)
resource "google_cloud_run_service_iam_member" "api_invoker" {
  location = google_cloud_run_v2_service.api.location
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Run (Web)
resource "google_cloud_run_v2_service" "web" {
  name     = "wep-web"
  location = var.region
  template {
    service_account = google_service_account.web_sa.email
    containers {
      image = var.web_image
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }
  }
  depends_on = [google_project_service.services]
}

resource "google_cloud_run_service_iam_member" "web_invoker" {
  location = google_cloud_run_v2_service.web.location
  service  = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}