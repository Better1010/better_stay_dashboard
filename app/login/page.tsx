'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const redirectPath = {
        super_admin: '/super-admin',
        hostel_admin: '/admin',
        resident: '/resident',
        staff: '/staff',
      }[user.role];
      router.push(redirectPath || '/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError('');
    setLoading(true);

    if (!email.trim()) {
      setError('Email address is required');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const result = await login(email.trim(), '', password);
      if (result.success && result.redirectPath) {
        router.push(result.redirectPath);
      } else {
        setError(result.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-primary to-primary/85 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(236,115,98,0.20),transparent_40%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
            <Image
              src="/images/LOGO.png"
              alt="BetterStay logo"
              width={320}
              height={80}
              priority
              className="h-auto w-[240px] rounded-xl bg-white/90 p-3 shadow-lg xl:w-[300px]"
            />
            <div className="max-w-lg text-white">
              <p className="mb-4 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-medium tracking-wide uppercase">
                Property Management Platform
              </p>
              <h1 className="text-4xl font-bold leading-tight xl:text-5xl">
                Manage operations with confidence.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-white/90 xl:text-base">
                Streamline expenses, maintenance, and resident workflows in one secure dashboard designed for modern teams.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center px-4 py-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Image
                src="/images/LOGO.png"
                alt="BetterStay logo"
                width={280}
                height={70}
                priority
                className="mx-auto h-auto w-full max-w-[260px]"
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sign in</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Welcome back. Enter your account details to continue.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                {error && (
                  <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/25"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/25"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white hover:bg-primary/90"
                >
                  {loading ? 'Signing in...' : 'Sign in to dashboard'}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
