# Orbit v1.2 — Cloud Stability Edition

The **same Orbit v1.1 Apple-inspired UI and features**, customized for the AWS account already set up via the AWS Console.

**Start:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — open the project folder in VS Code, run `npm install`, then `npm run dev`.

## What stays exactly as before

- Colorful, interactive glowing **pie-chart category hub**, category-themed backgrounds, custom sections
- **Light and dark themes**, gentle peripheral ambient animations and responsive layout
- Today, upcoming, all tasks, calendar, long-term plans and in-app activity alerts
- One-time and recurring tasks, birthdays, friend requests and shared tasks
- Browser-only demo mode if you choose to use it, plus AWS-connected workspaces

## Improvements in v1.2

- Already signed in to Cognito? Reuse the existing session for the same account instead of showing `There is already a signed in user`.
- Cloud sync errors no longer automatically log you into Demo mode. A visible **Retry sync** banner explains the problem.
- Identity uses the cached Cognito ID token claims, reducing unnecessary requests.
- Clearer errors for network interruptions vs rejected sessions vs API issues.
- Sign-up verification code resend and email password reset added to the existing sign-in modal.
- AWS backend CloudFormation template aligned to the **existing** `Orbit-Backend` stack, avoiding a second Cognito user pool.
- Local `.env` prefilled with existing **public** AWS app configuration and `.env.example` restored.
- Old Vite cache is excluded from the ZIP.

## Known limits

- This is a student-project starter, not a security-audited production app. No scheduled push/email reminders or WebSocket live updates.
- Local demo tasks are not migrated automatically to DynamoDB.
- AWS resources were already created: **no backend deployment necessary for v1.2 UI fixes**.
- Browser network errors such as `ERR_INTERNET_DISCONNECTED` still require connectivity to AWS Cognito to be restored.

## Commands

```powershell
npm install
npm run dev
npm test
npm run build
```

**Security:** `.env` is gitignored. It only holds public Cognito IDs/URL, never AWS secret keys.

### Windows one-click startup

Double-click `start-orbit-windows.bat`. It installs npm packages only if `node_modules` is missing, then starts Vite. Stop the server with `Ctrl+C` when finished.
