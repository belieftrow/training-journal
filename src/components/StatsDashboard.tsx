import { useState, useMemo } from 'react';
import type { Workout, WorkoutType } from '@/types';
import { WORKOUT_TYPES } from '@/types';
import type { WeeklyStats, MonthlyStats } from '@/types';

interface Props {
  weekly: WeeklyStats;
  monthly: MonthlyStats;
  workouts: Workout[];
}

function computeRunningStats(list: Workout[]) {
  const runs = list.filter(w => w.type === 'cardio');
  if (runs.length === 0) return null;
  const totalDistance = runs.reduce((s, w) => s + (w.distance || 0), 0);
  const totalMinutes = runs.reduce((s, w) => s + w.duration, 0);
  const avgPaceTotalSec = runs
    .filter(w => w.distance && w.distance > 0)
    .map(w => (w.duration * 60) / w.distance!)
    .filter(s => s > 0);
  const avgPaceSec = avgPaceTotalSec.length > 0
    ? avgPaceTotalSec.reduce((a, b) => a + b, 0) / avgPaceTotalSec.length
    : 0;
  const paceMin = Math.floor(avgPaceSec / 60);
  const paceSec = String(Math.round(avgPaceSec % 60)).padStart(2, '0');
  return {
    count: runs.length,
    totalDistance,
    totalMinutes,
    avgPace: avgPaceSec > 0 ? `${paceMin}'${paceSec}"` : '—',
  };
}

