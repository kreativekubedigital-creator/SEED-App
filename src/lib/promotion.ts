import { db, collection, getDocs, doc, updateDoc, query, where } from './compatibility';
import { UserProfile, Class, GradeScale } from '../types';

/**
 * Logic to determine the next class name based on current name.
 * Example: "Primary 1" -> "Primary 2", "SSS 3" -> "Graduate"
 */
export const getNextClassName = (currentName: string): string => {
  const name = currentName.trim().toUpperCase();
  
  // Terminal SSS/High School
  if (name.includes('SSS 3') || name.includes('YEAR 12') || name.includes('GRADE 12') || name.includes('JS 3')) {
    if (name.includes('SSS 3') || name.includes('YEAR 12') || name.includes('GRADE 12')) {
      return 'Graduate';
    }
  }

  // Primary 6 to JSS 1 transition
  if (name.includes('PRIMARY 6') || name.includes('GRADE 6') || name.includes('YEAR 6')) {
    return 'JSS 1';
  }

  // JSS 3 to SSS 1 transition
  if (name.includes('JSS 3') || name.includes('JS 3') || name.includes('GRADE 9') || name.includes('YEAR 9')) {
    return 'SSS 1';
  }

  // Look for a number at the end or middle and increment it
  const match = name.match(/(\d+)/);
  if (match) {
    const currentNum = parseInt(match[0], 10);
    const nextNum = currentNum + 1;
    // Replace the number with next number, keeping original casing if possible
    // But since we converted to upper, we'll return upper or try to preserve
    const originalName = currentName.trim();
    return originalName.replace(match[0], nextNum.toString());
  }

  return `${currentName.trim()} (Next)`;
};

/**
 * Promotes students in a school based on their results and the school's threshold.
 */
export const promoteStudents = async (schoolId: string, currentSessionId: string, threshold: number) => {
  try {
    let promoted = 0;
    let graduated = 0;
    let failed = 0;

    // 2. Get all students
    const studentsSnap = await getDocs(query(collection(db, 'users'), where('schoolId', '==', schoolId), where('role', '==', 'student')));
    const students = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));

    // 3. Get all classes
    const classesSnap = await getDocs(collection(db, `schools/${schoolId}/classes`));
    const classes = classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class));

    // 4. Get terms for current session to find the "3rd Term" (Promotion usually happens at the end of the year)
    const termsSnap = await getDocs(collection(db, `schools/${schoolId}/sessions/${currentSessionId}/terms`));
    const sessionTerms = termsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Logic to find the final term: "3rd Term" or the term with the highest order/name
    const finalTerm = sessionTerms.find(t => 
      t.name?.toLowerCase().includes('3rd') || 
      t.name?.toLowerCase().includes('third')
    ) || sessionTerms.sort((a, b) => (b.name || '').localeCompare(a.name || ''))[0];

    if (!finalTerm) {
      throw new Error("No terms found for the selected session. Ensure terms are defined.");
    }

    const promotions = [];

    for (const student of students) {
      if (!student.classId) continue;

      // 5. Check if student passed (Average score > threshold)
      const resultsSnap = await getDocs(query(
        collection(db, `schools/${schoolId}/results`),
        where('studentId', '==', student.uid),
        where('sessionId', '==', currentSessionId),
        where('termId', '==', finalTerm.id)
      ));

      if (resultsSnap.empty) {
        failed++; // Count as failed/repeated if no final term results found
        continue;
      }

      const results = resultsSnap.docs.map(d => d.data());
      // Use finalScore (actual marks) instead of total (hardcoded 100)
      const average = results.reduce((acc, r) => acc + (Number(r.finalScore) || Number(r.score) || 0), 0) / results.length;

      if (average >= threshold) {
        const currentClass = classes.find(c => c.id === student.classId);
        if (!currentClass) continue;

        const nextClassName = getNextClassName(currentClass.name);
        
        let nextClass = classes.find(c => c.name.toLowerCase() === nextClassName.toLowerCase());
        
        if (nextClassName === 'Graduate') {
          graduated++;
          promotions.push(updateDoc(doc(db, 'users', student.uid), {
            status: 'graduated',
            classId: null,
            previousClassId: student.classId
          }));
        } else if (nextClass) {
          promoted++;
          promotions.push(updateDoc(doc(db, 'users', student.uid), {
            classId: nextClass.id,
            previousClassId: student.classId,
            promotionHistory: [
              ...(student.promotionHistory || []),
              {
                from: student.classId,
                to: nextClass.id,
                date: new Date().toISOString(),
                sessionId: currentSessionId
              }
            ]
          }));
        } else {
          // If next class doesn't exist, maybe it's a new level? 
          // For now, we'll mark as failed if we can't find a destination class
          failed++;
        }
      } else {
        failed++;
      }
    }

    await Promise.all(promotions);
    return { promoted, graduated, failed };
  } catch (err) {
    console.error('Promotion failed:', err);
    throw err;
  }
};
