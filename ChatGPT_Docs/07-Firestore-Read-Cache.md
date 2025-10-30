# Optional Firestore Read Cache

Use Firestore to power reactive lists without burdening relational joins. Postgres remains the system of record.

## What to mirror
- `mv_todays_appointments` → `/appointments_today/{id}`
- `mv_patient_summary` → `/patient_summaries/{patientId}`

## Sync mechanism
- Trigger jobs after dbt/materialized view refresh
- Upsert documents keyed by target UUIDs
- Remove fields you don’t want on the client; enforce Security Rules

## Security Rules (sketch)
```
// Restrict to authenticated staff; use custom claims for roles.
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /patient_summaries/{patientId} {
      allow read: if request.auth.token.role in ['admin','clinician'];
      allow write: if false; // server-only via Admin SDK
    }
    match /appointments_today/{id} {
      allow read: if request.auth.token.role in ['admin','clinician'];
      allow write: if false;
    }
  }
}
```
