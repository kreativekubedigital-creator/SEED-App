import { useState, useEffect } from 'react';
import { db, doc, getDoc } from '../../firebase';
import { UserProfile, School } from '../../types';
import { SchoolManagement } from './SchoolManagement';
import { Settings } from 'lucide-react';

export const SchoolAdminDashboard = ({ user, onLogout }: { user: UserProfile, onLogout: () => void }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user.schoolId) {
      setLoading(false);
      return;
    }

    const fetchSchool = async () => {
      try {
        const schoolDoc = await getDoc(doc(db, 'schools', user.schoolId!));
        if (schoolDoc.exists()) {
          setSchool({ id: schoolDoc.id, ...schoolDoc.data() } as School);
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchool();
  }, [user.schoolId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-24 h-24 bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xl border border-slate-200 dark:border-slate-800">
          <Settings size={40} className="animate-spin-slow" />
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 p-10 rounded-[2rem] text-center shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-red-600/10 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-500/20">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">School Not Found</h2>
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-8">We couldn't find the school associated with your account. Please contact support.</p>
          <button onClick={onLogout} className="w-full bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:translate-y-[-2px] transition-all active:translate-y-0">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return <SchoolManagement school={school} onBack={onLogout} currentUserRole="school_admin" />;
};
