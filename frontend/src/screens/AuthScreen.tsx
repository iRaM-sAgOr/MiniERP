import React, { useState } from 'react';
import { Clock, Mail, MessageSquare, ShieldCheck } from 'lucide-react';
import { TeamMember } from '../types';
// @ts-ignore
import aiLogo from '../assets/images/ai_solution_usa_logo_1780158886266.png';

interface AuthScreenProps {
  systemAlert: { type: 'success' | 'error' | 'info'; text: string } | null;
  authLoading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (userData: {
    name: string; email: string;
    department: TeamMember['department'];
    agreementHours: number; breakDay: string; role: string; password?: string;
  }) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onResetPassword: (email: string, token: string, newPassword: string) => Promise<void>;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AuthScreen({
  systemAlert,
  authLoading,
  onLogin,
  onRegister,
  onForgotPassword,
  onResetPassword,
}: AuthScreenProps) {
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('Remote System Engineer');
  const [regDept, setRegDept] = useState<TeamMember['department']>('Engineering');
  const [regHours, setRegHours] = useState(20);
  const [regBreak, setRegBreak] = useState('Friday');

  const toggleBreakDay = (day: string) => {
    const selected = regBreak ? regBreak.split(',').map(d => d.trim()).filter(Boolean) : [];
    const next = selected.includes(day) ? selected.filter(d => d !== day) : [...selected, day];
    setRegBreak(
      next.length === 0 ? 'Friday' : WEEKDAYS.filter(d => next.includes(d)).join(', ')
    );
  };

  return (
    <div className="min-h-screen bg-[#fbfaf5] text-[#3d403a] flex flex-col antialiased font-sans" id="remote-erp-root-panel">
      {systemAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg text-xs font-semibold animate-bounce max-w-sm bg-indigo-50 border-indigo-200 text-indigo-800">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          {systemAlert.text}
        </div>
      )}

      <header className="bg-[#f4f1e8] border-b border-[#e2dfd2] py-3.5 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <img src={aiLogo} alt="AI Solution USA Logo" className="w-10 h-10 rounded-xl object-contain border border-[#e2dfd2] bg-white pointer-events-none p-0.5" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-base font-bold text-[#2d3a2a] font-serif uppercase tracking-wider leading-none">AI Solution USA</h1>
              <span className="text-[10px] text-[#7a7d75] font-bold font-mono">Distributed Enterprise Portal</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-6 flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-8 items-center my-auto">
        {/* Left: Branding */}
        <section className="lg:col-span-12 xl:col-span-5 w-full flex flex-col justify-center space-y-6 text-left p-6 bg-[#f4f1e8]/40 border border-[#e2dfd2] rounded-3xl">
          <div className="space-y-3">
            <span className="text-[10px] font-bold tracking-widest font-mono text-[#5a6e53] uppercase bg-[#5a6e53]/10 px-2.5 py-1 rounded-full w-max block">Enterprise Terminal Gateway</span>
            <h2 className="text-3xl font-bold font-serif text-[#2d3a2a] leading-tight">Empowering Decentralized Enterprise Authority</h2>
            <p className="text-xs text-[#7a7d75] leading-relaxed">AI Solution USA converges smart operational reporting, automated hourly workflows, and intelligent Team-Leader task allocation systems into a secure, cohesive corporate workspace.</p>
          </div>
          <div className="space-y-4 pt-2">
            {[
              { icon: Clock, title: 'Interactive Shift Punch Controls', desc: 'Log clock-ins, instant breaks, and structured shift details precisely.' },
              { icon: Mail, title: 'Gemini-AI Professional Summarizer', desc: 'Transcribe daily logs into pristine email summaries for Team Leads immediately.' },
              { icon: MessageSquare, title: 'Peer-To-Peer Direct Messages', desc: 'Managers can correspond with any engineer, and engineers can message each other directly.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="p-1.5 bg-[#5a6e53]/10 rounded-lg text-[#5a6e53] shrink-0 mt-0.5"><Icon className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-xs font-bold text-[#3d403a]">{title}</h4>
                  <p className="text-[11px] text-[#7a7d75]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#f4f1e8] p-4 rounded-2xl border border-[#e2dfd2] text-[11px] text-[#5a6e53] space-y-1 font-mono italic">
            <p className="font-bold uppercase not-italic text-[10px] tracking-wider text-[#3d403a] mb-1">🔒 Environment Protocol:</p>
            <p>• Secure session token verification active.</p>
            <p>• Data storage is persisted in relational database structures.</p>
          </div>
        </section>

        {/* Right: Auth Terminal */}
        <section className="lg:col-span-7 w-full flex flex-col justify-start">
          <div className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm flex-1 flex flex-col justify-between">
            <div>
              <div className="flex border-b border-[#e2dfd2] mb-6">
                {(['login', 'register'] as const).map(tab => (
                  <button key={tab} onClick={() => setAuthTab(tab)} className={`flex-1 pb-3 text-sm font-serif font-semibold transition-all border-b-2 cursor-pointer ${authTab === tab ? 'border-[#5a6e53] text-[#2d3a2a]' : 'border-transparent text-slate-400 hover:text-[#3d403a]'}`}>
                    {tab === 'login' ? 'Enterprise Login' : 'Register New Employee'}
                  </button>
                ))}
              </div>

              {authTab === 'login' ? (
                <div className="space-y-6">
                  <div className="text-left space-y-1">
                    <h3 className="text-base font-bold font-serif text-[#2d3a2a]">Account Verification</h3>
                    <p className="text-xs text-[#7a7d75]">Sign in with your enterprise email and secure password.</p>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await onLogin(loginEmail, loginPassword);
                    }}
                    className="space-y-3 text-left"
                  >
                    <div>
                      <label className="text-xs font-bold text-[#3d403a] block mb-1">Corporate Email Address</label>
                      <input type="email" required placeholder="e.g. manager@company.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#3d403a] block mb-1">Secure Hashed Password</label>
                      <input type="password" required placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                    </div>
                    <button type="submit" disabled={authLoading} className="w-full py-2.5 bg-[#5a6e53] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all cursor-pointer font-serif uppercase tracking-wider disabled:opacity-60">
                      {authLoading ? 'Verifying...' : 'Verify & Login'}
                    </button>

                    <div className="pt-3 border-t border-[#e2dfd2] space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="email" placeholder="Forgot password email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="sm:col-span-2 text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                        <button type="button" disabled={authLoading} onClick={() => onForgotPassword(forgotEmail)} className="text-xs font-bold px-3 py-2 rounded-xl border border-[#d4a373] text-[#d4a373] hover:bg-[#f4f1e8] cursor-pointer disabled:opacity-60">Forgot Password</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input type="email" placeholder="Reset email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                        <input type="text" placeholder="Recovery token" value={resetToken} onChange={e => setResetToken(e.target.value)} className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                        <input type="password" placeholder="New password" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] placeholder-slate-400 focus:outline-[#5a6e53]" />
                      </div>
                      <button type="button" disabled={authLoading} onClick={() => onResetPassword(resetEmail, resetToken, resetNewPassword)} className="w-full py-2 text-xs font-bold rounded-xl border border-[#5a6e53] text-[#5a6e53] hover:bg-[#f4f1e8] cursor-pointer disabled:opacity-60">Reset Password With Token</button>
                    </div>
                  </form>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!regName || !regEmail || !regPassword) return;
                    onRegister({ name: regName, email: regEmail, department: regDept, agreementHours: regHours, breakDay: regBreak, role: regRole, password: regPassword });
                    setRegName(''); setRegEmail(''); setRegPassword('');
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left"
                >
                  <div className="sm:col-span-2 space-y-1">
                    <h3 className="text-base font-bold font-serif text-[#2d3a2a]">Roster Self-Enrollment</h3>
                    <p className="text-xs text-[#7a7d75]">Apply directly to join the distributed workroom index. Standard applicants start with remote Engineer privileges.</p>
                  </div>
                  <div><label className="text-xs font-semibold text-[#3d403a] block mb-1">Full Name</label><input type="text" required placeholder="e.g. Ada Lovelace" value={regName} onChange={e => setRegName(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400" /></div>
                  <div><label className="text-xs font-semibold text-[#3d403a] block mb-1">Corporate Email</label><input type="email" required placeholder="e.g. ada@lovelace.io" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400" /></div>
                  <div><label className="text-xs font-semibold text-[#3d403a] block mb-1">Create Secure Password</label><input type="password" required placeholder="••••••••" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400" /></div>
                  <div><label className="text-xs font-semibold text-[#3d403a] block mb-1">Corporate Title / Role</label><input type="text" required placeholder="e.g. Principal Lead Engineer" value={regRole} onChange={e => setRegRole(e.target.value)} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53] placeholder-slate-400" /></div>
                  <div>
                    <label className="text-xs font-semibold text-[#3d403a] block mb-1">Department</label>
                    <select value={regDept} onChange={e => setRegDept(e.target.value as TeamMember['department'])} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]">
                      {(['Engineering', 'Product', 'Design', 'Marketing'] as const).map(d => <option key={d} value={d}>{d} Department</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#3d403a] block mb-1">Hours Commitment</label>
                    <select value={regHours} onChange={e => setRegHours(Number(e.target.value))} className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a] focus:outline-[#5a6e53]">
                      <option value={10}>10 Hours / Week (Freelance)</option>
                      <option value={20}>20 Hours / Week (Moderate)</option>
                      <option value={30}>30 Hours / Week (Intermediate)</option>
                      <option value={40}>40 Hours / Week (Dedicated Time)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-[#3d403a] block mb-1.5">Preferred Week Off Days (Select Multiple)</label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map(day => {
                        const isSelected = regBreak.split(',').map(d => d.trim().toLowerCase()).includes(day.toLowerCase());
                        return (
                          <button type="button" key={day} onClick={() => toggleBreakDay(day)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-[#5a6e53] text-white border-[#5a6e53]' : 'bg-white text-[#3d403a] border-[#e2dfd2] hover:bg-[#f4f1e8]/40'}`}>
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-[10px] text-[#7a7d75] mt-1.5 block">Selected Off Days: <strong className="text-[#3d403a] font-mono">{regBreak}</strong></span>
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <button type="submit" disabled={authLoading} className="w-full py-2.5 bg-[#d4a373] text-white text-xs font-bold rounded-xl transition-all hover:bg-[#d4a373]/95 cursor-pointer font-serif uppercase tracking-wider shadow-xs disabled:opacity-60">
                      {authLoading ? 'Enrolling...' : 'Enroll as Remote Engineer & Login'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-transparent border-t border-[#e2dfd2] mt-12 py-6 px-6 text-center text-xs text-[#7a7d75] font-mono flex flex-col md:flex-row justify-between max-w-7xl w-full mx-auto gap-4">
        <span>&copy; 2026 AI Solution USA. All rights reserved.</span>
        <div className="flex justify-center gap-1.5 items-center font-semibold text-[#5a6e53]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px]">Database Connection Secure</span>
        </div>
      </footer>
    </div>
  );
}
