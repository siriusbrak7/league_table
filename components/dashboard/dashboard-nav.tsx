'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Printer,
  Users,
  KeyRound,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { CURRENT_TERM, CURRENT_YEAR } from '@/lib/config';

interface DashboardNavProps {
  onSignOut: () => Promise<void>;
}

export function DashboardNav({ onSignOut }: DashboardNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', label: 'Standings',   icon: LayoutDashboard },
    { href: '/entry',     label: 'Data Entry',  icon: FileSpreadsheet },
    { href: '/print',     label: 'Print',       icon: Printer },
    { href: '/students',  label: 'Students',    icon: Users },
    { href: '/admin/tokens', label: 'Links',    icon: KeyRound },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) return true;
    return pathname.startsWith(href);
  };

  return (
    <nav className="nav-root">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Wordmark */}
        <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2, textDecoration: 'none' }}>
          <span className="nav-wordmark">Physics League</span>
          <span style={{ fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
            {CURRENT_TERM} · {CURRENT_YEAR}
          </span>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, height: '100%' }} className="hidden md:flex">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link${active ? ' active' : ''}`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}

          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 8px' }} />

          <form action={onSignOut}>
            <button
              type="submit"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', background: 'none', border: 'none',
                color: 'var(--text-3)', fontSize: '0.72rem', fontWeight: 600,
                cursor: 'pointer', transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f85149')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <LogOut size={13} />
              Exit
            </button>
          </form>
        </div>

        {/* Mobile toggle */}
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: 6 }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          className="md:hidden"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '10px 16px 14px' }} className="md:hidden">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 6,
                  fontSize: '0.85rem', fontWeight: 500,
                  color: active ? 'var(--gold)' : 'var(--text-2)',
                  background: active ? 'var(--gold-glow)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <form action={onSignOut}>
              <button
                type="submit"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 6,
                  fontSize: '0.85rem', fontWeight: 500,
                  color: '#f85149', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
