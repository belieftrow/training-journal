export type WorkoutType = 'strength' | 'ball_sports' | 'yoga_meditation' | 'baduanjin' | 'cardio';

export interface Workout {
  id: string;
  type: WorkoutType;
  date: string; // ISO date string YYYY-MM-DD
  duration: number; // minutes
  intensity: 1 | 2 | 3 | 4 | 5;
  feedback: string;
  createdAt: string; // ISO datetime
  // Running-specific fields
  distance?: number; // km
  pace?: string; // e.g. "5'30\""
}

export const WORKOUT_TYPES: Record<WorkoutType, { label: string; emoji: string; color: string; bgColor: string }> = {
  strength:      { label: '力量训练', emoji: '🏋️', color: '#ff3b30', bgColor: '#fff2f2' },
  ball_sports:   { label: '球类运动', emoji: '🏸', color: '#ff9500', bgColor: '#fff8ef' },
  yoga_meditation: { label: '瑜伽冥想', emoji: '🧘', color: '#af52de', bgColor: '#faf5ff' },
  baduanjin:     { label: '八段锦',   emoji: '🌿', color: '#34c759', bgColor: '#f0faf3' },
  cardio:        { label: '有氧跑步', emoji: '🏃', color: '#007aff', bgColor: '#f0f5ff' },
};

export const INTENSITY_LABELS: Record<number, string> = {
  1: '很轻松',
  2: '轻松',
  3: '适中',
  4: '较累',
  5: '极限',
};

export interface WeeklyStats {
  totalWorkouts: number;
  totalMinutes: number;
  byType: Record<WorkoutType, { count: number; minutes: number }>;
  avgIntensity: number;
  streak: number;
}

export interface MonthlyStats extends WeeklyStats {
  bestDay: string;
  weeklyBreakdown: { week: number; count: number; minutes: number }[];
}

export interface AISuggestion {
  id: string;
  category: 'encouragement' | 'suggestion' | 'warning' | 'achievement';
  title: string;
  message: string;
  icon: string;
}
