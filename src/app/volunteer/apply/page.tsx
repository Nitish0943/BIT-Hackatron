'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/store';

const SKILLS = ['First Aid', 'Search & Rescue', 'Driving', 'Medical Support', 'Logistics', 'Communication'];

export default function VolunteerApplyPage() {
  const router = useRouter();
  const { login } = useApp();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));
  };

  const submit = () => {
    if (!name.trim() || !phone.trim()) return;
    login({ role: 'volunteer', name: name.trim(), phone: phone.trim() });
    router.push('/volunteer/profile');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div className="gov-card p-5">
        <h1 className="gov-title text-xl">Volunteer Registration</h1>
        <p className="text-sm text-slate-600 mt-1">Register to support district disaster response teams.</p>
      </div>

      <div className="gov-card p-5 space-y-3">
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border border-slate-300 rounded-md px-3 py-2" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Skills</p>
          <div className="flex flex-wrap gap-2">
            {SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`px-3 py-1.5 rounded-md text-sm border ${skills.includes(skill) ? 'bg-[#0b3c5d] text-white border-[#0b3c5d]' : 'border-slate-300 text-slate-700'}`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>
        <label className="text-sm text-slate-700 flex items-center gap-2">
          <input type="checkbox" checked={vehicle} onChange={(e) => setVehicle(e.target.checked)} />
          Vehicle available
        </label>
        <button onClick={submit} className="w-full px-4 py-2 rounded-md bg-[#0b3c5d] text-white">Register</button>
      </div>
    </div>
  );
}
