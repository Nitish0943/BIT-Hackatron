'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, CheckCircle, Car, User } from 'lucide-react';

const SKILLS = ['First Aid', 'Swimming', 'Boat Operation', 'Medical/CPR', 'Search & Rescue', 'Driving', 'Cooking', 'Communication/Radio', 'Water Purification', 'Counselling', 'Doctor', 'Logistics'];

export default function VolunteerApplyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', age: '', phone: '', vehicle: false, idPreview: '' });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggleSkill = (s: string) => {
    setSelectedSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setForm(f => ({ ...f, idPreview: ev.target?.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.phone || selectedSkills.length === 0) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#f0fdf4' }}>
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Welcome, Volunteer!</h2>
          <p className="text-gray-500 mb-6">You are now registered in SahayakNet. A coordinator will onboard you shortly.</p>
          <div className="rounded-xl p-4 bg-green-50 border border-green-200 mb-6">
            <div className="font-bold text-green-700">{form.name}</div>
            <div className="text-sm text-green-600 mt-1">Skills: {selectedSkills.join(', ')}</div>
            {form.vehicle && <div className="text-sm text-green-600">Vehicle: Available ✅</div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push('/volunteer/dashboard')}
              className="py-3 rounded-xl text-white font-bold text-sm" style={{ background: '#16a34a' }}>
              Go to Dashboard
            </button>
            <button onClick={() => router.push('/')}
              className="py-3 rounded-xl font-bold text-sm border-2 border-gray-200 text-gray-700">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🙋</div>
          <h1 className="text-2xl font-black text-gray-800">Become a Volunteer</h1>
          <p className="text-gray-500 text-sm mt-1">Join the disaster response network</p>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="font-bold text-gray-700 mb-4 text-sm">Personal Information</div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Full Name</label>
              <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 outline-none"
                placeholder="Your name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Age</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 outline-none"
                  type="number" placeholder="Age" min={18} max={70}
                  value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
                <input className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base focus:border-green-500 outline-none"
                  placeholder="Mobile number" type="tel"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="font-bold text-gray-700 mb-4 text-sm">Your Skills (select all that apply)</div>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map(s => (
              <button key={s} onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
                  selectedSkills.includes(s)
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-200 text-gray-600 hover:border-green-400'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car size={20} className="text-gray-500" />
              <div>
                <div className="font-semibold text-gray-700 text-sm">Vehicle Available?</div>
                <div className="text-xs text-gray-500">Car, bike, boat, or truck</div>
              </div>
            </div>
            <button onClick={() => setForm(f => ({ ...f, vehicle: !f.vehicle }))}
              className={`w-12 h-6 rounded-full transition-colors ${form.vehicle ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white mx-0.5 transition-transform ${form.vehicle ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* ID Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
          <div className="font-bold text-gray-700 mb-3 text-sm">Upload ID Proof (Aadhaar / Voter Card)</div>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-green-400 transition-colors">
            {form.idPreview
              ? <img src={form.idPreview} alt="ID" className="max-h-32 rounded-lg object-contain" />
              : <>
                  <Upload size={28} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload image</span>
                </>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleIdUpload} />
          </label>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-5 rounded-2xl text-white text-xl font-black flex items-center justify-center gap-3 transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 6px 24px rgba(22,163,74,0.35)' }}
        >
          <CheckCircle size={24} />
          REGISTER AS VOLUNTEER
        </button>
      </div>
    </div>
  );
}
