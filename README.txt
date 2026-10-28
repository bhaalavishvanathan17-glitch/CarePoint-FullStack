CAREPOINT HOSPITAL MANAGEMENT - TESTED DEMO BUILD
=================================================

REQUIREMENTS
- Node.js 18 or newer
- npm

RUN ON WINDOWS
1. Extract the ZIP into a normal folder.
2. Open that folder in VS Code.
3. Open Terminal > New Terminal.
4. Run: npm install
5. Run: npm test
6. Run: npm start
7. Open http://localhost:3000

DEMO LOGIN
Username: admin
Password: Admin@123

FEATURES
- Login/logout with bcrypt password verification and JWT tokens
- Dashboard patient and appointment counts
- Patient creation, list/search, get-by-ID, update API and delete
- Appointment creation, list, patch status and cancellation
- Doctors and departments directory screens
- JSON persistence in data/db.json (created automatically)
- Health check at GET /api/health
- Automated API tests: npm test

TESTS
The automated tests cover public health check, authentication requirements, successful and failed login, invalid patient age, patient creation/search, dashboard counts, appointment creation/cancellation, and deleting a patient. Run the tests locally after installing dependencies. Do not claim a test passed unless npm test completes successfully on your machine.

SECURITY / LIMITATIONS
This is a college/demo project, not production-ready hospital software. Do not use real patient or medical data. The default JWT secret and demo credentials are for local demonstration only. Before deployment, set a strong random JWT_SECRET environment variable, use HTTPS and a real database, add rate limiting, stricter authorization, audit logs, backups, validation and applicable privacy/compliance controls. JSON file storage is not suitable for concurrent production use. Appointment entries are currently accepted by patient name and do not enforce that the patient already exists.
