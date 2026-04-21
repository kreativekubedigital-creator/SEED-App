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
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-blue-600 shadow-sm border border-white/40">
          <Settings size={40} className="animate-spin-slow" />
        </div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl text-center shadow-2xl max-w-md w-full border border-white/40">
          <div className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-medium text-gray-800 mb-4">School Not Found</h2>
          <p className="text-gray-800 font-medium mb-8">We couldn't find the school associated with your account. Please contact support.</p>
          <button onClick={onLogout} className="w-full bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-lg font-medium  hover:scale-[1.02] transition-all border border-white/20">
            Logout
          </button>
        </div>
      </div>
    );
  }

  return <SchoolManagement school={school} onBack={onLogout} currentUserRole="school_admin" />;
};