export default function StatsDashboard({ weekly, monthly, workouts }: Props) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const stats = period === 'week' ? weekly : monthly;

  const periodWorkouts = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      return workouts.filter(w => w.date >= monday.toISOString().slice(0, 10));
    } else {
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      return workouts.filter(w => w.date >= monthStart);
    }
  }, [workouts, period]);

  const runningStats = useMemo(() => computeRunningStats(periodWorkouts), [periodWorkouts]);

  const typeEntries = useMemo(() =>
    Object.entries(stats.byType)
      .filter(([, v]) => v.count > 0)
      .sort((a, b) => b[1].minutes - a[1].minutes),
    [stats]
  );

  const maxMinutes = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, v]) => v.minutes), 1) : 1;

  // Daily breakdown for this week
  const dailyData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      days.push({
        label: weekDays[i],
        date: dateStr,
        count: dayWorkouts.length,
        minutes: dayWorkouts.reduce((s, w) => s + w.duration, 0),
        isToday: dateStr === now.toISOString().slice(0, 10),
      });
    }
    return days;
  }, [workouts]);

  const maxDailyMinutes = Math.max(...dailyData.map(d => d.minutes), 1);

  const weeklyBreakdown = useMemo(() => {
    if (!monthly.weeklyBreakdown || monthly.weeklyBreakdown.length === 0) {
      return [];
    }
    return monthly.weeklyBreakdown;
  }, [monthly]);

  const maxWeeklyMinutes = weeklyBreakdown.length > 0
    ? Math.max(...weeklyBreakdown.map(w => w.minutes), 1)
    : 1;

  const avgIntensityDisplay = stats.avgIntensity > 0 ? stats.avgIntensity.toFixed(1) : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="section-title mb-1">数据统计</h1>
        <p className="section-subtitle">了解你的训练规律与进步</p>
      </div>

      {/* Period Toggle */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--bg-primary)' }}>
          <button
            className={`segment-tab ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            本周
          </button>
          <button
            className={`segment-tab ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            本月
          </button>
        </div>
      </div>

      {/* Big Numbers */}
      <div className="app-card p-6">
        <div className="grid grid-cols-2 gap-y-6">
          <div className="text-center">
            <div className="text-[36px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
              {stats.totalWorkouts}
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              训练次数
            </div>
          </div>
          <div className="text-center">
            <div className="text-[36px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
              {stats.totalMinutes}
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              累计分钟
            </div>
          </div>
          <div className="text-center">
            <div className="text-[36px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
              {avgIntensityDisplay}
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              平均强度 /5
            </div>
          </div>
          <div className="text-center">
            <div className="text-[36px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--text-primary)' }}>
              {stats.streak}
            </div>
            <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>
              连续天数
            </div>
          </div>
        </div>
      </div>

      {/* Running Stats Card */}
      {runningStats && (
        <div className="app-card p-5" style={{ borderLeft: '4px solid var(--color-blue)' }}>
          <h3 className="text-[13px] font-semibold mb-4 tracking-[-0.01em] flex items-center gap-2" style={{ color: 'var(--color-blue)' }}>
            <span>🏃</span> 跑步数据
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-[24px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
                {runningStats.count}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>次数</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
                {runningStats.totalDistance.toFixed(1)}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>总距离 km</div>
            </div>
            <div className="text-center">
              <div className="text-[24px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
                {runningStats.avgPace}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>均配速 /km</div>
            </div>
          </div>
        </div>
      )}

      {/* Type Distribution */}
      {typeEntries.length > 0 && (
        <div className="app-card p-5">
          <h3 className="text-[13px] font-semibold mb-4 tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            运动类型分布
          </h3>
          <div className="space-y-3">
            {typeEntries.map(([type, data]) => {
              const info = WORKOUT_TYPES[type as WorkoutType];
              const widthPct = (data.minutes / maxMinutes) * 100;
              const isCardio = type === 'cardio';
              const cardioExtra = isCardio
                ? periodWorkouts.filter(w => w.type === 'cardio' && w.distance)
                : [];
              const cardioDist = cardioExtra.reduce((s, w) => s + (w.distance || 0), 0);
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-base w-8 text-center flex-shrink-0">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {info.label}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {data.count}次 · {data.minutes}分钟
                        {isCardio && cardioDist > 0 && (
                          <span> · {cardioDist.toFixed(1)}km</span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: info.bgColor }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: info.color,
                          transition: 'width 0.8s var(--ease-out-expo)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bar Chart - Daily (week) or Weekly (month) */}
      <div className="app-card p-5">
        <h3 className="text-[13px] font-semibold mb-5 tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
          {period === 'week' ? '每日训练时长' : '每周训练时长'}
        </h3>

        {period === 'week' ? (
          <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
            {dailyData.map((day, i) => {
              const heightPct = maxDailyMinutes > 0 ? (day.minutes / maxDailyMinutes) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2" style={{ height: '100%' }}>
                  <span className="text-[11px] font-medium" style={{ color: day.isToday ? 'var(--accent-blue)' : 'var(--text-tertiary)' }}>
                    {day.minutes > 0 ? `${day.minutes}m` : ''}
                  </span>
                  <div className="flex-1 w-full flex items-end justify-center">
                    <div
                      className="stat-bar w-full max-w-[36px] rounded-t-md"
                      style={{
                        height: `${Math.max(heightPct, day.minutes > 0 ? 4 : 2)}%`,
                        backgroundColor: day.isToday ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                        opacity: day.minutes > 0 ? 1 : 0.2,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  </div>
                  <span
                    className="text-[11px] font-medium"
                    style={{
                      color: day.isToday ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      fontWeight: day.isToday ? 600 : 400,
                    }}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-end justify-between gap-3" style={{ height: 140 }}>
            {weeklyBreakdown.length > 0 ? weeklyBreakdown.map((week, i) => {
              const heightPct = (week.minutes / maxWeeklyMinutes) * 100;
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-2" style={{ height: '100%' }}>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {week.minutes > 0 ? `${week.minutes}m` : ''}
                  </span>
                  <div className="flex-1 w-full flex items-end justify-center">
                    <div
                      className="stat-bar w-full max-w-[48px] rounded-t-md"
                      style={{
                        height: `${Math.max(heightPct, week.minutes > 0 ? 4 : 2)}%`,
                        backgroundColor: 'var(--accent-blue)',
                        opacity: week.minutes > 0 ? 1 : 0.2,
                        animationDelay: `${i * 0.08}s`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    第{week.week}周
                  </span>
                </div>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>暂无数据</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty State */}
      {stats.totalWorkouts === 0 && (
        <div className="app-card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-text">
              {period === 'week' ? '本周还没有训练记录' : '本月还没有训练记录'}<br />
              开始记录你的第一次训练吧
            </p>
          </div>
        </div>
      )}

      {/* Best Day */}
      {monthly.bestDay && period === 'month' && (
        <div className="app-card p-4 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            本月训练最多的一天
          </p>
          <p className="text-lg font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
            {monthly.bestDay}
          </p>
        </div>
      )}
    </div>
  );
}
