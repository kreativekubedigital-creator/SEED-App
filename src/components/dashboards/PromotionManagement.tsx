import { useState, useEffect } from 'react';
import { db, collection, onSnapshot, OperationType, handleFirestoreError } from '../../lib/compatibility';
import { Session, GradeScale } from '../../types';
import { Award, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { promoteStudents } from '../../lib/promotion';
import { sortByName } from '../../lib/utils';

interface PromotionManagementProps {
  schoolId: string;
}

export const PromotionManagement = ({ schoolId }: PromotionManagementProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [gradeScale, setGradeScale] = useState<GradeScale | null>(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [promotionResult, setPromotionResult] = useState<{ promoted: number, graduated: number, failed: number } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const unsubSessions = onSnapshot(collection(db, 'schools', schoolId, 'sessions'), (snap) => {
      const sessionsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Session));
      const sorted = sortByName(sessionsData);
      setSessions(sorted);
      
      // Auto-select current session
      const current = sorted.find(s => s.isCurrent);
      if (current) setSelectedSession(current.id);
      else if (sorted.length > 0) setSelectedSession(sorted[0].id);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `schools/${schoolId}/sessions`);
    });

    const unsubGradeScale = onSnapshot(collection(db, 'schools', schoolId, 'gradeScales'), (snap) => {
      if (!snap.empty) {
        setGradeScale({ id: snap.docs[0].id, ...snap.docs[0].data() } as GradeScale);
      }
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `schools/${schoolId}/gradeScales`);
    });

    return () => {
      unsubSessions();
      unsubGradeScale();
    };
  }, [schoolId]);

  const handlePromoteStudents = async () => {
    if (!schoolId || !selectedSession) return;
    
    const session = sessions.find(s => s.id === selectedSession);
    if (!session) return;

    if (!window.confirm(`Are you sure you want to promote students for the ${session.name} session? This process will move eligible students to their next classes and graduate final year students. This action cannot be easily undone.`)) {
      return;
    }

    setPromoting(true);
    setPromotionResult(null);
    setMessage(null);

    try {
      const result = await promoteStudents(schoolId, selectedSession, gradeScale?.promotionThreshold || 40);
      setPromotionResult(result);
      setMessage({ type: 'success', text: `Promotion completed successfully!` });
    } catch (err: any) {
      console.error("Promotion failed:", err);
      setMessage({ type: 'error', text: err.message || "Failed to promote students. Ensure 3rd term results are published." });
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Promotion Management</h2>
        <p className="text-slate-500">Advance students to their next academic level based on session performance.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="font-medium text-sm">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
              <Award size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Session Selection</h3>
              <p className="text-xs text-slate-500">Select the academic year to process</p>
            </div>
          </div>

          <div className="space-y-4">
            <select
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-900 appearance-none cursor-pointer"
            >
              <option value="">Select Session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </select>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Promotion Threshold</span>
                <span className="text-sm font-black text-blue-700">{gradeScale?.promotionThreshold || 40}%</span>
              </div>
              <p className="text-[11px] text-blue-600/70 leading-relaxed">
                Students with a cumulative average below this threshold across all terms in the selected session will repeat their current class.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900">Ready to Proceed?</h3>
            <div className="space-y-3 text-sm text-slate-500">
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <p>Ensure all <strong>3rd Term</strong> results are published.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <p>Promotion will move Primary 1 → Primary 2, etc.</p>
              </div>
              <div className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <p>Graduating classes (e.g. SSS 3) will be marked as <strong>Graduates</strong>.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handlePromoteStudents}
            disabled={promoting || !selectedSession}
            className="mt-8 w-full p-5 rounded-2xl bg-slate-900 text-white hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group overflow-hidden relative"
          >
            {promoting ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Award size={24} className="group-hover:scale-110 transition-transform" />
                <div className="text-left">
                  <p className="font-black text-sm leading-none uppercase tracking-wide">Execute Promotion</p>
                  <p className="text-[10px] opacity-60 font-medium">Finalize Academic Year</p>
                </div>
              </>
            )}
          </button>
        </div>
      </div>

      {promotionResult && (
        <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-2xl shadow-emerald-200 relative overflow-hidden animate-in zoom-in duration-500">
          <Award className="absolute -right-8 -bottom-8 w-64 h-64 text-white/10 rotate-12" />
          <div className="relative">
            <h3 className="text-xl font-black uppercase tracking-widest mb-6 opacity-90">Promotion Results Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Students Promoted</p>
                <p className="text-4xl font-black">{promotionResult.promoted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Students Graduated</p>
                <p className="text-4xl font-black">{promotionResult.graduated}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Students Repeated</p>
                <p className="text-4xl font-black">{promotionResult.failed}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
