import { useState, useRef, useEffect } from 'react';
import type { Workout, WorkoutType } from '@/types';
import { WORKOUT_TYPES, INTENSITY_LABELS } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workout: Workout) => void;
}

export default function QuickRecordDialog({ open, onOpenChange, onSave }: Props) {
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [duration, setDuration] = useState('');
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Running-specific
  const [distance, setDistance] = useState('');
  const [paceMinutes, setPaceMinutes] = useState('');
  const [paceSeconds, setPaceSeconds] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedType(null);
      setDuration('');
      setIntensity(3);
      setFeedback('');
      setDistance('');
      setPaceMinutes('');
      setPaceSeconds('');
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Auto-calculate pace when distance and duration are both filled
  const autoPace = (() => {
    const dist = parseFloat(distance);
    const dur = parseInt(duration);
    if (!dist || !dur || dist <= 0 || dur <= 0) return null;
    const paceTotalSeconds = (dur * 60) / dist;
    const min = Math.floor(paceTotalSeconds / 60);
    const sec = Math.round(paceTotalSeconds % 60);
    return { min, sec: String(sec).padStart(2, '0') };
  })();

  const handleSubmit = () => {
    if (!selectedType || !duration || parseInt(duration) <= 0) return;
    setSubmitting(true);

    const isCardio = selectedType === 'cardio';
    let paceStr: string | undefined;

    if (isCardio) {
      if (paceMinutes && paceSeconds) {
        paceStr = `${paceMinutes}'${String(paceSeconds).padStart(2, '0')}"`;
      } else if (autoPace) {
        paceStr = `${autoPace.min}'${autoPace.sec}"`;
      }
    }

    const workout: Workout = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      type: selectedType,
      date: new Date().toISOString().slice(0, 10),
      duration: parseInt(duration),
      intensity,
      feedback: feedback.trim(),
      createdAt: new Date().toISOString(),
      ...(isCardio ? {
        distance: parseFloat(distance) || undefined,
        pace: paceStr,
      } : {}),
    };

    onSave(workout);
    setTimeout(() => {
      onOpenChange(false);
    }, 200);
  };

  const isRunning = selectedType === 'cardio';
  const isValid = selectedType && duration && parseInt(duration) > 0;
  const typeKeys = Object.keys(WORKOUT_TYPES) as WorkoutType[];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onOpenChange(false);
      }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 dialog-overlay animate-fade-in"
        style={{ animationDuration: '0.25s' }}
      />

      {/* Content */}
      <div
        className="relative w-full sm:max-w-md dialog-content mx-0 sm:mx-4 rounded-t-[28px] sm:rounded-[28px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--text-tertiary)', opacity: 0.4 }} />
        </div>

        {/* Header */}
        <div className="px-6 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            记录训练
          </h2>
          <button
            onClick={() => !submitting && onOpenChange(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-6">
          {/* Exercise Type */}
          <div>
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              运动类型
            </p>
            <div className="flex flex-wrap gap-2">
              {typeKeys.map((type) => {
                const info = WORKOUT_TYPES[type];
                return (
                  <button
                    key={type}
                    className="type-chip"
                    style={{
                      backgroundColor: selectedType === type ? info.bgColor : 'var(--bg-primary)',
                      color: selectedType === type ? info.color : 'var(--text-secondary)',
                      borderColor: info.color,
                    }}
                    onClick={() => setSelectedType(type)}
                  >
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              训练时长（分钟）
            </p>
            <input
              ref={inputRef}
              type="number"
              className="app-input"
              placeholder="例如：30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={1}
              max={480}
              inputMode="numeric"
            />
            {/* Quick picks */}
            <div className="flex gap-2 mt-3">
              {[15, 30, 45, 60, 90].map((d) => (
                <button
                  key={d}
                  className={`type-chip ${duration === String(d) ? 'selected' : ''}`}
                  style={{
                    backgroundColor: duration === String(d) ? 'var(--bg-primary)' : 'transparent',
                    color: duration === String(d) ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    borderColor: 'var(--accent-blue)',
                  }}
                  onClick={() => setDuration(String(d))}
                >
                  {d}分钟
                </button>
              ))}
            </div>
          </div>

          {/* Running-specific: Distance & Pace */}
          {isRunning && (
            <div>
              <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                跑步数据
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Distance */}
                <div>
                  <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
                    距离 (km)
                  </label>
                  <input
                    type="number"
                    className="app-input"
                    placeholder="5.0"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    min={0.1}
                    max={100}
                    step={0.1}
                    inputMode="decimal"
                  />
                </div>
                {/* Pace */}
                <div>
                  <label className="text-[11px] font-medium mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
                    配速 (min/km)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="app-input text-center"
                      placeholder="5"
                      value={paceMinutes}
                      onChange={(e) => setPaceMinutes(e.target.value)}
                      min={1}
                      max={20}
                      inputMode="numeric"
                      style={{ padding: '14px 8px' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>'</span>
                    <input
                      type="number"
                      className="app-input text-center"
                      placeholder="30"
                      value={paceSeconds}
                      onChange={(e) => setPaceSeconds(e.target.value)}
                      min={0}
                      max={59}
                      inputMode="numeric"
                      style={{ padding: '14px 8px' }}
                    />
                    <span style={{ color: 'var(--text-secondary)' }}>"</span>
                  </div>
                </div>
              </div>
              {autoPace && !paceMinutes && (
                <p className="text-[12px] mt-2" style={{ color: 'var(--accent-blue)' }}>
                  💡 自动计算配速：{autoPace.min}'{autoPace.sec}"/km
                </p>
              )}
            </div>
          )}

          {/* Intensity */}
          <div>
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              训练强度
              <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {INTENSITY_LABELS[intensity]}
              </span>
            </p>
            <div className="flex gap-3 justify-center">
              {([1, 2, 3, 4, 5] as const).map((level) => (
                <button
                  key={level}
                  className={`intensity-dot ${intensity === level ? 'active' : ''}`}
                  style={{
                    backgroundColor: intensity === level ? 'var(--text-primary)' : 'var(--bg-primary)',
                    color: intensity === level ? 'white' : 'var(--text-secondary)',
                    borderColor: 'var(--text-primary)',
                  }}
                  onClick={() => setIntensity(level)}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <p className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              练后反馈（选填）
            </p>
            <textarea
              className="app-input resize-none"
              rows={3}
              placeholder="记录今天的感受、进步或需要注意的地方…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              maxLength={200}
              style={{ lineHeight: 1.6 }}
            />
            <div className="text-right text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {feedback.length}/200
            </div>
          </div>

          {/* Submit */}
          <button
            className="w-full py-3.5 rounded-2xl text-[17px] font-semibold tracking-[-0.01em] transition-all duration-200"
            style={{
              backgroundColor: isValid ? 'var(--accent-blue)' : 'var(--bg-primary)',
              color: isValid ? 'white' : 'var(--text-tertiary)',
              transform: submitting ? 'scale(0.97)' : 'scale(1)',
              opacity: submitting ? 0.8 : 1,
            }}
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? '已记录 ✓' : '完成记录'}
          </button>
        </div>
      </div>
    </div>
  );
}
