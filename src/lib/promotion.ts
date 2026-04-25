import { db, collection, getDocs, doc, updateDoc, query, where } from './compatibility';
import { UserProfile, Class, GradeScale } from '../types';

/**
 * Logic to determine the next class name based on current name.
 * Example: "Primary 1" -> "Primary 2", "SSS 3" -> "Graduate"
 */
export const getNextClassName = (currentName: string): string => {
  const name = currentName.trim();
  
  // Handle specific terminal classes
  if (name.toUpperCase().includes('SSS 3') || name.toUpperCase().includes('YEAR 12') || name.toUpperCase().includes('GRADE 12')) {
    return 'Graduate';
  }

  // Look for a number at the end or middle and increment it
  const match = name.match(/(\d+)/);
  if (match) {
    const currentNum = parseInt(match[0], 10);
    const nextNum = currentNum + 1;
    return name.replace(match[0], nextNum.toString());
  }

  // Fallback: append " (Promoted)" if we can't figure it out
  return `${name} (Next)`;
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

    const promotions = [];

    for (const student of students) {
      if (!student.classId) continue;

      // 4. Check if student passed (Average score > threshold)
      const resultsSnap = await getDocs(query(
        collection(db, `schools/${schoolId}/results`),
        where('studentId', '==', student.uid),
        where('sessionId', '==', currentSessionId),
        where('termId', '==', '3rd_term')
      ));

      if (resultsSnap.empty) {
        failed++; // Count as failed/repeated if no 3rd term result
        continue;
      }

      const results = resultsSnap.docs.map(d => d.data());
      const average = results.reduce((acc, r) => acc + (r.total || 0), 0) / results.length;

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
