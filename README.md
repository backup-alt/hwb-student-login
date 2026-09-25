# HWB Student Login

Public frontend for the HWB student email OTP login. The ERP backend is hosted separately.

Live site: https://backup-alt.github.io/hwb-student-login/

Students enter their roll number and WhatsApp mobile number. The form fills the matching lowercase university email automatically, then sends a six-digit code to that address. The signed-in page shows their profile and available attendance summary. A one-time `LINK` message sent from the entered mobile number pairs their WhatsApp account with the bot. The QR assets are in `public/`.

The backend accepts a roll number found in `test.students` or `test.overallAttendance`. A roll missing from both displays "Your Record not added yet." Student-only records show the profile while attendance remains unavailable.

The GitHub Pages workflow builds this React app with `PUBLIC_URL=/hwb-student-login` and points it at the Railway backend. No Firebase service account or SMTP credentials belong in this repository.

For local development:

```bash
npm ci
cp .env.example .env
npm start
```
