import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useSession } from '@/app/session';
import type { Grant } from '@/app/roles';
import { Lock } from 'lucide-react';
import { cx } from '@/ds/components';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'xl';
  icon?: ReactNode;
  perm?: string;
  level?: Grant;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      icon,
      perm,
      level = 'DO',
      loading = false,
      className,
      children,
      title,
      disabled,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const { can } = useSession();
    const allowed = can(perm, level);
    const viaRequest = !!perm && !allowed && level === 'DO' && can(perm, 'REQ');
    const blocked = !allowed && !viaRequest;

    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          'btn',
          variant !== 'secondary' && `btn-${variant}`,
          size !== 'md' && `btn-${size}`,
          !children && 'btn-icon',
          loading && 'btn-loading',
          className
        )}
        disabled={disabled || blocked || loading}
        title={blocked ? `Needs permission ${perm}` : viaRequest ? 'Sends an approval request' : title}
        {...rest}
      >
        {blocked ? <Lock size={14} /> : icon}
        {children}
        {viaRequest && <span className="xs faint">(request)</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

