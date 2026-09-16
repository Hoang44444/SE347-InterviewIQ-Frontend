import { useId, type TextareaHTMLAttributes } from 'react'

import { Field } from './Field'
import { CONTROL_BASE, CONTROL_INVALID } from './control-styles'

import { cn } from '@/utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, required, className, id, ...rest }: TextareaProps) {
  const autoId = useId()
  const textareaId = id ?? autoId

  return (
    <Field id={textareaId} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
        className={cn(CONTROL_BASE, 'min-h-24 py-2', error && CONTROL_INVALID, className)}
        {...rest}
      />
    </Field>
  )
}
