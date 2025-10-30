output "cloud_run_api_url" {
  value = google_cloud_run_v2_service.api.uri
}

output "cloud_run_web_url" {
  value = google_cloud_run_v2_service.web.uri
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "gcs_bucket_name" {
  value = google_storage_bucket.assets_bucket.name
}

output "tasks_queue_name" {
  value = google_cloud_tasks_queue.reminders.name
}