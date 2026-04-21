import { db } from '../firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  limit,
  orderBy
} from 'firebase/firestore';
import { UserProfile } from '../types';

export const XP_REWARDS = {
  LESSON_COMPLETE: 50,
  QUIZ_PASS: 100,
  DAILY_LOGIN: 20,
  AI_CHAT: 5,
  GAME_WIN: 75
};

export const COIN_REWARDS = {
  LESSON_COMPLETE: 10,
  QUIZ_PASS: 25,
  DAILY_LOGIN: 5,
  AI_CHAT: 1,
  GAME_WIN: 20
};

export const getLevelFromXP = (xp: number) => {
  // Simple progression: Level 1 (0), Level 2 (100), Level 3 (300), Level 4 (600), etc.
  // Formula: XP = 50 * level * (level - 1)
  // Solving for level: 50L^2 - 50L - XP = 0
  // L = (50 + sqrt(2500 + 200XP)) / 100
  const level = Math.floor((50 + Math.sqrt(2500 + 200 * xp)) / 100);
  return Math.max(1, level);
};

export const getXPForLevel = (level: number) => {
  return 50 * level * (level - 1);
};

export const BADGES = {
  EARLY_BIRD: { id: 'early_bird', title: 'Early Bird', description: 'Your first login!', icon: '🐦' },
  STREAK_3: { id: 'streak_3', title: 'Streak Starter', description: '3-day streak!', icon: '🔥' },
  STREAK_7: { id: 'streak_7', title: 'Streak Master', description: '7-day streak!', icon: '🏆' },
  QUIZ_5: { id: 'quiz_5', title: 'Quiz Whiz', description: 'Passed 5 quizzes!', icon: '🧠' },
  LESSON_5: { id: 'lesson_5', title: 'Lesson Explorer', description: 'Completed 5 lessons!', icon: '📚' },
  LEVEL_5: { id: 'level_5', title: 'Rising Star', description: 'Reached Level 5!', icon: '⭐' }
};

export const checkBadges = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return [];

  const userData = userSnap.data() as UserProfile;
  const badgesRef = collection(db, 'users', userId, 'badges');
  const earnedBadgesSnap = await getDocs(badgesRef);
  const earnedBadgeIds = new Set(earnedBadgesSnap.docs.map(doc => doc.data().badgeId));

  const newBadges = [];

  // Check Early Bird
  if (!earnedBadgeIds.has(BADGES.EARLY_BIRD.id)) {
    newBadges.push(BADGES.EARLY_BIRD);
  }

  // Check Streaks
  if ((userData.streakCount || 0) >= 3 && !earnedBadgeIds.has(BADGES.STREAK_3.id)) {
    newBadges.push(BADGES.STREAK_3);
  }
  if ((userData.streakCount || 0) >= 7 && !earnedBadgeIds.has(BADGES.STREAK_7.id)) {
    newBadges.push(BADGES.STREAK_7);
  }

  // Check Level
  if ((userData.level || 1) >= 5 && !earnedBadgeIds.has(BADGES.LEVEL_5.id)) {
    newBadges.push(BADGES.LEVEL_5);
  }

  // Check Activities (Quizzes/Lessons)
  const activitiesRef = collection(db, 'users', userId, 'activities');
  
  if (!earnedBadgeIds.has(BADGES.QUIZ_5.id)) {
    const q = query(activitiesRef, where('type', '==', 'quiz_pass'));
    const snap = await getDocs(q);
    if (snap.size >= 5) newBadges.push(BADGES.QUIZ_5);
  }

  if (!earnedBadgeIds.has(BADGES.LESSON_5.id)) {
    const q = query(activitiesRef, where('type', '==', 'lesson_complete'));
    const snap = await getDocs(q);
    if (snap.size >= 5) newBadges.push(BADGES.LESSON_5);
  }

  // Save new badges
  for (const badge of newBadges) {
    await addDoc(badgesRef, {
      badgeId: badge.id,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      earnedAt: serverTimestamp()
    });
  }

  return newBadges;
};

