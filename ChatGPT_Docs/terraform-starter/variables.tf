variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "australia-southeast1"
}

variable "db_tier" {
  description = "Cloud SQL machine type"
  type        = string
  default     = "db-custom-2-8192"
}

variable "db_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "db_password" {
  description = "Password for the app DB user"
  type        = string
  sensitive   = true
}

variable "api_image" {
  description = "Container image for API (Cloud Run)"
  type        = string
  default     = "gcr.io/PROJECT_ID/wep-api:latest"
}

variable "web_image" {
  description = "Container image for Web (Cloud Run)"
  type        = string
  default     = "gcr.io/PROJECT_ID/wep-web:latest"
}

variable "app_domain" {
  description = "Optional custom domain (for notes)"
  type        = string
  default     = ""
}