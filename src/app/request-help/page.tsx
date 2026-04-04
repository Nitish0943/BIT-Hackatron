'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';
import OfflineBanner from '@/components/OfflineBanner';
import { MapPin, Mic, Send, Users, Phone, AlertCircle, CheckCircle, WifiOff } from 'lucide-react';

const CATEGORIES = [
  { id: 'medical', label: 'Medical Help', icon: '🏥', color: '#dc2626', bg: '#fef2f2', desc: 'Doctor / Medicine' },
  { id: 'rescue', label: 'Rescue', icon: '🚨', color: '#d97706', bg: '#fff7ed', desc: 'Trapped / Danger' },
  { id: 'food', label: 'Food', icon: '🍱', color: '#2563eb', bg: '#eff6ff', desc: 'Hungry / Starving' },
  { id: 'water', label: 'Water', icon: '💧', color: '#0891b2', bg: '#ecfeff', desc: 'Drinking Water' },
  { id: 'shelter', label: 'Shelter', icon: '🏠', color: '#7c3aed', bg: '#faf5ff', desc: 'Home Damaged' },
];

export default function RequestHelpPage() {
  const router = useRouter();
  const { createRequest, state, toggleOnline } = useApp();

  const [selectedCat, setSelectedCat] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [familySize, setFamilySize] = useState(1);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [error, setError] = useState('');

  const handleLocate = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setLocating(false);
      },
      () => {
        setAddress('Chennai, Tamil Nadu (GPS unavailable)');
        setLocating(false);
      }
    );
  };

  const handleSubmit = () => {
    if (!selectedCat) { setError('Please select a help category'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    if (!phone.trim() || phone.length < 10) { setError('Please enter a valid phone number'); return; }
    setError('');

    const id = createRequest({
      name: name.trim(),
      phone: phone.trim(),
      category: selectedCat as any,
      status: 'pending',
      location: {
        lat: 13.08 + Math.random() * 0.1,
        lng: 80.27 + Math.random() * 0.1,
        address: address || 'Chennai, Tamil Nadu',
      },
      familySize,
      source: 'web',
      description: `${selectedCat} help needed for ${familySize} family member(s).`,
      zone: 'Zone A – North',
    });

    setRequestId(id);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#f0f9ff' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 mb-4">Your request has been registered in the system.</p>
          <div className="rounded-xl p-4 mb-6" style={{ background: '#f0fdf4', border: '2px solid #16a34a' }}>
            <div className="text-sm text-gray-600">Your Request ID</div>
            <div className="text-3xl font-black text-green-700 mt-1">{requestId}</div>
            <div className="text-xs text-gray-500 mt-2">Save this ID to track your request status</div>
          </div>
          {!state.isOnline && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 mb-4 text-sm">
              <WifiOff size={16} className="text-amber-600" />
              <span className="text-amber-700">Saved offline. Will sync when connectivity returns.</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push(`/request-status?id=${requestId}`)}
              className="py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: '#1a3a6b' }}
            >
              Track Status
            </button>
            <button
              onClick={() => { setSubmitted(false); setSelectedCat(''); setName(''); setPhone(''); setFamilySize(1); }}
              className="py-3 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-700"
            >
              New Request
            </button>
          </div>
        </div>
        <OfflineBanner />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🆘</div>
          <h1 className="text-2xl font-black text-gray-800">Request Emergency Help</h1>
          <p className="text-gray-500 text-sm mt-2">Select what you need. We will send help to you.</p>

          {/* Offline toggle for demo */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-xs text-gray-500">Simulate Offline:</span>
            <button
              onClick={() => toggleOnline(!state.isOnline)}
              className={`w-10 h-5 rounded-full transition-colors ${state.isOnline ? 'bg-gray-300' : 'bg-red-500'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white mx-0.5 transition-transform ${state.isOnline ? '' : 'translate-x-5'}`} />
            </button>
            <span className="text-xs font-semibold" style={{ color: state.isOnline ? '#16a34a' : '#dc2626' }}>
              {state.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Category Picker */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="font-bold text-gray-700 mb-4 text-sm">Step 1: What do you need?</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`cat-btn ${selectedCat === cat.id ? 'selected' : ''}`}
                style={{
                  background: selectedCat === cat.id ? cat.bg : '#fafafa',
                  color: selectedCat === cat.id ? cat.color : '#374151',
                  borderColor: selectedCat === cat.id ? cat.color : 'transparent',
                }}
                onClick={() => setSelectedCat(cat.id)}
              >
                <span className="text-4xl">{cat.icon}</span>
                <span className="font-bold">{cat.label}</span>
                <span className="text-xs opacity-70">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="font-bold text-gray-700 mb-4 text-sm">Step 2: Your details</div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name</label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-blue-500 outline-none"
                placeholder="Enter your name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Phone Number <Phone size={12} className="inline" /></label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-blue-500 outline-none"
                placeholder="10-digit mobile number"
                type="tel"
                maxLength={10}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                <Users size={12} className="inline mr-1" />Family Members (including yourself)
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFamilySize(Math.max(1, familySize - 1))}
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 text-2xl font-bold flex items-center justify-center hover:bg-gray-100"
                >−</button>
                <span className="text-3xl font-black text-gray-800 w-12 text-center">{familySize}</span>
                <button
                  onClick={() => setFamilySize(Math.min(30, familySize + 1))}
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 text-2xl font-bold flex items-center justify-center hover:bg-gray-100"
                >+</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1"><MapPin size={12} className="inline mr-1" />Location</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                  placeholder="Your address or landmark"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
                <button
                  onClick={handleLocate}
                  disabled={locating}
                  className="px-4 py-3 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#1a3a6b' }}
                >
                  {locating ? '...' : '📍 Auto'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Voice button (UI only) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex items-center gap-4">
          <button className="w-14 h-14 rounded-full flex items-center justify-center text-white"
            style={{ background: '#dc2626' }}
          >
            <Mic size={24} />
          </button>
          <div>
            <div className="font-semibold text-gray-700 text-sm">Voice Input</div>
            <div className="text-xs text-gray-500">Tap microphone to speak your request</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-3">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="w-full py-5 rounded-2xl text-white text-xl font-black flex items-center justify-center gap-3 transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 6px 24px rgba(220,38,38,0.4)' }}
        >
          <Send size={24} />
          SUBMIT EMERGENCY REQUEST
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">
          For life-threatening emergencies, also call: <strong>112</strong> | NDMA Helpline: <strong>1078</strong>
        </p>
      </div>
      <OfflineBanner />
    </div>
  );
}