export const addXP = async (userId: string, type: keyof typeof XP_REWARDS, metadata: any = {}) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const userData = userSnap.data() as UserProfile;
  let xpToAdd = XP_REWARDS[type];
  let coinsToAdd = COIN_REWARDS[type];

  if (metadata?.calculatedXp !== undefined) {
    xpToAdd = metadata.calculatedXp;
  }
  if (metadata?.calculatedCoins !== undefined) {
    coinsToAdd = metadata.calculatedCoins;
  }
  
  const newXP = (userData.xp || 0) + xpToAdd;
  const newLevel = getLevelFromXP(newXP);
  const oldLevel = userData.level || 1;
  
  const updates: any = {
    xp: increment(xpToAdd),
    coins: increment(coinsToAdd)
  };
  
  if (newLevel > oldLevel) {
    updates.level = newLevel;
    // Potentially add level up notification or bonus
    updates.coins = increment(coinsToAdd + (newLevel * 10)); // Level up bonus
  }
  
  await updateDoc(userRef, updates);
  
  // Log activity
  await addDoc(collection(db, 'users', userId, 'activities'), {
    uid: userId,
    type: type.toLowerCase(),
    pointsEarned: xpToAdd,
    coinsEarned: coinsToAdd,
    timestamp: serverTimestamp(),
    metadata
  });

  // Check for badges
  await checkBadges(userId);
  
  return { leveledUp: newLevel > oldLevel, newLevel };
};

export const saveMemoryFlipScore = async (userId: string, firstName: string, lastName: string, scoreData: any) => {
  const scoreRef = collection(db, 'memoryFlipScores');
  const score = (scoreData.level * 10000) - (scoreData.moves * 10) - scoreData.time;
  
  await addDoc(scoreRef, {
    userId,
    firstName,
    lastName,
    ...scoreData,
    score,
    createdAt: serverTimestamp()
  });
};

export const getMemoryFlipLeaderboard = async (limitCount: number = 10) => {
  const scoresRef = collection(db, 'memoryFlipScores');
  const q = query(
    scoresRef,
    orderBy('score', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

export const updateStreak = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) return;
  
  const userData = userSnap.data() as UserProfile;
  const today = new Date().toISOString().split('T')[0];
  const lastActivity = userData.lastActivityDate;
  
  if (lastActivity === today) {
    // Still check badges even if streak didn't update (e.g. for Early Bird)
    await checkBadges(userId);
    return userData.streakCount;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  let newStreak = 1;
  if (lastActivity === yesterdayStr) {
    newStreak = (userData.streakCount || 0) + 1;
  }
  
  await updateDoc(userRef, {
    streakCount: newStreak,
    lastActivityDate: today,
    xp: increment(XP_REWARDS.DAILY_LOGIN),
    coins: increment(COIN_REWARDS.DAILY_LOGIN)
  });
  
  // Log daily login
  await addDoc(collection(db, 'users', userId, 'activities'), {
    uid: userId,
    type: 'daily_login',
    pointsEarned: XP_REWARDS.DAILY_LOGIN,
    coinsEarned: COIN_REWARDS.DAILY_LOGIN,
    timestamp: serverTimestamp()
  });

  // Check for badges
  await checkBadges(userId);
  
  return newStreak;
};

export const purchaseItem = async (userId: string, itemId: string, cost: number) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) throw new Error('User not found');
  
  const userData = userSnap.data() as UserProfile;
  const currentCoins = userData.coins || 0;
  const purchasedItems = userData.purchasedItems || [];
  
  if (currentCoins < cost) throw new Error('Insufficient coins');
  if (purchasedItems.includes(itemId)) throw new Error('Item already purchased');
  
  await updateDoc(userRef, {
    coins: increment(-cost),
    purchasedItems: [...purchasedItems, itemId]
  });
  
  // Log purchase
  await addDoc(collection(db, 'users', userId, 'activities'), {
    uid: userId,
    type: 'purchase',
    coinsSpent: cost,
    itemId,
    timestamp: serverTimestamp()
  });
  
  return true;
};

export const getLeaderboard = async (schoolId: string, limitCount: number = 10) => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef, 
    where('schoolId', '==', schoolId),
    where('role', '==', 'student'),
    orderBy('xp', 'desc'),
    limit(limitCount)
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
