# HWB Student Login

Public frontend for the HWB student email OTP login. The ERP backend is hosted separately.

Live site: https://backup-alt.github.io/hwb-student-login/

Students enter their roll number and registered university email, verify the code sent by email, and are directed to the HWB WhatsApp bot chat. The QR assets are in `public/`.

The GitHub Pages workflow builds this React app with `PUBLIC_URL=/hwb-student-login` and points it at the Railway backend. No Firebase service account or SMTP credentials belong in this repository.

For local development:

```bash
npm ci
cp .env.example .env
npm start
```
