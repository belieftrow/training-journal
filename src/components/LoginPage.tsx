import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('请填写用户名和密码');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请稍后重试');
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Logo */}
      <div className="mb-10 text-center animate-fade-in-up">
        <div className="text-5xl mb-4">🏋️</div>
        <h1 className="text-2xl font-semibold tracking-[-0.025em]" style={{ color: 'var(--text-primary)' }}>
          训练日志
        </h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'login' ? '欢迎回来，继续你的训练之旅' : '创建账号，开始记录每一次进步'}
        </p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-sm animate-fade-in-up stagger-1">
        <form onSubmit={handleSubmit} className="app-card p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              用户名
            </label>
            <input
              type="text"
              className="app-input"
              placeholder="输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
              密码
            </label>
            <input
              type="password"
              className="app-input"
              placeholder={mode === 'login' ? '输入密码' : '设置密码（至少4位）'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {/* Confirm Password (register only) */}
          {mode === 'register' && (
            <div>
              <label className="text-[13px] font-medium mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                确认密码
              </label>
              <input
                type="password"
                className="app-input"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="text-[13px] text-center py-2 px-3 rounded-lg" style={{ backgroundColor: '#fff2f2', color: 'var(--color-red)' }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl text-[15px] font-semibold tracking-[-0.01em] transition-all duration-200"
            style={{
              backgroundColor: submitting ? 'var(--bg-primary)' : 'var(--accent-blue)',
              color: submitting ? 'var(--text-tertiary)' : 'white',
            }}
          >
            {submitting ? '处理中…' : mode === 'login' ? '登录' : '注册'}
          </button>
        </form>

        {/* Switch mode */}
        <p className="text-center text-[13px] mt-5" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            className="ml-1 font-medium"
            style={{ color: 'var(--accent-blue)' }}
            onClick={switchMode}
          >
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </div>

      {/* Footer note */}
      <p className="text-[11px] mt-12 text-center px-4 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
        训练数据将安全保存在云端，随时随地登录即可查看
      </p>
    </div>
  );
}
