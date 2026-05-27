import { useState, useMemo } from 'react';
import type { Workout, WorkoutType } from '@/types';
import { WORKOUT_TYPES } from '@/types';

interface Props {
  workouts: Workout[];
  onDelete: (id: string) => void;
}

export default function WorkoutHistory({ workouts, onDelete }: Props) {
  const [filter, setFilter] = useState<WorkoutType | 'all'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return workouts;
    return workouts.filter(w => w.type === filter);
  }, [workouts, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Workout[]> = {};
    for (const w of filtered) {
      if (!groups[w.date]) groups[w.date] = [];
      groups[w.date].push(w);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Calendar data: build a map of date -> workout types
  const calendarMap = useMemo(() => {
    const map: Record<string, WorkoutType[]> = {};
    for (const w of workouts) {
      if (!map[w.date]) map[w.date] = [];
      if (!map[w.date].includes(w.type)) {
        map[w.date].push(w.type);
      }
    }
    return map;
  }, [workouts]);

  // Generate calendar weeks
  const calendarWeeks = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDow = firstDay.getDay(); // 0=Sun

    const today = now.toISOString().slice(0, 10);
    const weeks: { date: string; day: number; isCurrentMonth: boolean; isToday: boolean; types: WorkoutType[]; count: number }[][] = [];
    let currentWeek: typeof weeks[0] = [];

    // Fill in days from previous month
    if (startDow > 0) {
      const prevLastDay = new Date(year, month, 0).getDate();
      for (let i = startDow - 1; i >= 0; i--) {
        const d = prevLastDay - i;
        // Use actual date string for prev month
        const prevMonth = month === 0 ? 12 : month;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const types = calendarMap[dateStr] || [];
        currentWeek.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === today, types, count: types.length });
      }
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const types = calendarMap[dateStr] || [];
      currentWeek.push({ date: dateStr, day: d, isCurrentMonth: true, isToday: dateStr === today, types, count: types.length });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days from next month
    if (currentWeek.length > 0) {
      for (let d = 1; currentWeek.length < 7; d++) {
        const nextMonth = month === 11 ? 1 : month + 2;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const types = calendarMap[dateStr] || [];
        currentWeek.push({ date: dateStr, day: d, isCurrentMonth: false, isToday: dateStr === today, types, count: types.length });
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [calendarMap]);

  const typeKeys = Object.keys(WORKOUT_TYPES) as WorkoutType[];

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  function formatDateLabel(dateStr: string): string {
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    const d = new Date(dateStr);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`;
  }

  // Selected date's workouts
  const selectedWorkouts = useMemo(() => {
    if (!selectedDate) return [];
    return workouts.filter(w => w.date === selectedDate);
  }, [selectedDate, workouts]);

  const weekDayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="section-title mb-1">训练记录</h1>
        <p className="section-subtitle">
          共 {workouts.length} 条训练记录
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        <button
          className="type-chip"
          style={{
            backgroundColor: filter === 'all' ? 'var(--text-primary)' : 'var(--bg-primary)',
            color: filter === 'all' ? 'white' : 'var(--text-secondary)',
            borderColor: 'var(--text-primary)',
          }}
          onClick={() => { setFilter('all'); setSelectedDate(null); }}
        >
          全部
        </button>
        {typeKeys.map((type) => {
          const info = WORKOUT_TYPES[type];
          return (
            <button
              key={type}
              className="type-chip"
              style={{
                backgroundColor: filter === type ? info.bgColor : 'var(--bg-primary)',
                color: filter === type ? info.color : 'var(--text-secondary)',
                borderColor: info.color,
              }}
              onClick={() => { setFilter(type); setSelectedDate(null); }}
            >
              <span>{info.emoji}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== Calendar View ===== */}
      {filter === 'all' && (
        <div className="app-card p-4">
          <h3 className="text-center text-[15px] font-semibold mb-4 tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {monthLabel}
          </h3>

          {/* Week day headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDayLabels.map((label, i) => (
              <div
                key={i}
                className="text-center text-[11px] font-medium py-1"
                style={{ color: i === 0 || i === 6 ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div>
            {calendarWeeks.map((week, wi) => (
              <div
                key={wi}
                className="grid grid-cols-7"
                style={{
                  animation: `fade-in-up 0.4s var(--ease-out-expo) both`,
                  animationDelay: `${0.06 * wi}s`,
                }}
              >
                {week.map((day) => (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                    className="relative flex flex-col items-center justify-start pt-1.5 pb-2 transition-all duration-150 rounded-lg"
                    style={{
                      opacity: day.isCurrentMonth ? 1 : 0.25,
                      cursor: day.isCurrentMonth ? 'pointer' : 'default',
                      backgroundColor: selectedDate === day.date ? 'var(--bg-primary)' : 'transparent',
                      transform: selectedDate === day.date ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    {/* Day number */}
                    <span
                      className="text-[12px] font-medium leading-none mb-1"
                      style={{
                        color: day.isToday ? 'var(--accent-blue)' : 'var(--text-primary)',
                        fontWeight: day.isToday ? 600 : 400,
                      }}
                    >
                      {day.day}
                    </span>

                    {/* Icons */}
                    {day.types.length > 0 ? (
                      <div className="flex flex-wrap gap-0.5 justify-center max-w-[36px]">
                        {day.types.map((type) => (
                          <span
                            key={type}
                            className="text-[10px] leading-none"
                            title={WORKOUT_TYPES[type].label}
                          >
                            {WORKOUT_TYPES[type].emoji}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}

                    {/* Today indicator */}
                    {day.isToday && (
                      <div
                        className="absolute bottom-0.5 w-1 h-1 rounded-full"
                        style={{ backgroundColor: 'var(--accent-blue)' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 justify-center mt-3 pt-3 border-t" style={{ borderColor: 'var(--bg-primary)' }}>
            {typeKeys.map((type) => (
              <span key={type} className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                <span className="text-xs">{WORKOUT_TYPES[type].emoji}</span>
                {WORKOUT_TYPES[type].label}
              </span>
            ))}
          </div>

          {/* Selected date detail */}
          {selectedDate && (
            <div
              className="mt-4 pt-4 border-t"
              style={{ borderColor: 'var(--bg-primary)', animation: 'fade-in-up 0.25s var(--ease-out-expo) both' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {formatDateLabel(selectedDate)}
                </h4>
              </div>
              {selectedWorkouts.length > 0 ? (
                <div className="space-y-2">
                  {selectedWorkouts.map((w, i) => {
                    const info = WORKOUT_TYPES[w.type];
                    const isDeleting = deletingId === w.id;
                    return (
                      <div
                        key={w.id}
                        className="flex items-center gap-3 py-2"
                        style={{
                          animation: `fade-in-up 0.3s var(--ease-out-expo) both`,
                          animationDelay: `${0.04 * i}s`,
                        }}
                      >
                        <span className="text-lg">{info.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                              {info.label}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                              {w.duration}分钟
                            </span>
                            {w.type === 'cardio' && w.distance && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                {w.distance}km
                              </span>
                            )}
                            {w.type === 'cardio' && w.pace && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                {w.pace}/km
                              </span>
                            )}
                          </div>
                          {w.feedback && (
                            <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                              {w.feedback}
                            </p>
                          )}
                        </div>
                        {isDeleting ? (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              className="text-[11px] font-medium px-2 py-1 rounded-md text-white"
                              style={{ backgroundColor: 'var(--color-red)' }}
                              onClick={() => { onDelete(w.id); setDeletingId(null); }}
                            >
                              确认
                            </button>
                            <button
                              className="text-[11px] font-medium px-2 py-1 rounded-md"
                              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                              onClick={() => setDeletingId(null)}
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-[11px] px-2 py-1 rounded-md font-medium flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                            style={{ color: 'var(--color-red)' }}
                            onClick={() => setDeletingId(w.id)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[13px] text-center py-2" style={{ color: 'var(--text-tertiary)' }}>
                  当天无训练记录
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== List View (when filtered) ===== */}
      {filter !== 'all' && (
        <>
          {grouped.length > 0 ? (
            <div className="space-y-6">
              {grouped.map(([date, items]) => (
                <div key={date}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[15px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
                      {formatDateLabel(date)}
                    </h3>
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                      {items.length} 次 · {items.reduce((s, w) => s + w.duration, 0)} 分钟
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((w, i) => {
                      const info = WORKOUT_TYPES[w.type];
                      const isDeleting = deletingId === w.id;
                      return (
                        <div
                          key={w.id}
                          className="app-card p-4 flex items-center gap-4"
                          style={{
                            animation: `fade-in-up 0.35s var(--ease-out-expo) both`,
                            animationDelay: `${0.04 * i}s`,
                          }}
                        >
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                            style={{ backgroundColor: info.bgColor }}
                          >
                            {info.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                {info.label}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                {w.duration}分钟
                              </span>
                              {w.type === 'cardio' && w.distance && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                  {w.distance}km
                                </span>
                              )}
                              {w.type === 'cardio' && w.pace && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.bgColor, color: info.color }}>
                                  {w.pace}/km
                                </span>
                              )}
                            </div>
                            {w.feedback && (
                              <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                                {w.feedback}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <div
                                  key={lvl}
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: lvl <= w.intensity ? info.color : 'var(--text-tertiary)',
                                    opacity: lvl <= w.intensity ? 1 : 0.25,
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          {isDeleting ? (
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                                style={{ backgroundColor: 'var(--color-red)' }}
                                onClick={() => { onDelete(w.id); setDeletingId(null); }}
                              >
                                确认
                              </button>
                              <button
                                className="text-xs font-medium px-3 py-1.5 rounded-lg"
                                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
                                onClick={() => setDeletingId(null)}
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                              style={{ color: 'var(--color-red)' }}
                              onClick={() => setDeletingId(w.id)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="app-card">
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p className="empty-state-text">
                  还没有「{WORKOUT_TYPES[filter].label}」的训练记录
                  <br />
                  点击首页的大按钮开始记录吧
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state for all */}
      {filter === 'all' && workouts.length === 0 && (
        <div className="app-card">
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <p className="empty-state-text">
              还没有任何训练记录
              <br />
              点击首页的大按钮开始记录吧
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
