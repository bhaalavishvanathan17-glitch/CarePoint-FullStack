# CarePoint Testing and QA Report

## Scope
Frontend integration and REST API paths for login, dashboard, patient records, appointments, doctor directory and department directory.

## Automated test coverage
- `GET /api/health` is public.
- Protected dashboard rejects requests without a token.
- Demo admin login returns a JWT; invalid password is rejected.
- Patient creation rejects invalid age and accepts valid details.
- Patient search and dashboard totals return expected results.
- Appointment creation and cancellation work.
- Patient deletion works and unknown patient IDs return 404.

## Manual checks recommended
1. Open the app and log in with the demo credentials.
2. Confirm dashboard stats and recent patients display.
3. Register a patient, search by name/phone/department, then delete it.
4. Create and cancel an appointment.
5. Check mobile layout at narrow viewport widths.
6. Restart the server and confirm records persist in `data/db.json`.
7. Check invalid login, empty required fields, invalid age, and malformed API requests.

## Known limitations
- This is a demo, not production-ready clinical software.
- Authentication has a demo account; account management and rate limiting are not implemented.
- JSON file storage is not designed for simultaneous production writes.
- Appointment creation accepts a patient name and does not require a matching patient record.
- The dashboard's “today” count uses UTC date, which may differ from local date near midnight.

## Execution status
Test code is included in `tests/api.test.js`. Execute `npm install` followed by `npm test` in the project folder to obtain a local pass/fail result. No successful test run is claimed in this report unless that command has completed successfully.
