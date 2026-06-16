import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { TeamMember } from '../types';

interface RegistrationFormCardProps {
  authLoading: boolean;
  onRegister: (userData: {
    name: string; email: string;
    department: TeamMember['department'];
    agreementHours: number; breakDay: string; role: string;
  }) => Promise<void>;
  onClose: () => void;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RegistrationFormCard({ authLoading, onRegister, onClose }: RegistrationFormCardProps) {
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState('Remote System Engineer');
  const [regDept, setRegDept] = useState<TeamMember['department']>('Engineering');
  const [regHours, setRegHours] = useState(20);
  const [regBreak, setRegBreak] = useState('Friday');

  const toggleBreakDay = (day: string) => {
    const selected = regBreak ? regBreak.split(',').map(d => d.trim()).filter(Boolean) : [];
    const next = selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day];
    setRegBreak(next.length === 0 ? 'Friday' : WEEKDAYS.filter(d => next.includes(d)).join(', '));
  };

  return (
    <div className="max-w-7xl w-full mx-auto p-6 bg-white border-2 border-[#d4a373]/40 rounded-3xl shadow-md space-y-4 animate-fade-in text-left" id="employee-registration-terminal">
      <div className="flex items-center gap-2.5 pb-2 border-b border-[#e2dfd2]">
        <div className="p-2 bg-[#d4a373]/10 text-[#d4a373] rounded-xl">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#2d3a2a] uppercase tracking-wider font-serif">Remote Member Registration System</h3>
          <p className="text-xs text-[#7a7d75]">Enroll new team members immediately. Candidates start with Engineer privileges.</p>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!regName || !regEmail) return;
          await onRegister({ name: regName, email: regEmail, department: regDept, agreementHours: regHours, breakDay: regBreak, role: regRole });
          setRegName('');
          setRegEmail('');
          onClose();
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Full Name</label>
          <input type="text" required placeholder="e.g., Ada Lovelace" value={regName} onChange={e => setRegName(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Email Address</label>
          <input type="email" required placeholder="e.g. ada@lovelace.io" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Job Designation Role</label>
          <input type="text" required placeholder="e.g. Core System Engineer" value={regRole} onChange={e => setRegRole(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
        </div>
        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Sponsoring Department</label>
          <select value={regDept} onChange={e => setRegDept(e.target.value as TeamMember['department'])} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]">
            {(['Engineering', 'Product', 'Design', 'Marketing'] as const).map(d => <option key={d} value={d}>{d} Department</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Weekly Commitment (Hours)</label>
          <select value={regHours} onChange={e => setRegHours(Number(e.target.value))} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]">
            <option value={10}>10 Hours per week</option>
            <option value={20}>20 Hours per week</option>
            <option value={30}>30 Hours per week</option>
            <option value={40}>40 Hours per week</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="text-xs font-semibold text-[#3d403a] block mb-1.5">Preferred Break Off Days</label>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAYS.map(day => {
              const isSelected = regBreak.split(',').map(d => d.trim().toLowerCase()).includes(day.toLowerCase());
              return (
                <button type="button" key={day} onClick={() => toggleBreakDay(day)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-[#5a6e53] text-white border-[#5a6e53]' : 'bg-white text-[#3d403a] border-[#e2dfd2] hover:bg-[#f4f1e8]/40'}`}>
                  {day}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-[#7a7d75] mt-1.5 block">Selected Off Days: <strong className="text-[#3d403a] font-mono">{regBreak}</strong></span>
        </div>
        <div className="md:col-span-3 flex justify-end">
          <button type="submit" disabled={authLoading} className="px-5 py-2.5 bg-[#d4a373] text-white text-xs font-bold rounded-xl transition-all hover:bg-[#d4a373]/95 cursor-pointer shadow-xs disabled:opacity-60">
            {authLoading ? 'Adding member records...' : 'Confirm Registration (Default privileges: Engineer)'}
          </button>
        </div>
      </form>
    </div>
  );
}
