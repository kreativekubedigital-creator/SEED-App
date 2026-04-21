import React from 'react';
import { UserProfile, School, Session, Term, Class, Result, Subject, GradeScale } from '../../types';

interface ReportCardProps {
  student: UserProfile;
  school: School | null;
  session: Session | null;
  term: Term | null;
  studentClass: Class | null;
  results: Result[];
  subjects: Subject[];
  gradeScale: GradeScale | null;
}

export const ReportCard: React.FC<ReportCardProps> = ({
  student,
  school,
  session,
  term,
  studentClass,
  results,
  subjects,
  gradeScale
}) => {
  const caConfig = gradeScale?.caConfig || { cas: [{ name: 'CA1', maxScore: 10 }, { name: 'CA2', maxScore: 10 }, { name: 'CA3', maxScore: 20 }], maxExamScore: 60 };
  const totalCaMax = caConfig.cas.reduce((sum, ca) => sum + ca.maxScore, 0);
  const totalMaxScore = totalCaMax + caConfig.maxExamScore;

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown Subject';

  const totalScore = results.reduce((acc, curr) => acc + (curr.finalScore || 0), 0);
  const averageScore = results.length > 0 ? totalScore / results.length : 0;
  
  const allExamsInputted = results.length > 0 && results.every(r => r.exam !== null && r.exam !== undefined);

  const getOverallGrade = (avg: number) => {
    if (!gradeScale || !allExamsInputted) return '-';
    const gradeObj = gradeScale.grades.find(g => avg >= g.minScore && avg <= g.maxScore);
    return gradeObj?.grade || '-';
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-4 sm:p-8 print:p-0 print:m-0 print:w-full print:max-w-none">
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
          {school?.logoUrl && (
            <img src={school.logoUrl} alt="School Logo" className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium text-gray-800 uppercase tracking-wider">{school?.name || 'School Name'}</h1>

            <p className="text-xs sm:text-sm text-gray-800">{school?.phone || ''} | {school?.email || ''}</p>
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-medium text-gray-800 uppercase tracking-widest mt-4">Student Terminal Report</h2>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4 mb-8">
        <div className="flex border-b border-gray-300 pb-1">
          <span className="font-medium text-gray-800 w-32">Name:</span>
          <span className="text-gray-800 uppercase font-medium">{student.firstName} {student.lastName}</span>
        </div>
        <div className="flex border-b border-gray-300 pb-1">
          <span className="font-medium text-gray-800 w-32">Reg Number:</span>
          <span className="text-gray-800 font-medium">{student.registrationNumber || 'N/A'}</span>
        </div>
        <div className="flex border-b border-gray-300 pb-1">
          <span className="font-medium text-gray-800 w-32">Class:</span>
          <span className="text-gray-800 font-medium">{studentClass?.name || 'N/A'}</span>
        </div>
        <div className="flex border-b border-gray-300 pb-1">
          <span className="font-medium text-gray-800 w-32">Session:</span>
          <span className="text-gray-800 font-medium">{session?.name || 'N/A'}</span>
        </div>
        <div className="flex border-b border-gray-300 pb-1">
          <span className="font-medium text-gray-800 w-32">Term:</span>
          <span className="text-gray-800 font-medium">{term?.name || 'N/A'}</span>
        </div>
      </div>

      {/* Grades Table */}
      <div className="mb-8 overflow-x-auto print:overflow-visible">
        <table className="w-full border-collapse border border-gray-800 min-w-[600px] print:min-w-0">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-800 px-3 py-2 text-left font-medium text-gray-800 uppercase text-sm">Subject</th>
              {caConfig.cas.map((ca, idx) => (
                <th key={idx} className="border border-gray-800 px-2 py-2 text-center font-medium text-gray-800 uppercase text-xs w-16">
                  {ca.name}<br/><span className="text-[10px] font-medium">({ca.maxScore})</span>
                </th>
              ))}
              <th className="border border-gray-800 px-2 py-2 text-center font-medium text-gray-800 uppercase text-xs w-20 bg-gray-200">
                CA Total<br/><span className="text-[10px] font-medium">({totalCaMax})</span>
              </th>
              <th className="border border-gray-800 px-2 py-2 text-center font-medium text-gray-800 uppercase text-xs w-16">
                Exam<br/><span className="text-[10px] font-medium">({caConfig.maxExamScore})</span>
              </th>
              <th className="border border-gray-800 px-2 py-2 text-center font-medium text-gray-800 uppercase text-xs w-20 bg-gray-200">
                Total<br/><span className="text-[10px] font-medium">({totalMaxScore})</span>
              </th>
              <th className="border border-gray-800 px-2 py-2 text-center font-medium text-gray-800 uppercase text-xs w-16">Grade</th>
              <th className="border border-gray-800 px-3 py-2 text-left font-medium text-gray-800 uppercase text-xs">Remark</th>
            </tr>
          </thead>
          <tbody>
            {results.map(result => (
              <tr key={result.id}>
                <td className="border border-gray-800 px-3 py-2 text-sm text-gray-800 font-medium">{getSubjectName(result.subjectId)}</td>
                {caConfig.cas.map((ca, idx) => {
                  const val = result.cas?.[ca.name] !== undefined ? result.cas[ca.name] : (idx === 0 ? result.ca1 : idx === 1 ? result.ca2 : idx === 2 ? result.ca3 : null);
                  return (
                    <td key={idx} className="border border-gray-800 px-2 py-2 text-center text-sm text-gray-800">{val !== null && val !== undefined ? val : '-'}</td>
                  );
                })}
                <td className="border border-gray-800 px-2 py-2 text-center text-sm font-medium text-gray-800 bg-gray-50">{result.caTotal || 0}</td>
                <td className="border border-gray-800 px-2 py-2 text-center text-sm text-gray-800">{result.exam !== null && result.exam !== undefined ? result.exam : '-'}</td>
                <td className="border border-gray-800 px-2 py-2 text-center text-sm font-medium text-gray-800 bg-gray-50">{result.finalScore || 0}</td>
                <td className="border border-gray-800 px-2 py-2 text-center text-sm font-medium text-gray-800">{result.grade || '-'}</td>
                <td className="border border-gray-800 px-3 py-2 text-xs text-gray-800 uppercase">{result.remark || '-'}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={caConfig.cas.length + 6} className="border border-gray-800 px-3 py-8 text-center text-gray-800 italic">
                  No results recorded for this term.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
        <div>
          <table className="w-full border-collapse border border-gray-800">
            <tbody>
              <tr>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 bg-gray-100 w-1/2">Total Score</td>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 text-center">{totalScore}</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 bg-gray-100">Average Score</td>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 text-center">{averageScore.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 bg-gray-100">Overall Grade</td>
                <td className="border border-gray-800 px-3 py-2 font-medium text-gray-800 text-center">{getOverallGrade(averageScore)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Grading Scale Reference */}
        {gradeScale && (
          <div>
            <table className="w-full border-collapse border border-gray-800 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-800 px-2 py-1 text-center font-medium text-gray-800">Score Range</th>
                  <th className="border border-gray-800 px-2 py-1 text-center font-medium text-gray-800">Grade</th>
                  <th className="border border-gray-800 px-2 py-1 text-center font-medium text-gray-800">Remark</th>
                </tr>
              </thead>
              <tbody>
                {gradeScale.grades.map((g, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-800 px-2 py-1 text-center text-gray-800">{g.minScore} - {g.maxScore}</td>
                    <td className="border border-gray-800 px-2 py-1 text-center font-medium text-gray-800">{g.grade}</td>
                    <td className="border border-gray-800 px-2 py-1 text-center text-gray-800">{g.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-16 mt-16 pt-8">
        <div className="text-center">
          <div className="border-b-2 border-gray-800 h-10 mb-2"></div>
          <p className="font-medium text-gray-800 uppercase text-sm">Class Teacher's Signature</p>
        </div>
        <div className="text-center">
          <div className="border-b-2 border-gray-800 h-10 mb-2"></div>
          <p className="font-medium text-gray-800 uppercase text-sm">Principal's Signature</p>
        </div>
      </div>
    </div>
  );
};
