'use client';

import Link from 'next/link';
import { useApp } from '@/lib/store';
import StatCard from '@/components/StatCard';
import dynamic from 'next/dynamic';
import { Shield, AlertTriangle, ChevronRight, Users, Package, MapPin } from 'lucide-react';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function HomePage() {
  const { state } = useApp();

  const activeRequests = state.requests.filter(r => r.status !== 'completed').length;
  const criticalZones = state.requests.filter(r => r.priority >= 60 && r.status === 'pending').length;
  const volunteersOnline = state.volunteers.filter(v => v.status !== 'offline').length;
  const completedToday = state.requests.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0a1628 0%, #112240 60%, #1a3a6b 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 py-12 text-white">
          {/* Government header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="text-5xl">🇮🇳</div>
            <div>
              <div className="text-blue-300 text-sm font-semibold tracking-widest uppercase">Government of India | NDMA</div>
              <h1 className="text-3xl md:text-4xl font-black mt-1">SahayakNet</h1>
              <p className="text-blue-200 text-base mt-1">Multi-Channel AI Disaster Coordination System</p>
            </div>
          </div>

          {/* Alert Banner */}
          <div className="rounded-xl px-5 py-3 flex items-center gap-3 mb-8" style={{ background: '#7f1d1d55', border: '1px solid #dc2626' }}>
            <AlertTriangle size={20} className="text-red-400 animate-pulse shrink-0" />
            <div>
              <span className="text-red-300 font-bold text-sm">🚨 ACTIVE ALERT: </span>
              <span className="text-red-200 text-sm">Major flood event – Kancheepuram, Chennai coastal districts. All units on high alert.</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <StatCard value={activeRequests} label="Active Requests" icon="📋" color="#dc2626" urgent={activeRequests > 30} />
            <StatCard value={volunteersOnline} label="Volunteers Active" icon="🦺" color="#16a34a" />
            <StatCard value={criticalZones} label="Critical Pending" icon="🚨" color="#d97706" urgent={criticalZones > 5} />
            <StatCard value={completedToday} label="Requests Resolved" icon="✅" color="#2563eb" />
          </div>

          {/* CTA Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Link href="/request-help"
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-lg transition-transform hover:scale-105 no-underline"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 24px rgba(220,38,38,0.4)' }}
            >
              <span className="text-3xl">🚨</span>
              <div>
                <div>Request Help</div>
                <div className="text-red-200 text-xs font-normal">Get immediate disaster assistance</div>
              </div>
            </Link>
            <Link href="/volunteer/apply"
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-lg transition-transform hover:scale-105 no-underline"
              style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 4px 24px rgba(22,163,74,0.4)' }}
            >
              <span className="text-3xl">🙋</span>
              <div>
                <div>Become Volunteer</div>
                <div className="text-green-200 text-xs font-normal">Register to help your community</div>
              </div>
            </Link>
            <Link href="/admin"
              className="flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-lg transition-transform hover:scale-105 no-underline"
              style={{ background: 'linear-gradient(135deg,#1a3a6b,#1e40af)', boxShadow: '0 4px 24px rgba(26,58,107,0.4)' }}
            >
              <span className="text-3xl">🏛️</span>
              <div>
                <div>Admin Control</div>
                <div className="text-blue-200 text-xs font-normal">NGO & Government dashboard</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Map Preview */}
      <div className="max-w-7xl mx-auto px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <span className="font-bold text-gray-800">Live Disaster Map – Chennai District</span>
              <span className="pulse-dot ml-2"></span>
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Medical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>Rescue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>Food</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>Volunteers</span>
            </div>
          </div>
          <MapView requests={state.requests.slice(0, 30)} volunteers={state.volunteers.slice(0, 10)} height="380px" showHeatmap mini />
        </div>
      </div>

      {/* 3-Layer Architecture */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="gov-badge inline-block mb-3">System Architecture</div>
          <h2 className="text-2xl font-black text-gray-800">3-Layer Coordination System</h2>
          <p className="text-gray-500 text-sm mt-2">Connecting every stakeholder in the disaster response chain</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '👥', title: 'Citizen Layer', color: '#dc2626', desc: 'Citizens submit requests via Web, IVR, WhatsApp or Missed Call. Low-literacy UI with icon-based navigation.', items: ['Request Help', 'Track Status', 'Multi-channel input'] },
            { icon: '🦺', title: 'Volunteer Layer', color: '#16a34a', desc: 'Registered volunteers receive AI-assigned tasks, navigate to victims and mark completion with proof.', items: ['Task Dashboard', 'AI Assignment', 'Completion Tracking'] },
            { icon: '🏛️', title: 'Admin Layer', color: '#1a3a6b', desc: 'NGO coordinators and Government officials monitor the full operation, manage resources and broadcast alerts.', items: ['Control Room Map', 'Resource Management', 'AI Predictions'] },
          ].map((layer) => (
            <div key={layer.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 card-hover">
              <div className="text-4xl mb-3">{layer.icon}</div>
              <h3 className="font-bold text-lg mb-2" style={{ color: layer.color }}>{layer.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{layer.desc}</p>
              <ul className="space-y-1.5">
                {layer.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                    <ChevronRight size={14} style={{ color: layer.color }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div style={{ background: '#0a1628' }} className="py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-blue-300 text-sm mb-4">Quick Access Portals</div>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { href: '/request-status', label: '🔍 Track My Request' },
              { href: '/volunteer/dashboard', label: '📋 Volunteer Tasks' },
              { href: '/government', label: '⚡ Government View' },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className="px-4 py-2 rounded-lg border border-blue-700 text-blue-200 text-sm hover:bg-blue-800 transition-colors no-underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
