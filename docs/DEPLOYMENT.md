# Orbit v1.2 — Localhost + already-deployed AWS backend

This ZIP is **preconfigured** for the existing AWS CloudFormation stack `Orbit-Backend` in **Asia Pacific (Hyderabad), ap-south-2**. No new AWS services are required to use the updated UI.

## 1. Run the replacement project on localhost

1. Stop the current dev server in VS Code with `Ctrl+C`.
2. Extract this ZIP into a fresh folder and open its `orbit-task-studio` directory in VS Code.
3. Keep the included `.env` file. It has your **public** Cognito/API identifiers already filled in. You do not need to copy the example.
4. In the VS Code Terminal run:

```powershell
npm install
npm run dev
```

5. Visit the exact localhost address printed by Vite, typically `http://localhost:5173/`.
6. Sign in using the **existing verified Cognito account**. Do not sign up again.
7. The header should change from **Demo mode** to **Cloud synced** after `/bootstrap` and `/sync` return successfully. If AWS is unreachable, the UI stays on the cloud workspace and shows a **Retry sync** button instead of falling back silently.
8. Create a task, then view DynamoDB → Tables → `Orbit-Backend-OrbitTable-...` → Explore table items to verify it persisted.

**Important:** The old demo's browser-local tasks are not automatically imported into AWS. Also, if Chrome reports `net::ERR_INTERNET_DISCONNECTED` while posting to `cognito-idp.ap-south-2.amazonaws.com`, reconnect the network/disable offline throttling first. The code cannot fix a disconnected network.

## 2. AWS setup — nothing to redeploy for this release

CloudFormation `Orbit-Backend` is already `CREATE_COMPLETE`. This ZIP contains the exact architecture template (`backend/template.yaml`) that matches your existing Cognito user pool in `ap-south-2`.

| Environment variable | Existing AWS value |
| --- | --- |
| `VITE_AWS_REGION` | `ap-south-2` |
| `VITE_COGNITO_USER_POOL_ID` | `ap-south-2_9iJLvmnID` |
| `VITE_COGNITO_CLIENT_ID` | `1rd7ja42mel9fhejr8dv610vcq` |
| `VITE_API_URL` | `https://axj7uhvqf1.execute-api.ap-south-2.amazonaws.com` |

**Do not re-create Cognito or DynamoDB.** On any future AWS stack update, carefully preview the CloudFormation changes before applying them to protect data.

## 3. Publish the same UI on GitHub Pages

1. Create or open your `orbit-task-studio` GitHub repository. The included `.github/workflows/deploy.yml` builds the frontend automatically from the `main` branch.
2. Under GitHub repository **Settings → Secrets and variables → Actions → Variables**, create five repository **variables**, not secrets:

| Name | Value |
| --- | --- |
| `VITE_BASE_PATH` | `/orbit-task-studio/` |
| `VITE_AWS_REGION` | `ap-south-2` |
| `VITE_COGNITO_USER_POOL_ID` | `ap-south-2_9iJLvmnID` |
| `VITE_COGNITO_CLIENT_ID` | `1rd7ja42mel9fhejr8dv610vcq` |
| `VITE_API_URL` | `https://axj7uhvqf1.execute-api.ap-south-2.amazonaws.com` |

3. Open **Settings → Pages**, select **GitHub Actions**, push the source files to `main`, and wait for the workflow to complete. Your URL will be `https://YOUR-USERNAME.github.io/orbit-task-studio/`.
4. In Cognito → User pools → Orbit app client → Login pages → Edit, **add** the published URL as an allowed callback URL and allowed sign-out URL alongside `http://localhost:5173/`.
5. Your deployed API's CORS origin is currently set to `http://localhost:5173`. To use GitHub Pages, go to CloudFormation → `Orbit-Backend` → **Update stack**, use the existing backend template or an unchanged copy, and set **AllowedFrontendOrigin** to `https://YOUR-USERNAME.github.io` (no trailing slash or repository path). This changes **only CORS** if all other template parameters are kept the same.
6. Check GitHub → Actions → Deploy Orbit to GitHub Pages and then test sign in, task create and task persistence from the public website.

**Caution:** This frontend uses Amplify's email/password sign-in, **not Cognito Hosted UI OAuth redirects**. Callback URLs matter if you later use managed login; basic password sign-in uses Cognito API directly. Keep the SPA client without a client secret.

## 4. If sign-in fails

- **`ERR_INTERNET_DISCONNECTED` to Cognito:** restore internet access; there will be no Lambda logs because Cognito was never reached.
- **`There is already a signed in user`:** Orbit v1.2 resumes the cached session for the same email. Sign in with a different email to switch accounts.
- **`401/403` from `/bootstrap` or `/sync`:** verify Cognito IDs, email verification, and JWT authorizer; check Network → Response.
- **`500` from API:** inspect CloudWatch log group `/aws/lambda/Orbit-Backend-...` and the latest log stream.
- **CORS error:** ensure API AllowedFrontendOrigin matches your browser origin; `http://localhost:5173` is different from `https://localhost:5173`.

The local `.env` file is excluded by `.gitignore`. No AWS keys or IAM secrets are included. The deployment identifiers are public browser configuration.
