import type { ReactNode } from 'react';
import { ShieldCheck, Container, Radio, Lock } from 'lucide-react';

interface AuthLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({
  title = 'NG ICD',
  subtitle = 'DCC Logistics & Container Terminal Suite',
  children,
}: AuthLayoutProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(ellipse at top, #1e3a4a 0%, #101c24 70%, #0a1217 100%)',
        position: 'relative',
        padding: '24px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      {/* Background Decorative Grid Lines (Container Yard Map aesthetic) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle Glow Spheres */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 196, 0, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45, 104, 173, 0.18) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Glassmorphic Auth Card */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '460px',
          background: 'rgba(26, 44, 54, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          padding: '36px 32px',
          zIndex: 1,
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f5c400 0%, #e0ac00 100%)',
              color: '#172a35',
              boxShadow: '0 4px 16px rgba(245, 196, 0, 0.4)',
              marginBottom: '16px',
            }}
          >
            <Container size={30} strokeWidth={2.2} />
          </div>

          <h1
            style={{
              fontSize: '26px',
              fontWeight: 700,
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
              color: '#ffffff',
              fontFamily: 'var(--font)',
            }}
          >
            {title}
          </h1>
          <div
            style={{
              fontSize: '14px',
              color: '#9cb0bd',
              maxWidth: '320px',
              margin: '0 auto',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* Form Body */}
        {children}

        {/* Footer Security Badging */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontSize: '12px',
            color: '#7e96a4',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Lock size={13} style={{ color: '#f5c400' }} />
            <span>Cookie Token Auth</span>
          </span>
          <span>•</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} style={{ color: '#1d7f55' }} />
            <span>RBAC Protected</span>
          </span>
        </div>
      </div>

      {/* Terminal Live Telemetry Banner */}
      <div
        style={{
          marginTop: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: '#8da2b0',
          background: 'rgba(0, 0, 0, 0.25)',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          zIndex: 1,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#48bb78' }}>
          <Radio size={12} className="spin" />
          <span>DAR1 Online</span>
        </span>
        <span>•</span>
        <span>Gates 1–4 Active</span>
        <span>•</span>
        <span>Yard Capacity 74%</span>
      </div>
    </div>
  );
}
