import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { Container } from './Container'

import { cn } from '@/utils/cn'

export interface NavItem {
  to: string
  label: string
}

export interface NavbarProps {
  /** Tên hoặc logo bên trái, bấm vào sẽ về trang chủ. */
  brand: ReactNode
  brandTo: string
  items?: NavItem[]
  /** Vùng bên phải: nút đăng nhập, tên người dùng, nút đăng xuất... */
  actions?: ReactNode
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-control px-3 py-2 text-sm font-medium transition',
    isActive ? 'bg-brand-50 text-brand-700' : 'text-content-muted hover:bg-surface-sunken',
  )

export function Navbar({ brand, brandTo, items = [], actions }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-[var(--z-navbar)] border-b border-border bg-surface">
      <Container>
        <div className="flex h-16 items-center gap-6">
          <Link to={brandTo} className="text-lg font-bold text-brand-600">
            {brand}
          </Link>

          {/* Menu ngang cho màn hình rộng */}
          {items.length > 0 && (
            <nav className="hidden items-center gap-1 md:flex">
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            {actions}

            {/* Nút ba gạch chỉ hiện trên màn hình hẹp */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-expanded={isMenuOpen}
                aria-label="Mở menu"
                className="rounded-control p-2 text-content-muted transition hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 md:hidden"
              >
                <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden>
                  <path
                    d={isMenuOpen ? 'M5 5l10 10M15 5L5 15' : 'M3 6h14M3 10h14M3 14h14'}
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Menu dọc bung ra trên màn hình hẹp */}
        {isMenuOpen && items.length > 0 && (
          <nav className="flex flex-col gap-1 border-t border-border py-3 md:hidden">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={linkClass}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </Container>
    </header>
  )
}
