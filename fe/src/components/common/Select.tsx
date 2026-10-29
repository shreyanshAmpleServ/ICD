import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cx } from '@/ds/components';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: (string | [string, string])[];
  xl?: boolean;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, className, xl, error, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cx('select', xl && 'select-xl', error && 'select-error', className)}
        {...props}
      >
        {children ??
          (options ?? []).map((o) => {
            const [v, l] = Array.isArray(o) ? o : [o, o];
            return (
              <option key={v} value={v}>
                {l}
              </option>
            );
          })}
      </select>
    );
  }
);

Select.displayName = 'Select';

export { Segmented, Chips, Tabs } from '@/ds/components';

export default Select;

