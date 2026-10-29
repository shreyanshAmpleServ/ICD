import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, Loader2, ArrowLeft, Building2, Shield } from 'lucide-react';
import { Button, Input, Field, Select, Banner } from '@/ds/components';
import { useLoginMutation } from '../hooks/useAuth';
import { SITES } from '@/app/session';
import { ROLES } from '@/app/roles';

interface LoginFormProps {
  onSuccess?: () => void;
  defaultRedirect?: string;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  // Step 1: Credentials (User & Password)
  // Step 2: Role & Facility Selection (Two-Step Sign-In: Grant roles after user is added)
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState('ashok.kumar');
  const [password, setPassword] = useState('Dcc2026!');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 selection state
  const [selectedSite, setSelectedSite] = useState('DAR1');
  const [selectedRole, setSelectedRole] = useState('ICD_ADMIN');
  const [twoStepInfo, setTwoStepInfo] = useState<{
    username?: string;
    title?: string;
    availableSites?: string[];
    grantedRoles?: Array<{ roleCode: string; siteId?: number | null }>;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const loginMutation = useLoginMutation();

  const handleStep1Submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Please enter your username.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    try {
      const res = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
        step: 1,
        rememberMe: true,
      });

      // If user requires Two-Step Sign-In, proceed to Step 2 (Role & Facility selection)
      if (res.requiresTwoStep) {
        setTwoStepInfo({
          username: res.username || username,
          title: res.title,
          availableSites: res.availableSites,
          grantedRoles: res.grantedRoles,
        });

        if (res.grantedRoles && res.grantedRoles.length > 0) {
          setSelectedRole(res.grantedRoles[0].roleCode);
          if (res.grantedRoles[0].siteId) {
            const code = res.grantedRoles[0].siteId === 2 ? 'DAR2' : res.grantedRoles[0].siteId === 3 ? 'KBH1' : 'DAR1';
            setSelectedSite(code);
          }
        }

        setStep(2);
        return;
      }

      // Single-step user: direct login completed
      onSuccess?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your username and password.');
    }
  };

  const handleStep2Submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const res = await loginMutation.mutateAsync({
        username: username.trim(),
        password,
        siteId: selectedSite,
        roleCode: selectedRole,
        step: 2,
        rememberMe: true,
      });

      if (!res.requiresTwoStep) {
        onSuccess?.();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to select role and facility. Please try again.');
    }
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setErrorMsg(null);
  };

  // Compute available role options for Step 2
  const roleOptions: [string, string][] = (() => {
    if (twoStepInfo?.grantedRoles && twoStepInfo.grantedRoles.length > 0) {
      return twoStepInfo.grantedRoles.map((g) => {
        const found = ROLES.find((r) => r.code === g.roleCode);
        return [g.roleCode, found?.name || g.roleCode];
      });
    }
    return ROLES.map((r) => [r.code, r.name]);
  })();

  // ---------------------------------------------------- STEP 2: TWO-STEP SIGN-IN (ROLE & FACILITY)
  if (step === 2) {
    return (
      <form onSubmit={handleStep2Submit} className="auth-form" noValidate>
        {errorMsg && (
          <Banner tone="stop" title="Sign in failed">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          </Banner>
        )}

        {/* User Context Header */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              background: 'var(--hivis-soft)',
              color: 'var(--hivis)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Shield size={22} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: '#ffffff' }}>
              {twoStepInfo?.username || username}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--hivis)', marginTop: '2px' }}>
              Two-step sign-in: Select granted role and facility
            </div>
          </div>
        </div>

        {/* Operating Facility */}
        <Field label="Assigned Facility (Site)" required hint="Terminal facility for this work session">
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                pointerEvents: 'none',
                display: 'flex',
                zIndex: 1,
              }}
            >
              <Building2 size={16} />
            </span>
            <Select
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
              options={SITES.map((s) => [s.siteCode, `${s.siteCode} — ${s.siteName}`])}
              disabled={loginMutation.isPending}
            />
          </div>
        </Field>

        {/* Operating Role */}
        <Field label="Operating Role" required hint="Role granted to your account">
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-3)',
                pointerEvents: 'none',
                display: 'flex',
                zIndex: 1,
              }}
            >
              <Shield size={16} />
            </span>
            <Select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ paddingLeft: '38px', width: '100%' }}
              options={roleOptions}
              disabled={loginMutation.isPending}
            />
          </div>
        </Field>

        {/* Confirm Button */}
        <Button
          variant="primary"
          type="submit"
          disabled={loginMutation.isPending}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: 'var(--fs-md)',
            fontWeight: 600,
            background: 'var(--hivis)',
            color: 'var(--hivis-ink)',
            boxShadow: '0 2px 8px rgba(245, 196, 0, 0.35)',
          }}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 size={18} className="spin" />
              <span>Entering terminal...</span>
            </>
          ) : (
            <>
              <span>Enter Terminal</span>
              <ArrowRight size={18} />
            </>
          )}
        </Button>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleBackToStep1}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              fontSize: 'var(--fs-xs)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'underline',
              padding: '6px 12px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to username & password</span>
          </button>
        </div>
      </form>
    );
  }

  // ---------------------------------------------------- STEP 1: USERNAME & PASSWORD
  return (
    <form onSubmit={handleStep1Submit} className="auth-form" noValidate>
      {errorMsg && (
        <Banner tone="stop" title="Sign in failed">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        </Banner>
      )}

      {/* Username */}
      <Field label="Username" required>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-3)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <User size={16} />
          </span>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{ paddingLeft: '38px', width: '100%' }}
            required
            autoComplete="username"
            disabled={loginMutation.isPending}
          />
        </div>
      </Field>

      {/* Password */}
      <Field label="Password" required>
        <div style={{ position: 'relative' }}>
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-3)',
              pointerEvents: 'none',
              display: 'flex',
            }}
          >
            <Lock size={16} />
          </span>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            style={{ paddingLeft: '38px', paddingRight: '40px', width: '100%' }}
            required
            autoComplete="current-password"
            disabled={loginMutation.isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              display: 'flex',
              padding: '4px',
            }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      {/* Submit Button */}
      <Button
        variant="primary"
        type="submit"
        disabled={loginMutation.isPending}
        style={{
          width: '100%',
          marginTop: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: 'var(--fs-md)',
          fontWeight: 600,
          background: 'var(--hivis)',
          color: 'var(--hivis-ink)',
          boxShadow: '0 2px 8px rgba(245, 196, 0, 0.35)',
        }}
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 size={18} className="spin" />
            <span>Checking credentials...</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight size={18} />
          </>
        )}
      </Button>
    </form>
  );
}
