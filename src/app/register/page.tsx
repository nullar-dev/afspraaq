'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inputClasses = (fieldName: string) => `
    bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A]
    transition-all duration-300 rounded-xl py-5 sm:py-6 px-4 sm:px-5
    ${
      focusedField === fieldName
        ? 'border-gold shadow-gold ring-2 ring-gold/20'
        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
    }
  `;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check if email confirmation is required
      router.push('/login?registered=true');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mx-auto mb-4 animate-pulse-gold">
            <User className="w-8 h-8 text-[#0A0A0A]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Create Account</h1>
          <p className="text-[#B0B0B0] text-base">Sign up to get started</p>
        </div>

        {/* Register Form */}
        <div className="bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                  focusedField === 'email' ? 'text-gold' : 'text-[#B0B0B0]'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('email')}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                  focusedField === 'password' ? 'text-gold' : 'text-[#B0B0B0]'
                }`}
              >
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('password')}
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                  focusedField === 'confirmPassword' ? 'text-gold' : 'text-[#B0B0B0]'
                }`}
              >
                <Lock className="w-4 h-4" />
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('confirmPassword')}
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold bg-gold hover:bg-gold-light text-[#0A0A0A] transition-all duration-300 rounded-xl"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create Account
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />
          </div>

          {/* Login Link */}
          <p className="text-center text-[#B0B0B0] text-sm">
            Already have an account?{' '}
            <a
              href="/login"
              className="text-gold hover:text-gold-light font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>

        {/* Back to Home */}
        <p className="text-center mt-6">
          <a href="/" className="text-[#6B6B6B] hover:text-gold text-sm transition-colors">
            ← Back to home
          </a>
        </p>
      </div>
    </div>
  );
}
