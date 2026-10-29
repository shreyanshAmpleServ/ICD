import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginForm } from '../components/LoginForm';
import { authService } from '@/services/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/';

  // If already authenticated with active cookie token, skip login
  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  return (
    <AuthLayout
      title="NG ICD Logistics Suite"
      subtitle="Sign in with your username and password"
    >
      <LoginForm
        defaultRedirect={redirectPath}
        onSuccess={() => {
          navigate(redirectPath, { replace: true });
        }}
      />
    </AuthLayout>
  );
}

export default LoginPage;
