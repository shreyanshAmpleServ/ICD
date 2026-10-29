import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { containerSchema, type ContainerFormValues } from '../../schemas/container.schema';
import { Button, Field, Input, Select } from '@/components/common';

export interface ContainerFormProps {
  initialValues?: Partial<ContainerFormValues>;
  onSubmit: (values: ContainerFormValues) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function ContainerForm({ initialValues, onSubmit, onCancel, loading }: ContainerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ContainerFormValues>({
    resolver: zodResolver(containerSchema) as any,
    mode: 'onBlur',
    defaultValues: {
      sealCondition: 'INTACT',
      ...initialValues,
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="form-grid">
      <Field label="Container No (ISO 6346)" required error={errors.unitNo?.message}>
        <Input
          {...register('unitNo')}
          placeholder="e.g. MSKU1234567"
          error={errors.unitNo?.message}
          autoFocus
        />
      </Field>

      <Field label="ISO Type Code" required error={errors.isoCode?.message}>
        <Input
          {...register('isoCode')}
          placeholder="e.g. 22G1, 42G1"
          error={errors.isoCode?.message}
        />
      </Field>

      <Field label="Seal Number" error={errors.sealNo?.message}>
        <Input
          {...register('sealNo')}
          placeholder="e.g. ML-129048"
          error={errors.sealNo?.message}
        />
      </Field>

      <Field label="Seal Condition">
        <Select
          {...register('sealCondition')}
          options={[
            ['INTACT', 'Intact'],
            ['BROKEN', 'Broken'],
            ['MISSING', 'Missing'],
            ['TAMPERED', 'Tampered'],
          ]}
        />
      </Field>

      <Field label="Tare Weight (kg)" required error={errors.tareWeightKg?.message}>
        <Input
          type="number"
          {...register('tareWeightKg', { valueAsNumber: true })}
          placeholder="e.g. 2200"
          error={errors.tareWeightKg?.message}
        />
      </Field>

      <Field label="Gross Weight (kg)" required error={errors.grossWeightKg?.message}>
        <Input
          type="number"
          {...register('grossWeightKg', { valueAsNumber: true })}
          placeholder="e.g. 24000"
          error={errors.grossWeightKg?.message}
        />
      </Field>

      <div className="row" style={{ gap: 8, gridColumn: '1 / -1', justifyContent: 'flex-end', marginTop: 16 }}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={loading || isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={!isValid || loading || isSubmitting}
        >
          {loading || isSubmitting ? 'Saving...' : 'Save Container'}
        </Button>
      </div>
    </form>
  );
}

export default ContainerForm;
