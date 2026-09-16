import { useId, type SelectHTMLAttributes } from 'react'

import { Field } from './Field'
import { CONTROL_BASE, CONTROL_INVALID } from './control-styles'

import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export function Select({
  label,
  hint,
  error,
  required,
  options,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <Field id={selectId} label={label} hint={hint} error={error} required={required}>
      <select
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn(CONTROL_BASE, 'h-10', error && CONTROL_INVALID, className)}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  )
}
