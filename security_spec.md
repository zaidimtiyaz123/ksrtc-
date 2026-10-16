# Security Specification: KSRTC SmartTrack Firestore & Auth

## 1. Data Invariants & Ownership Matrix
- **/users/{userId}**:
  - `read`: Any authenticated user where `request.auth.uid == userId` or authenticated admin.
  - `write`: Authenticated user modifying their own profile `request.auth.uid == userId` or admin.
- **/live_telemetry/{busId}**:
  - `read`: Public / All authenticated passengers, drivers, and admins.
  - `write`: Authenticated drivers or admins with valid latitude/longitude numbers.
- **/trips/{tripId}**:
  - `read`: Public / All authenticated users.
  - `write`: Authenticated drivers and admins.
- **/reports/{reportId}**:
  - `create`: Any authenticated user or anonymous passenger.
  - `read`: Creator (`request.auth.uid == resource.data.user_id`) or admin.
  - `update`/`delete`: Admin only.

## 2. The Dirty Dozen Security Tests
1. Unauthenticated reading of private user documents (`/users/{userId}`) -> DENIED
2. Passenger attempting to overwrite another passenger's profile -> DENIED
3. Passenger modifying live telemetry (`/live_telemetry/{busId}`) without driver role -> DENIED
4. Authenticated passenger creating a report in `/reports/{reportId}` -> ALLOWED
5. Passenger modifying existing report status to resolved -> DENIED
6. Admin updating report status to resolved -> ALLOWED
7. Unauthenticated user viewing public bus telemetry -> ALLOWED
8. Driver updating GPS telemetry with valid numbers -> ALLOWED
9. Driver setting non-numeric latitude/longitude in telemetry -> DENIED
10. Driver starting or updating trip status in `/trips/{tripId}` -> ALLOWED
11. Random user deleting active bus trips -> DENIED
12. Authenticated user updating their own profile details -> ALLOWED
