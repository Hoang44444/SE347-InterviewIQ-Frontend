import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Button, Input, Stack } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/hooks/useToast'
import { ROUTES } from '@/routes/paths'
import type { ApiError } from '@/types/api'

export function LoginPage() {
  useDocumentTitle('Đăng nhập')
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      await login(form)
      toast.success('Đăng nhập thành công')
      // Quay lại trang người dùng định vào trước khi bị chặn.
      const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
      navigate(from ?? ROUTES.dashboard, { replace: true })
    } catch (err) {
      const message = (err as ApiError).message || 'Đăng nhập thất bại'
      setError(message)
      toast.error('Đăng nhập thất bại', message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <h1 className="text-xl font-semibold text-content">Đăng nhập</h1>
        <p className="mt-1 text-sm text-content-muted">
          Tiếp tục hành trình luyện phỏng vấn của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
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
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="********"
          />

          {error && (
            <p
              role="alert"
              className="rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
            Đăng nhập
          </Button>
        </Stack>
      </form>

      <p className="text-center text-sm text-content-muted">
        Chưa có tài khoản?{' '}
        <Link to={ROUTES.register} className="font-medium text-brand-600 hover:underline">
          Đăng ký
        </Link>
      </p>
    </Stack>
  )
}
