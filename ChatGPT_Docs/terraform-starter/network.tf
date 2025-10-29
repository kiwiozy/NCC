# Serverless VPC Connector for Cloud Run -> Cloud SQL (private IP)
resource "google_vpc_access_connector" "serverless" {
  name   = "wep-svpc"
  region = var.region
  subnet {
    name = "default" # you can replace with a dedicated /28 subnet
  }
  depends_on = [google_project_service.services]
}