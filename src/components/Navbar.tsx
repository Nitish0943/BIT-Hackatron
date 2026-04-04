'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Shield, Menu, X, AlertTriangle, ChevronDown } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/request-help', label: '🚨 Request Help' },
  { href: '/request-status', label: 'Track Request' },
  { href: '/volunteer/apply', label: 'Volunteer' },
  { href: '/volunteer/dashboard', label: 'Vol. Dashboard' },
  { href: '/admin', label: '🏛 Admin' },
  { href: '/government', label: '⚡ Gov Control' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50" style={{ background: '#0a1628', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
      {/* Top government strip */}
      <div style={{ background: '#112240', borderBottom: '1px solid #1e3a5f' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-8">
          <div className="flex items-center gap-3">
            <span className="text-xs text-blue-300 font-medium">🇮🇳 Government of India</span>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-xs text-gray-400">Ministry of Home Affairs – NDMA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="pulse-dot"></span>
            <span className="text-xs text-green-400 font-medium">System Active</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 text-white no-underline">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-base leading-tight text-white">SahayakNet</div>
              <div className="text-xs text-blue-300 leading-tight">Disaster Coordination System</div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-900 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Alert indicator */}
          <div className="hidden md:flex items-center gap-2 ml-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md" style={{ background: '#7f1d1d' }}>
              <AlertTriangle size={14} className="text-red-300" />
              <span className="text-xs text-red-300 font-semibold">FLOOD ALERT ACTIVE</span>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 border-t border-blue-900 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-2.5 text-sm font-medium rounded-md mb-1 ${
                  pathname === link.href
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-200 hover:bg-blue-900'
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
