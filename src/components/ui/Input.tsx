import { useId, type InputHTMLAttributes } from 'react'

import { Field } from './Field'
import { CONTROL_BASE, CONTROL_INVALID } from './control-styles'

import { cn } from '@/utils/cn'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, required, className, id, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <Field id={inputId} label={label} hint={hint} error={error} required={required}>
      <input
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(CONTROL_BASE, 'h-10', error && CONTROL_INVALID, className)}
        {...rest}
      />
    </Field>
  )
}
