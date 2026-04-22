import React, { useState } from 'react';
import { db, doc, updateDoc, handleFirestoreError, OperationType } from '../../firebase';
import { School } from '../../types';
import { Settings, Save } from 'lucide-react';

export const SchoolSettings = ({ school }: { school: School }) => {
  const [formData, setFormData] = useState({
    name: school.name,
    address: school.address,
    email: school.email,
    phone: school.phone,
    logoUrl: school.logoUrl || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await updateDoc(doc(db, 'schools', school.id), {
        name: formData.name,
        address: formData.address,
        email: formData.email,
        phone: formData.phone,
        logoUrl: formData.logoUrl,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update school settings');
      handleFirestoreError(err, OperationType.UPDATE, `schools/${school.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-blue-100/50">
          <Settings size={20} />
        </div>
        <div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">School Settings</h3>
          <p className="text-sm text-slate-900 dark:text-slate-100 font-medium mt-1">Update your school's basic information and logo</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 font-medium border border-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm mb-6 font-medium border border-green-100">
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-5 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white/40 shadow-sm relative overflow-hidden">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">School Logo</label>
            <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="School Logo" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-slate-900 dark:text-slate-100">
                  <span className="text-xs font-medium">No Logo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setFormData({ ...formData, logoUrl: reader.result as string });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200/50 bg-white dark:bg-slate-900/50 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
            </div>
          </div>
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">School Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50 dark:bg-slate-800 hover:border-gray-300 focus:bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium text-slate-900 dark:text-slate-100 cursor-text"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700 py-2.5 rounded-full font-medium  hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2 relative z-10 mt-8"
        >
          <Save size={20} />
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
};
