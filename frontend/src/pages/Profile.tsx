import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { User, Sparkles, Shield, Key, Save } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState<string>(user?.full_name || 'Alex Rivera');
  const [username, setUsername] = useState<string>(user?.username || 'aura_creator');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage('Profile settings updated successfully!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-[#c7c4d8] flex flex-col">
      <Navbar />

      <main className="pt-28 pb-16 px-6 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-8">
        <h1 className="text-3xl font-extrabold text-[#dee1f9]">Account Profile</h1>

        {savedMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
            {savedMessage}
          </div>
        )}

        <div className="glass-card p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#c4c0ff] to-[#2fd9f4] flex items-center justify-center text-[#080c18] font-bold text-2xl shadow-aura-glow">
              {fullName.charAt(0)}
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-[#dee1f9]">{fullName}</h2>
              <span className="text-xs text-[#2fd9f4] font-semibold uppercase tracking-wider">
                {user?.subscription_tier || 'Pro'} Creator Plan
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#dee1f9]">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#080c18] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#dee1f9]">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#080c18] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#dee1f9] outline-none focus:border-[#2fd9f4]/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#dee1f9]">Email Address</label>
              <input
                type="email"
                value={user?.email || 'creator@auraedit.ai'}
                disabled
                className="w-full bg-[#080c18]/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-[#c7c4d8]/50 cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              className="gradient-btn px-6 py-3 text-sm font-bold flex items-center gap-2 shadow-aura-glow self-start mt-2"
            >
              <Save className="w-4 h-4 text-[#080c18]" />
              Save Changes
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
