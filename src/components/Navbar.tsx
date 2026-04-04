'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useApp } from '@/lib/store';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/citizen', label: 'Citizen Portal' },
  { href: '/volunteer/dashboard', label: 'Volunteer Portal' },
  { href: '/government', label: 'Government Dashboard' },
  { href: '/request-status', label: 'Track Request' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { state, logout } = useApp();

  return (
    <header className="site-header sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="h-10 w-10 rounded-md flex items-center justify-center border border-slate-300 bg-white text-sm font-bold text-[#0b3c5d]">IN</div>
            <div>
              <div className="font-bold text-base leading-tight text-[#0b3c5d]">SahayakNet</div>
              <div className="text-xs text-slate-500 leading-tight">Disaster Coordination Platform</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-[#0b3c5d] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {state.user.role ? (
              <button onClick={logout} className="px-3 py-2 rounded-md text-sm border border-slate-300 text-slate-700 hover:bg-slate-100">
                Logout ({state.user.role})
              </button>
            ) : (
              <Link href="/login/government" className="px-3 py-2 rounded-md text-sm bg-[#0b3c5d] text-white no-underline">
                Login
              </Link>
            )}
          </div>

          <button
            className="md:hidden text-[#0b3c5d] p-2"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 border-t border-slate-200 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 text-sm font-medium rounded-md mb-1 ${
                  pathname === link.href
                    ? 'bg-[#0b3c5d] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
