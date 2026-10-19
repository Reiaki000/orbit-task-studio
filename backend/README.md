# AWS backend — existing Orbit-Backend stack

This project was deployed **through AWS CloudFormation in the AWS website**, not with the original AWS SAM template.

- `template.yaml` is the CloudFormation template corresponding to the currently deployed `Orbit-Backend` stack in **ap-south-2**. It **reuses** the existing Cognito user pool and public SPA client.
- `src/index.js` is readable Lambda source for reference and future maintenance. The deployed `template.yaml` has an inline **CommonJS** snapshot under `OrbitFunction.Properties.Code.ZipFile`. Merely editing `src/index.js` does **not** update the deployed Lambda.
- No CloudFormation or Lambda update is needed for the **v1.2 frontend authentication and error-handling fixes**.
- If you later update the backend, update the inline code and use **CloudFormation → Orbit-Backend → Update stack**, review the change set, and confirm only intended resources change. **Do not create another stack/user pool.**
- The app client ID and user pool ID are public identifiers, not IAM secrets. Never put AWS access keys in `.env` or GitHub.
