'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

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
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-white to-secondary/10 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl lg:grid-cols-2">
          <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/15 to-secondary/15 p-10">
            <div className="max-w-xs">
              <Image
                src="/images/LOGO.png"
                alt="BetterStay logo"
                width={320}
                height={80}
                priority
                className="h-auto w-full"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h1>
              <p className="mt-3 text-sm text-gray-600">
                Manage your BetterStay dashboard with a secure sign in.
              </p>
            </div>
          </div>

          <div className="w-full p-6 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-6 flex justify-center lg:hidden">
                <Image
                  src="/images/LOGO.png"
                  alt="BetterStay logo"
                  width={260}
                  height={64}
                  priority
                  className="h-auto w-full max-w-[260px]"
                />
              </div>
              <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
                Sign in to BetterStay
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Use your email and password to sign in
              </p>
            </div>

            <form
              className="mx-auto mt-8 w-full max-w-md space-y-5"
              onSubmit={handleSubmit}
              noValidate
            >
              {error && (
                <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
