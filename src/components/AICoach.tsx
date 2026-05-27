import type { AISuggestion } from '@/types';

interface Props {
  suggestions: AISuggestion[];
}

const categoryStyles: Record<AISuggestion['category'], { borderColor: string }> = {
  encouragement: { borderColor: 'var(--color-blue)' },
  suggestion: { borderColor: 'var(--color-green)' },
  warning: { borderColor: 'var(--color-orange)' },
  achievement: { borderColor: 'var(--color-purple)' },
};

export default function AICoach({ suggestions }: Props) {
  return (
    <div className="space-y-2">
      {suggestions.map((s, i) => {
        const styles = categoryStyles[s.category];
        return (
          <div
            key={s.id}
            className="suggestion-card"
            style={{
              borderLeft: `3px solid ${styles.borderColor}`,
              animation: `fade-in-up 0.4s var(--ease-out-expo) both`,
              animationDelay: `${0.06 * i}s`,
            }}
          >
            <div className="suggestion-icon">
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>
                {s.title}
              </p>
              <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {s.message}
              </p>
            </div>
          </div>
        );
      })}

      {suggestions.length === 0 && (
        <div className="suggestion-card" style={{ borderLeft: '3px solid var(--text-tertiary)' }}>
          <div className="suggestion-icon">
            🤖
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              开启你的训练之旅
            </p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              完成几次训练后，AI 教练会为你提供个性化的训练分析和建议。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
