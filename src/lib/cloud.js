import {Amplify} from 'aws-amplify';
import {fetchAuthSession, getCurrentUser, signIn, signUp, confirmSignUp, signOut, resetPassword, confirmResetPassword, resendSignUpCode} from 'aws-amplify/auth';

// These four values are PUBLIC browser configuration, not IAM credentials or secrets.
// Region, user-pool, app-client and API values match the existing Orbit-Backend stack.
export const config = {
  region: import.meta.env.VITE_AWS_REGION,
  poolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  apiUrl: (import.meta.env.VITE_API_URL || '').replace(/\/$/, ''),
};
export const cloudEnabled = Boolean(config.region && config.poolId && config.clientId && config.apiUrl);

if (cloudEnabled) {
  Amplify.configure({Auth: {Cognito: {
    userPoolId: config.poolId,
    userPoolClientId: config.clientId,
    signUpVerificationMethod: 'code',
    loginWith: {email: true},
  }}});
}

const networkProblem = err => {
  const message = String(err?.message || '');
  return (typeof navigator !== 'undefined' && navigator.onLine === false)
    || /network|fetch|internet|disconnected|offline|ERR_INTERNET|Failed to fetch/i.test(message);
};

export function helpfulCloudError(err) {
  if (networkProblem(err)) return new Error('Cannot reach AWS right now. Check your internet, VPN or firewall and choose Retry sync. Your account and cloud data are safe.');
  if (err?.name === 'NotAuthorizedException') return new Error('Sign-in was rejected or your session expired. Please sign in again.');
  if (err?.name === 'UserNotConfirmedException') return new Error('Confirm your account using the verification code from your email.');
  return err instanceof Error ? err : new Error('AWS connection failed. Please retry.');
}

// Reads claims already provided in Cognito's signed ID token rather than requiring
// an extra GetUser HTTP call every time the workspace refreshes.
export async function currentIdentity() {
  const user = await getCurrentUser();
  const session = await fetchAuthSession();
  const claims = session.tokens?.idToken?.payload || {};
  const email = typeof claims.email === 'string' ? claims.email : '';
  const name = typeof claims.name === 'string' ? claims.name : (email.split('@')[0] || user.username || 'Member');
  return {userId: user.userId, name, email};
}

const isAlreadySignedIn = err => err?.name === 'UserAlreadyAuthenticatedException'
  || /already a signed in user|already signed in user|already signed in/i.test(err?.message || '');

// Amplify deliberately refuses signIn() when its browser cache has an existing user.
// Reuse the same account; only switch sessions when the user explicitly provides
// a different email in the sign-in form.
export async function signInOrResume(email, password) {
  const username = email.trim().toLowerCase();
  try {
    return await signIn({username, password});
  } catch (err) {
    if (!isAlreadySignedIn(err)) throw helpfulCloudError(err);
    const existing = await currentIdentity().catch(error => {throw helpfulCloudError(error);});
    if (!existing.email || existing.email.toLowerCase() === username) {
      return {isSignedIn: true, resumed: true};
    }
    await signOut();
    return signIn({username, password});
  }
}

export const auth = {signIn: signInOrResume, signUp, confirmSignUp, signOut, resetPassword, confirmResetPassword, resendSignUpCode};

export async function request(path, method = 'GET', body) {
  let session;
  try {session = await fetchAuthSession();}
  catch (err) {throw helpfulCloudError(err);}
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Your AWS session is unavailable. Sign in again.');

  let response;
  try {
    response = await fetch(config.apiUrl + path, {
      method,
      headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {throw helpfulCloudError(err);}

  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('AWS rejected this session (401). Sign out and sign in again.');
    if (response.status === 403) throw new Error(value.error || 'Your account does not have permission for this action (403).');
    if (response.status >= 500) throw new Error(value.error || `Orbit's AWS backend returned ${response.status}. Check CloudWatch logs.`);
    throw new Error(value.error || `AWS request failed (${response.status}).`);
  }
  return value;
}
