import React, { useState } from 'react';
import { UserProfile as UserProfileType } from '../types';
import { db, doc, updateDoc, handleFirestoreError, OperationType, auth, updatePassword } from '../lib/compatibility';
import { User, Lock, Bell, Camera, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const UserProfile = ({ user, onUpdate }: { user: UserProfileType, onUpdate: (user: UserProfileType) => void }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'notifications'>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Personal Info State
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone || '');
  const [photoUrl, setPhotoUrl] = useState(user.photoUrl || '');

  // Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const userRef = doc(db, 'users', user.uid);
      const updates = { firstName, lastName, phone, photoUrl };
      await updateDoc(userRef, updates);
      onUpdate({ ...user, ...updates });
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      } catch (firestoreErr: any) {
        setError(firestoreErr.message || 'Failed to update profile.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setSuccess('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError("You must be logged in to change your password.");
      }
    } catch (err: any) {
      console.error("Error updating password:", err);
      if (err.code === 'auth/requires-recent-login') {
        setError("This operation is sensitive and requires recent authentication. Please log in again before retrying this request.");
      } else {
        setError(err.message || 'Failed to update password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-32 pb-12 min-h-screen">
      <h1 className="text-3xl font-serif font-medium mb-8">Account Settings</h1>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-3xl p-4 border border-black/5 shadow-sm flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                activeTab === 'personal' ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <User size={18} /> Personal Info
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                activeTab === 'security' ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Lock size={18} /> Security
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all text-left ${
                activeTab === 'notifications' ? 'bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20' : 'text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Bell size={18} /> Notifications
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-sm">
            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-sm border border-emerald-100 font-medium flex items-center gap-2">
                <CheckCircle size={16} /> {success}
              </div>
            )}

            {activeTab === 'personal' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-medium mb-6">Personal Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="relative">
                      {photoUrl ? (
                        <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-medium shadow-sm">
                          {firstName.charAt(0)}{lastName.charAt(0)}
                        </div>
                      )}
                      <button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-black/5 text-gray-800 hover:text-[#2563EB] transition-colors">
                        <Camera size={14} />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-1">Profile Photo</p>
                      <input
                        type="url"
                        placeholder="Image URL"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        className="w-full max-w-xs p-2 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium cursor-text"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">First Name</label>
                      <input
                        required
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">Last Name</label>
                      <input
                        required
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full p-4 rounded-2xl border border-black/5 bg-gray-100 text-gray-800 outline-none font-medium cursor-not-allowed"
                      />
                      <p className="text-[10px] text-gray-800 ml-1 mt-1">Email cannot be changed.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 rounded-2xl bg-[#2563EB] text-white font-medium shadow-lg shadow-[#2563EB]/20 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-medium mb-6">Security Settings</h2>
                <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">New Password</label>
                    <input
                      required
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-800 ml-1">Confirm New Password</label>
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium cursor-text"
                      placeholder="Confirm password"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 rounded-2xl bg-[#2563EB] text-white font-medium shadow-lg shadow-[#2563EB]/20 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-xl font-medium mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { id: 'email_updates', label: 'Email Updates', desc: 'Receive emails about platform updates and features.' },
                    { id: 'announcements', label: 'School Announcements', desc: 'Get notified when your school posts a new announcement.' },
                    { id: 'messages', label: 'Direct Messages', desc: 'Receive notifications for new messages.' },
                  ].map(pref => (
                    <div key={pref.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-gray-50">
                      <div>
                        <p className="font-medium text-[#1A1A1A]">{pref.label}</p>
                        <p className="text-xs text-gray-800 mt-1">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
                      </label>
                    </div>
                  ))}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      className="px-8 py-3 rounded-2xl bg-[#2563EB] text-white font-medium shadow-lg shadow-[#2563EB]/20 hover:scale-[1.02] transition-all active:scale-[0.98]"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
