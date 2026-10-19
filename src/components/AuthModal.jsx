import React, {useState} from 'react';
import {X, ArrowRight, ShieldCheck} from 'lucide-react';
import {auth, helpfulCloudError} from '../lib/cloud';

const tidy = value => value.trim().toLowerCase();

export default function AuthModal({open, onClose, onSuccess}) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const switchMode = next => {setMode(next); setError(''); setMessage(''); setCode('');};
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    const username = tidy(email);
    try {
      if (mode === 'register') {
        const result = await auth.signUp({username, password, options: {userAttributes: {email: username, name: name.trim()}}});
        if (result.isSignUpComplete) {
          const signInResult = await auth.signIn(username, password);
          if (signInResult.isSignedIn) {onSuccess(); return;}
        }
        setMode('verify'); setMessage('We emailed you a verification code.');
      } else if (mode === 'verify') {
        await auth.confirmSignUp({username, confirmationCode: code.trim()});
        const result = await auth.signIn(username, password);
        if (result.isSignedIn) {onSuccess(); return;}
        setMode('signin'); setMessage('Email verified! Sign in to continue.');
      } else if (mode === 'signin') {
        const result = await auth.signIn(username, password);
        if (result.isSignedIn) onSuccess();
        else setError('Your account needs an additional sign-in step. Check your Cognito authentication settings.');
      } else if (mode === 'forgot') {
        const result = await auth.resetPassword({username});
        if (result.nextStep?.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
          setMode('reset'); setMessage('Check your email for the password reset code.');
        } else {setMode('signin'); setMessage('Follow the recovery instructions provided by Cognito.');}
      } else if (mode === 'reset') {
        await auth.confirmResetPassword({username, confirmationCode: code.trim(), newPassword: password});
        setMode('signin'); setMessage('Password updated. You can now sign in.');
      }
    } catch (err) {
      if (err?.name === 'UsernameExistsException' && mode === 'register') {
        setError('This email already has an account. Select Sign in, or use Forgot password.');
      } else if (err?.name === 'UserNotConfirmedException') {
        setMode('verify'); setError('This account still needs email verification. Enter the code or resend it.');
      } else {
        setError(helpfulCloudError(err).message || 'Unable to complete this action.');
      }
    } finally {setBusy(false);}
  };
  const resend = async () => {
    setBusy(true); setError(''); setMessage('');
    try {await auth.resendSignUpCode({username: tidy(email)}); setMessage('A new verification code was sent.');}
    catch (err) {setError(helpfulCloudError(err).message);}
    finally {setBusy(false);}
  };
  const heading = mode === 'register' ? 'Start your own orbit.' : mode === 'verify' ? 'Check your inbox.' : mode === 'forgot' ? 'Reset your password.' : mode === 'reset' ? 'Choose a new password.' : 'Welcome back.';
  const intro = mode === 'register' ? 'Your plans, projects, and people — beautifully in sync.' : mode === 'verify' ? 'Enter the code Amazon Cognito sent to your email.' : mode === 'forgot' ? 'Enter your email address to receive a recovery code.' : mode === 'reset' ? 'Enter the recovery code and your new password.' : 'Sign in to sync your tasks and collaborate with friends.';

  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="modal auth-modal" role="dialog" aria-modal="true">
      <div className="modal-title-row"><span className="brand-mark"><span/></span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div>
      <div className="eyebrow">A SPACE THAT'S YOURS</div><h2>{heading}</h2><p className="muted">{intro}</p>
      <form className="form-stack auth-fields" onSubmit={submit}>
        {mode === 'register' && <label className="field-label">Your name<input required className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" maxLength={60}/></label>}
        {mode !== 'verify' && mode !== 'reset' && <label className="field-label">Email address<input required type="email" autoComplete="email" className="field" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"/></label>}
        {['register', 'signin', 'reset'].includes(mode) && <label className="field-label">{mode === 'reset' ? 'New password' : 'Password'}<input required type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className="field" value={password} onChange={e => setPassword(e.target.value)} minLength={8} placeholder="8+ characters"/></label>}
        {['verify', 'reset'].includes(mode) && <label className="field-label">Email verification code<input required className="field" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} placeholder="6-digit code"/></label>}
        {mode === 'verify' && <div className="auth-switch"><button type="button" onClick={resend} disabled={busy}>Resend verification code</button></div>}
        {message && <div className="auth-message" role="status">{message}</div>}
        {error && <div className="error-text" role="alert">{error}</div>}
        <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? 'Working...' : mode === 'register' ? 'Create account' : mode === 'verify' ? 'Verify and sign in' : mode === 'forgot' ? 'Send reset code' : mode === 'reset' ? 'Reset password' : 'Sign in'}<ArrowRight size={18}/></button>
      </form>
      <p className="auth-switch">{mode === 'signin' ? <>New around here? <button type="button" onClick={() => switchMode('register')}>Create an account</button> <span aria-hidden="true">·</span> <button type="button" onClick={() => switchMode('forgot')}>Forgot password?</button></> : mode === 'register' ? <>Already have an account? <button type="button" onClick={() => switchMode('signin')}>Sign in</button></> : <button type="button" onClick={() => switchMode('signin')}>Back to sign in</button>}</p>
      <div className="auth-note"><ShieldCheck size={15}/> Powered by Amazon Cognito. You control your private workspace.</div>
    </div>
  </div>;
}
