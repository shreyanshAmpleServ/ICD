import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/ds/components';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  xl?: boolean;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ xl, error, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cx('input', xl && 'input-xl', error && 'input-error', className)}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <div className="input-icon">
        {icon}
        <input ref={ref} className={cx('input', className)} {...props} />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  span?: number;
}

export function Field({ label, hint, error, required, children, span }: FieldProps) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label>
        {label}
        {required && <span className="req" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <span className="err">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export default Input;

