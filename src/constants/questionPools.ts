import { PRIMARY_1_ENGLISH_POOL } from './primary1EnglishQuestions';
import { PRIMARY_1_MATH_POOL } from './primary1MathQuestions';
import { PRIMARY_2_ENGLISH_POOL } from './primary2EnglishQuestions';
import { PRIMARY_2_MATH_POOL } from './primary2MathQuestions';
import { PRIMARY_3_ENGLISH_POOL } from './primary3EnglishQuestions';
import { PRIMARY_3_MATH_POOL } from './primary3MathQuestions';
import { PRIMARY_4_ENGLISH_POOL } from './primary4EnglishQuestions';
import { PRIMARY_4_MATH_POOL } from './primary4MathQuestions';
import { PRIMARY_5_ENGLISH_POOL } from './primary5EnglishQuestions';
import { PRIMARY_5_MATH_POOL } from './primary5MathQuestions';
import { Lesson } from '../types';

/**
 * Registry of large question pools for lessons.
 * Keys are in the format: "Level_Subject"
 */
const pools: Record<string, Lesson['quiz']> = {
  'Primary 1_English': PRIMARY_1_ENGLISH_POOL,
  'Primary 1_Math': PRIMARY_1_MATH_POOL,
  'Primary 2_English': PRIMARY_2_ENGLISH_POOL,
  'Primary 2_Math': PRIMARY_2_MATH_POOL,
  'Primary 3_English': PRIMARY_3_ENGLISH_POOL,
  'Primary 3_Math': PRIMARY_3_MATH_POOL,
  'Primary 4_English': PRIMARY_4_ENGLISH_POOL,
  'Primary 4_Math': PRIMARY_4_MATH_POOL,
  'Primary 5_English': PRIMARY_5_ENGLISH_POOL,
  'Primary 5_Math': PRIMARY_5_MATH_POOL,
  // Future pools will be added here as the user provides JSON files
};

/**
 * Dynamically retrieves a question pool for a given level and subject.
 * Optionally filters by topic.
 * Falls back to null if no pool is found.
 */
export const getQuestionPool = (level: string, subject: string, topic?: string): Lesson['quiz'] | null => {
  const key = `${level}_${subject}`;
  const pool = pools[key];
  
  if (!pool) return null;
  
  if (topic) {
    const filtered = pool.filter(q => q.topic === topic);
    return filtered.length > 0 ? filtered : null; // Fallback to lesson.quiz if topic not found
  }
  
  return pool;
};
