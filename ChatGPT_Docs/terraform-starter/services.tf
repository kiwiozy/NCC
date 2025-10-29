# Enable required APIs
resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "vpcaccess.googleapis.com",
    "secretmanager.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",
    "cloudscheduler.googleapis.com",
    "cloudtasks.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
  ])
  service = each.key
}