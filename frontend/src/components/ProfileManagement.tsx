import React, { useEffect, useState } from 'react';
import { TeamMember } from '../types';

interface ProfileManagementProps {
  currentMember: TeamMember;
  loading: boolean;
  onUpdateProfile: (payload: {
    name: string;
    role: string;
    avatar: string;
    avatarFile?: File | null;
    department: 'Engineering' | 'Product' | 'Design' | 'Marketing';
    agreementHours: number;
    breakDay: string;
  }) => Promise<void>;
}

export default function ProfileManagement({ currentMember, loading, onUpdateProfile }: ProfileManagementProps) {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [name, setName] = useState(currentMember.name);
  const [role, setRole] = useState(currentMember.role);
  const [avatar, setAvatar] = useState(currentMember.avatar || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(currentMember.avatar || '');
  const [avatarError, setAvatarError] = useState('');
  const [department, setDepartment] = useState<TeamMember['department']>(currentMember.department || 'Engineering');
  const [agreementHours, setAgreementHours] = useState<number>(currentMember.agreementHours || 20);
  const [isEditing, setIsEditing] = useState(false);
  const [breakDays, setBreakDays] = useState<string[]>(() => {
    const rawDays = (currentMember.breakDay || 'Friday')
      .split(',')
      .map(day => day.trim())
      .filter(Boolean);
    return rawDays.length ? rawDays : ['Friday'];
  });

  const hydrateFromMember = (member: TeamMember) => {
    setName(member.name);
    setRole(member.role);
    setAvatar(member.avatar || '');
    setAvatarFile(null);
    setAvatarPreviewUrl(member.avatar || '');
    setAvatarError('');
    setDepartment(member.department || 'Engineering');
    setAgreementHours(member.agreementHours || 20);
    const rawDays = (member.breakDay || 'Friday')
      .split(',')
      .map(day => day.trim())
      .filter(Boolean);
    setBreakDays(rawDays.length ? rawDays : ['Friday']);
  };

  useEffect(() => {
    if (isEditing) return;

    setName(currentMember.name);
    setRole(currentMember.role);
    setAvatar(currentMember.avatar || '');
    setAvatarFile(null);
    setAvatarPreviewUrl(currentMember.avatar || '');
    setAvatarError('');
    setDepartment(currentMember.department || 'Engineering');
    setAgreementHours(currentMember.agreementHours || 20);
    const rawDays = (currentMember.breakDay || 'Friday')
      .split(',')
      .map(day => day.trim())
      .filter(Boolean);
    setBreakDays(rawDays.length ? rawDays : ['Friday']);
  }, [currentMember, isEditing]);

  const toggleBreakDay = (day: string) => {
    setIsEditing(true);
    setBreakDays(prev => {
      const exists = prev.includes(day);
      const next = exists ? prev.filter(item => item !== day) : [...prev, day];

      // Keep at least one day selected to match registration behavior.
      if (next.length === 0) return ['Friday'];

      return weekDays.filter(item => next.includes(item));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarError) return;

    await onUpdateProfile({
      name,
      role,
      avatar,
      avatarFile,
      department,
      agreementHours,
      breakDay: breakDays.join(', '),
    });

    setAvatarFile(null);
    setIsEditing(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setAvatarFile(null);
      setAvatarPreviewUrl(avatar);
      setAvatarError('');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Only PNG and JPEG files are allowed.');
      setAvatarFile(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Profile image must be 5MB or smaller.');
      setAvatarFile(null);
      return;
    }

    const previewObjectUrl = URL.createObjectURL(file);
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.src = previewObjectUrl;
    }).catch(() => null);

    if (!dimensions) {
      URL.revokeObjectURL(previewObjectUrl);
      setAvatarError('Selected image could not be read.');
      setAvatarFile(null);
      return;
    }

    const min = 128;
    const max = 2048;
    if (dimensions.width < min || dimensions.height < min || dimensions.width > max || dimensions.height > max) {
      URL.revokeObjectURL(previewObjectUrl);
      setAvatarError(`Resolution must be between ${min}x${min} and ${max}x${max}.`);
      setAvatarFile(null);
      return;
    }

    setAvatarError('');
    setAvatarFile(file);
    setAvatarPreviewUrl(previewObjectUrl);
    setIsEditing(true);
  };

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl && avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleCancel = () => {
    hydrateFromMember(currentMember);
    setIsEditing(false);
  };

  return (
    <section className="bg-white border border-[#e2dfd2] rounded-3xl p-6 shadow-sm animate-fade-in text-left">
      <div className="mb-4 pb-3 border-b border-[#e2dfd2]">
        <h3 className="font-semibold text-[#2d3a2a] text-base font-serif">Profile Management</h3>
        <p className="text-xs text-[#7a7d75] mt-1">Update your own profile information used across dashboard, tasks and messages.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => {
                setIsEditing(true);
                setName(e.target.value);
              }}
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Designation</label>
            <input
              type="text"
              required
              value={role}
              onChange={e => {
                setIsEditing(true);
                setRole(e.target.value);
              }}
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#3d403a] block mb-1">Profile Image</label>
          <div className="flex items-center gap-3">
            <img
              src={avatarPreviewUrl || avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
              alt="Profile preview"
              className="w-14 h-14 rounded-xl object-cover border border-[#e2dfd2]"
            />
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleAvatarFileChange}
                className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
                disabled={loading}
              />
              <span className="text-[10px] text-[#7a7d75] mt-1 block">PNG/JPEG only, max 5MB, resolution 128-2048px.</span>
              {avatarError && <span className="text-[10px] text-red-600 mt-1 block">{avatarError}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Department</label>
            <select
              value={department}
              onChange={e => {
                setIsEditing(true);
                setDepartment(e.target.value as TeamMember['department']);
              }}
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
              disabled={loading}
            >
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Agreement Hours</label>
            <input
              type="number"
              min={1}
              required
              value={agreementHours}
              onChange={e => {
                setIsEditing(true);
                setAgreementHours(Number(e.target.value));
              }}
              className="w-full text-xs bg-[#fdfcf8] border border-[#e2dfd2] rounded-xl px-3 py-2 text-[#3d403a]"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#3d403a] block mb-1">Break Days</label>
            <div className="grid grid-cols-2 gap-1.5">
              {weekDays.map(day => {
                const isSelected = breakDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleBreakDay(day)}
                    disabled={loading}
                    className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5a6e53] text-white border-[#5a6e53]'
                        : 'bg-white text-[#3d403a] border-[#e2dfd2] hover:bg-[#f4f1e8]'
                    } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <span className="text-[10px] text-[#7a7d75] mt-1.5 block">
              Selected Off Days: <strong className="text-[#3d403a] font-mono">{breakDays.join(', ')}</strong>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading || !isEditing}
            className="w-1/2 py-2.5 border border-[#e2dfd2] hover:bg-[#f4f1e8] text-[#3d403a] text-xs font-bold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || Boolean(avatarError)}
            className="w-1/2 py-2.5 bg-[#5a6e53] hover:opacity-90 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
          >
            Save Profile
          </button>
        </div>
      </form>
    </section>
  );
}
