import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Input, Stack } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import type { ApiError } from '@/types/api'

export function RegisterPage() {
  useDocumentTitle('Đăng ký')
  const { register } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' })
  const [confirmError, setConfirmError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (form.password !== form.confirm) {
      setConfirmError('Mật khẩu nhập lại không khớp')
      return
    }
    setConfirmError('')
    setIsLoading(true)

    try {
      await register({ fullName: form.fullName, email: form.email, password: form.password })
      toast.success('Tạo tài khoản thành công')
      navigate(ROUTES.dashboard, { replace: true })
    } catch (err) {
      toast.error('Đăng ký thất bại', (err as ApiError).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <h1 className="text-xl font-semibold text-content">Tạo tài khoản</h1>
        <p className="mt-1 text-sm text-content-muted">Miễn phí, chỉ mất vài giây.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Input
            label="Họ và tên"
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Nguyễn Văn A"
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="ban@example.com"
          />
          <Input
            label="Mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            hint="Ít nhất 6 ký tự"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Input
            label="Nhập lại mật khẩu"
            type="password"
            autoComplete="new-password"
            required
            error={confirmError || undefined}
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />

          <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
            Đăng ký
          </Button>
        </Stack>
      </form>

      <p className="text-center text-sm text-content-muted">
        Đã có tài khoản?{' '}
        <Link to={ROUTES.login} className="font-medium text-brand-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </Stack>
  )
}
