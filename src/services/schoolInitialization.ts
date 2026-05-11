import { db, collection, addDoc, setDoc, doc } from '../lib/compatibility';

/**
 * Initializes a new school with default configuration and data structures.
 * This ensures that new tenants have a working environment immediately after creation.
 */
export const initializeSchoolData = async (schoolId: string, config?: { 
  sessionName?: string, 
  termName?: string, 
  startDate?: string, 
  endDate?: string 
}) => {
  console.log(`[SchoolInitializer] Initializing data for school: ${schoolId}`);

  try {
    // 1. Create Default Academic Session (Current Year or provided)
    const currentYear = new Date().getFullYear();
    const sessionName = config?.sessionName || `${currentYear}/${currentYear + 1} Academic Session`;
    
    const sessionRef = await addDoc(collection(db, 'schools', schoolId, 'sessions'), {
      name: sessionName,
      isCurrent: true,
      schoolId: schoolId,
      createdAt: new Date().toISOString()
    });

    const sessionId = (sessionRef as any).id;
    console.log(`[SchoolInitializer] Created session: ${sessionId}`);

    // 2. Create Default Terms for the session
    const termNames = ['First Term', 'Second Term', 'Third Term'];
    const currentTermName = config?.termName || 'First Term';
    
    for (const name of termNames) {
      const isCurrent = name === currentTermName;
      let startDate = '';
      let endDate = '';

      if (isCurrent) {
        startDate = config?.startDate || `${currentYear}-09-01`;
        endDate = config?.endDate || `${currentYear}-12-15`;
      } else {
        // Default dates for other terms
        if (name === 'First Term') {
          startDate = `${currentYear}-09-01`;
          endDate = `${currentYear}-12-15`;
        } else if (name === 'Second Term') {
          startDate = `${currentYear + 1}-01-10`;
          endDate = `${currentYear + 1}-04-10`;
        } else {
          startDate = `${currentYear + 1}-05-01`;
          endDate = `${currentYear + 1}-07-30`;
        }
      }

      await addDoc(collection(db, 'schools', schoolId, 'sessions', sessionId, 'terms'), {
        name,
        isCurrent,
        startDate,
        endDate,
        schoolId: schoolId,
        createdAt: new Date().toISOString(),
        order: termNames.indexOf(name) + 1
      });
    }
    console.log(`[SchoolInitializer] Created default terms for session ${sessionId}`);

    // 3. Create Default Grading Scale
    await addDoc(collection(db, 'schools', schoolId, 'gradeScales'), {
      name: 'Standard Grading System',
      isDefault: true,
      schoolId: schoolId,
      promotionThreshold: 40,
      scales: [
        { grade: 'A', min: 75, max: 100, point: 5, remark: 'Excellent' },
        { grade: 'B', min: 65, max: 74, point: 4, remark: 'Very Good' },
        { grade: 'C', min: 50, max: 64, point: 3, remark: 'Good' },
        { grade: 'D', min: 45, max: 49, point: 2, remark: 'Fair' },
        { grade: 'E', min: 40, max: 44, point: 1, remark: 'Pass' },
        { grade: 'F', min: 0, max: 39, point: 0, remark: 'Fail' }
      ],
      createdAt: new Date().toISOString()
    });
    console.log(`[SchoolInitializer] Created default grading scale`);

    // 4. Create Default Fee Categories
    const feeCategories = [
      { name: 'Tuition Fee', description: 'Core academic tuition', isMandatory: true },
      { name: 'Uniform', description: 'School uniform and sports wear', isMandatory: false },
      { name: 'Books & Stationery', description: 'Textbooks and notebooks', isMandatory: false },
      { name: 'Development Levy', description: 'School infrastructure maintenance', isMandatory: true }
    ];

    for (const category of feeCategories) {
      await addDoc(collection(db, 'schools', schoolId, 'feeCategories'), {
        ...category,
        schoolId: schoolId,
        createdAt: new Date().toISOString()
      });
    }
    console.log(`[SchoolInitializer] Created default fee categories`);

    // 5. Create a default "Welcome" Announcement
    await addDoc(collection(db, 'schools', schoolId, 'announcements'), {
      title: 'Welcome to SEEDD!',
      content: 'Welcome to your new school management portal. You can now start by adding classes, teachers, and students.',
      audience: 'all',
      priority: 'high',
      schoolId: schoolId,
      createdAt: new Date().toISOString(),
      active: true
    });
    console.log(`[SchoolInitializer] Created welcome announcement`);

    console.log(`[SchoolInitializer] School ${schoolId} initialized successfully.`);
    return true;
  } catch (error) {
    console.error(`[SchoolInitializer] Error initializing school ${schoolId}:`, error);
    throw error;
  }
};
