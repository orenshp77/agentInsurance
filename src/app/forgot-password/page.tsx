'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'בקשה נשלחה!',
          text: data.message,
          confirmButtonText: 'אישור',
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
        text: 'אירעה שגיאה בשליחת הבקשה',
        confirmButtonText: 'אישור',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">שכחת סיסמה?</h2>
          <p className="text-gray-600">
            הזן את המייל שלך ונשלח לך קישור לאיפוס הסיסמה
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              כתובת מייל
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="example@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              חזרה להתחברות
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border-r-4 border-blue-400 rounded">
          <p className="text-sm text-blue-800">
            <strong>שים לב:</strong> הקישור יהיה תקף למשך שעה אחת בלבד
          </p>
        </div>
      </div>
    </div>
  );
}
