'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      Swal.fire({
        icon: 'error',
        title: 'שגיאה',
        text: 'קישור לא תקין',
        confirmButtonText: 'אישור',
      }).then(() => {
        router.push('/login');
      });
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'שגיאה',
        text: 'הסיסמאות לא תואמות',
        confirmButtonText: 'אישור',
      });
      return;
    }

    if (password.length < 6) {
      await Swal.fire({
        icon: 'error',
        title: 'שגיאה',
        text: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        confirmButtonText: 'אישור',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'הצלחה!',
          text: data.message,
          confirmButtonText: 'התחבר עכשיו',
        });
        router.push('/login');
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'שגיאה',
          text: data.error || 'אירעה שגיאה',
          confirmButtonText: 'אישור',
        });
      }
    } catch (error) {
      console.error('שגיאה:', error);
      await Swal.fire({
        icon: 'error',
        title: 'שגיאה',
        text: 'אירעה שגיאה באיפוס הסיסמה',
        confirmButtonText: 'אישור',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">איפוס סיסמה</h2>
          <p className="text-gray-600">הזן את הסיסמה החדשה שלך</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              סיסמה חדשה
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="לפחות 6 תווים"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              אימות סיסמה
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="הזן את הסיסמה שוב"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'מאפס סיסמה...' : 'אפס סיסמה'}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-yellow-50 border-r-4 border-yellow-400 rounded">
          <p className="text-sm text-yellow-800">
            <strong>שים לב:</strong> לאחר איפוס הסיסמה, תצטרך להתחבר מחדש עם הסיסמה החדשה
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>טוען...</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
