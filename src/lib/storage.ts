import type { Workout, WorkoutType, WeeklyStats, MonthlyStats, AISuggestion } from '@/types';
import { WORKOUT_TYPES } from '@/types';

export function getTodayWorkouts(workouts: Workout[]): Workout[] {
  const today = new Date().toISOString().slice(0, 10);
  return workouts.filter(w => w.date === today);
}

export function getWeekWorkouts(workouts: Workout[]): Workout[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString().slice(0, 10);
  return workouts.filter(w => w.date >= weekStart);
}

export function getMonthWorkouts(workouts: Workout[]): Workout[] {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return workouts.filter(w => w.date >= monthStart);
}

export function computeWeeklyStats(workouts: Workout[]): WeeklyStats {
  const weekWorkouts = getWeekWorkouts(workouts);
  if (weekWorkouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalMinutes: 0,
      byType: Object.keys(WORKOUT_TYPES).reduce((acc, type) => {
        acc[type as WorkoutType] = { count: 0, minutes: 0 };
        return acc;
      }, {} as Record<WorkoutType, { count: number; minutes: number }>),
      avgIntensity: 0,
      streak: 0,
    };
  }

  const byType = Object.keys(WORKOUT_TYPES).reduce((acc, type) => {
    acc[type as WorkoutType] = { count: 0, minutes: 0 };
    return acc;
  }, {} as Record<WorkoutType, { count: number; minutes: number }>);

  for (const w of weekWorkouts) {
    if (byType[w.type]) {
      byType[w.type].count++;
      byType[w.type].minutes += w.duration;
    }
  }

  const totalMinutes = weekWorkouts.reduce((s, w) => s + w.duration, 0);
  const avgIntensity = weekWorkouts.reduce((s, w) => s + w.intensity, 0) / weekWorkouts.length;

  // Calculate streak: consecutive days with workouts ending today
  let streak = 0;
  const datesWithWorkouts = new Set(workouts.map(w => w.date));
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (datesWithWorkouts.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return {
    totalWorkouts: weekWorkouts.length,
    totalMinutes,
    byType,
    avgIntensity,
    streak,
  };
}

export function computeMonthlyStats(workouts: Workout[]): MonthlyStats {
  const monthWorkouts = getMonthWorkouts(workouts);
  const base = computeWeeklyStats(workouts);

  if (monthWorkouts.length === 0) {
    return {
      ...base,
      bestDay: '',
      weeklyBreakdown: [],
    };
  }

  // Best day
  const dayCount: Record<string, number> = {};
  for (const w of monthWorkouts) {
    dayCount[w.date] = (dayCount[w.date] || 0) + 1;
  }
  let bestDay = '';
  let maxCount = 0;
  for (const [date, count] of Object.entries(dayCount)) {
    if (count > maxCount) {
      maxCount = count;
      bestDay = date;
    }
  }

  // Weekly breakdown
  const now = new Date();
  const totalWeeks = Math.ceil(now.getDate() / 7);
  const weeklyBreakdown = [];
  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), w * 7 + 1);
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), Math.min((w + 1) * 7, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
    const weekWorkouts = monthWorkouts.filter(wk => {
      const d = wk.date;
      return d >= weekStart.toISOString().slice(0, 10) && d <= weekEnd.toISOString().slice(0, 10);
    });
    weeklyBreakdown.push({
      week: w + 1,
      count: weekWorkouts.length,
      minutes: weekWorkouts.reduce((s, wk) => s + wk.duration, 0),
    });
  }

  return {
    ...base,
    bestDay,
    weeklyBreakdown,
  };
}

export function generateAISuggestions(workouts: Workout[]): AISuggestion[] {
  const weekly = computeWeeklyStats(workouts);
  const suggestions: AISuggestion[] = [];

  // Streak encouragement
  if (weekly.streak >= 3) {
    suggestions.push({
      id: 'streak',
      category: 'achievement',
      title: '连续训练势头正旺',
      message: `你已经连续 ${weekly.streak} 天保持训练，这种自律非常难得。继续保持，让运动成为习惯的一部分。`,
      icon: '🔥',
    });
  }

  // Low volume warning
  const weekDays = getWeekWorkouts(workouts);
  const uniqueWeekDays = new Set(weekDays.map(w => w.date)).size;
  if (uniqueWeekDays < 3 && weekly.streak < 3) {
    suggestions.push({
      id: 'low_volume',
      category: 'suggestion',
      title: '本周训练频率偏低',
      message: '建议每周至少保持 3-4 天的训练频率，即使是短时间的轻量运动也有助于维持身体状态。试着从 15 分钟开始吧。',
      icon: '💡',
    });
  }

  // Type balance
  const typeEntries = Object.entries(weekly.byType);
  const maxType = typeEntries.sort((a, b) => b[1].count - a[1].count)[0];
  const minTypes = typeEntries.filter(([, v]) => v.count === 0);
  if (minTypes.length > 0 && weekly.totalWorkouts >= 3) {
    const missing = minTypes.map(([t]) => WORKOUT_TYPES[t as WorkoutType].label).join('、');
    suggestions.push({
      id: 'balance',
      category: 'suggestion',
      title: '尝试多样化训练',
      message: `你近期主要以「${WORKOUT_TYPES[maxType[0] as WorkoutType].label}」为主，建议加入${missing}来平衡体能发展，避免单一运动带来的疲劳和损伤。`,
      icon: '⚖️',
    });
  }

  // Rest reminder
  const today = new Date().toISOString().slice(0, 10);
  const todayWorkouts = workouts.filter(w => w.date === today);
  const todayIntensity = todayWorkouts.reduce((s, w) => s + w.intensity, 0);
  if (todayIntensity >= 8) {
    suggestions.push({
      id: 'rest',
      category: 'warning',
      title: '注意适当休息',
      message: '今天的训练强度较高，记得充分补水、拉伸放松，保证充足的睡眠帮助身体恢复。',
      icon: '⚠️',
    });
  }

  // Milestone
  if (workouts.length >= 10 && workouts.length % 10 < 3) {
    suggestions.push({
      id: 'milestone',
      category: 'achievement',
      title: `累计完成 ${workouts.length} 次训练`,
      message: '每一个记录都是成长的印记。回顾一下你的进步，你会发现自己比想象中更强大。',
      icon: '🏆',
    });
  }

  // General encouragement
  if (weekly.totalWorkouts >= 4) {
    suggestions.push({
      id: 'great_week',
      category: 'encouragement',
      title: '这周表现很棒',
      message: `本周已累计训练 ${weekly.totalMinutes} 分钟，你的坚持正在悄悄改变你的身体。每一次挥汗都算数。`,
      icon: '💪',
    });
  }

  // For new users / low data
  if (workouts.length < 3) {
    suggestions.push({
      id: 'welcome',
      category: 'encouragement',
      title: '欢迎开始你的训练之旅',
      message: '每一段伟大的旅程都从第一步开始。记录下每一次训练，你会发现自己的成长轨迹。',
      icon: '🌟',
    });
  }

  return suggestions.slice(0, 4);
}
