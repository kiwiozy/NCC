# GCS bucket for documents & images
resource "google_storage_bucket" "assets_bucket" {
  name                        = "${var.project_id}-wep-assets"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = false
  lifecycle_rule {
    condition { age = 365 }
    action { type = "SetStorageClass" storage_class = "NEARLINE" }
  }
  depends_on = [google_project_service.services]
}