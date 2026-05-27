import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Workout, WorkoutType } from '@/types';
import { WORKOUT_TYPES } from '@/types';
import { apiGetWorkouts, apiAddWorkout, apiDeleteWorkout } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import QuickRecordDialog from '@/components/QuickRecordDialog';
import StatsDashboard from '@/components/StatsDashboard';
import AICoach from '@/components/AICoach';
import WorkoutHistory from '@/components/WorkoutHistory';
import { computeWeeklyStats, computeMonthlyStats, generateAISuggestions, getTodayWorkouts } from '@/lib/storage';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function formatDate(): string {
  const now = new Date();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekDay = weekDays[now.getDay()];
  return `${month} 月 ${day} 日 ${weekDay}`;
}

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'stats' | 'history'>('home');

  const refreshWorkouts = useCallback(async () => {
    try {
      const data = await apiGetWorkouts();
      setWorkouts(data);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshWorkouts();
    }
  }, [user, refreshWorkouts]);

  const todayWorkouts = useMemo(() => getTodayWorkouts(workouts), [workouts]);
  const weeklyStats = useMemo(() => computeWeeklyStats(workouts), [workouts]);
  const monthlyStats = useMemo(() => computeMonthlyStats(workouts), [workouts]);
  const suggestions = useMemo(() => generateAISuggestions(workouts), [workouts]);

  const handleSave = async (workout: Workout) => {
    await apiAddWorkout(workout);
    await refreshWorkouts();
  };

  const handleDelete = async (id: string) => {
    await apiDeleteWorkout(id);
    await refreshWorkouts();
  };

  const todayTotalMinutes = todayWorkouts.reduce((s, w) => s + w.duration, 0);
  const todayCount = todayWorkouts.length;

  // Show loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="text-4xl animate-gentle-float">🏋️</div>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>加载中…</p>
        </div>
      </div>
    );
  }

  // Not authenticated -> login page
  if (!user) {
    return <LoginPage />;
  }

  // Data still loading
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="text-4xl animate-gentle-float">📊</div>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>加载训练数据…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ===== Navigation ===== */}
      <header className="sticky top-0 z-50 glass-surface border-b border-black/5 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
              训练日志
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
              @{user.username}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--bg-primary)' }}>
              {(['home', 'stats', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  className={`segment-tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'home' ? '首页' : tab === 'stats' ? '统计' : '记录'}
                </button>
              ))}
            </div>
            <button
              onClick={logout}
              className="text-[11px] font-medium ml-1 px-2 py-1 rounded-lg transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              title="退出登录"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="max-w-2xl mx-auto px-5 pt-6">
        {activeTab === 'home' && (
          <>
            {/* Hero Section */}
            <section className="text-center py-8 animate-fade-in-up">
              <p className="section-subtitle mb-1">{formatDate()}</p>
              <h1 className="text-3xl font-semibold tracking-[-0.025em] mb-2" style={{ color: 'var(--text-primary)' }}>
                {getGreeting()}，{user.username}
              </h1>
              {todayCount > 0 ? (
                <p className="section-subtitle">
                  今日已完成 <strong style={{ color: 'var(--text-primary)' }}>{todayCount}</strong> 次训练，
                  累计 <strong style={{ color: 'var(--text-primary)' }}>{todayTotalMinutes}</strong> 分钟
                </p>
              ) : (
                <p className="section-subtitle">准备好了吗？开始今天的训练吧</p>
              )}
            </section>

            {/* Record Button */}
            <section className="flex justify-center py-4 mb-8 animate-scale-in stagger-1">
              <button
                className="record-button"
                onClick={() => setDialogOpen(true)}
                aria-label="记录训练"
              >
                <span className="record-button-icon">＋</span>
                <span className="record-button-text">记录训练</span>
              </button>
            </section>

            {/* Today's Workouts */}
            {todayWorkouts.length > 0 && (
              <section className="mb-8 animate-fade-in-up stagger-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="section-title">今日训练</h2>
                </div>
                <div className="space-y-2">
                  {todayWorkouts.map((w, i) => (
                    <WorkoutItem key={w.id} workout={w} onDelete={handleDelete} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* AI Coach */}
            <section className="mb-8 animate-fade-in-up stagger-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">AI 教练</h2>
              </div>
              <AICoach suggestions={suggestions} />
            </section>

            {/* Quick Stats */}
            <section className="mb-8 animate-fade-in-up stagger-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">本周概览</h2>
                <button
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent-blue)' }}
                  onClick={() => setActiveTab('stats')}
                >
                  查看详情 →
                </button>
              </div>
              <StatsPreview stats={weeklyStats} />
            </section>
          </>
        )}

        {activeTab === 'stats' && (
          <section className="animate-fade-in-up">
            <StatsDashboard weekly={weeklyStats} monthly={monthlyStats} workouts={workouts} />
          </section>
        )}

        {activeTab === 'history' && (
          <section className="animate-fade-in-up">
            <WorkoutHistory workouts={workouts} onDelete={handleDelete} />
          </section>
        )}
      </main>

      {/* Quick Record Dialog */}
      <QuickRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  );
}

/* ===== Inline Sub-Components ===== */

function WorkoutItem({ workout, onDelete, index }: { workout: Workout; onDelete: (id: string) => void; index: number }) {
  const type = WORKOUT_TYPES[workout.type];
  const [deleting, setDeleting] = useState(false);

  return (
    <div
      className="app-card interactive p-4 flex items-center gap-4"
      style={{
        animation: `fade-in-up 0.4s var(--ease-out-expo) both`,
        animationDelay: `${0.05 * index}s`,
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: type.bgColor }}
      >
        {type.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-medium tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
            {type.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: type.bgColor, color: type.color }}>
            {workout.duration}分钟
          </span>
          {workout.type === 'cardio' && workout.distance && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: type.bgColor, color: type.color }}>
              {workout.distance}km
            </span>
          )}
          {workout.type === 'cardio' && workout.pace && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: type.bgColor, color: type.color }}>
              {workout.pace}/km
            </span>
          )}
        </div>
        {workout.feedback && (
          <p className="text-[13px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {workout.feedback}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: i <= workout.intensity ? type.color : 'var(--text-tertiary)',
                opacity: i <= workout.intensity ? 1 : 0.25,
              }}
            />
          ))}
        </div>
      </div>
      {deleting ? (
        <div className="flex gap-1">
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg text-white"
            style={{ backgroundColor: 'var(--color-red)' }}
            onClick={() => { onDelete(workout.id); setDeleting(false); }}
          >
            确认
          </button>
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)' }}
            onClick={() => setDeleting(false)}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          className="text-xs px-3 py-1.5 rounded-lg font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--color-red)' }}
          onClick={() => setDeleting(true)}
        >
          删除
        </button>
      )}
    </div>
  );
}

function StatsPreview({ stats }: { stats: ReturnType<typeof computeWeeklyStats> }) {
  const typeEntries = Object.entries(stats.byType)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].minutes - a[1].minutes);

  const maxMinutes = typeEntries.length > 0 ? Math.max(...typeEntries.map(([, v]) => v.minutes), 1) : 1;

  return (
    <div className="app-card p-5">
      <div className="grid grid-cols-3 gap-4 mb-5">
        <StatFigure label="训练次数" value={stats.totalWorkouts} unit="次" />
        <StatFigure label="累计时长" value={stats.totalMinutes} unit="分钟" />
        <StatFigure label="连续天数" value={stats.streak} unit="天" />
      </div>

      {typeEntries.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            运动分布
          </p>
          <div className="space-y-2">
            {typeEntries.map(([type, data]) => {
              const info = WORKOUT_TYPES[type as WorkoutType];
              const widthPct = (data.minutes / maxMinutes) * 100;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm w-6 text-center">{info.emoji}</span>
                  <span className="text-[13px] font-medium w-16 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {info.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: info.bgColor }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: info.color,
                        transitionDelay: '0.2s',
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-medium w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
                    {data.minutes}m
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatFigure({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-[28px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
        {value > 0 && <span className="ml-0.5 opacity-60">{unit}</span>}
      </div>
    </div>
  );
}
