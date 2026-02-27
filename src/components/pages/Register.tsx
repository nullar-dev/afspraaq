'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Loader2, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const Register: React.FC = () => {
  const router = useRouter();
  const { register, state } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof formData, string>>>(
    {}
  );

  const toSafeRegisterError = (err: unknown) => {
    if (!(err instanceof Error)) {
      return 'Unable to create account. Please try again later.';
    }
    const message = err.message.toLowerCase();

    if (message.includes('too many attempts')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (message.includes('password does not meet')) {
      return 'Password does not meet requirements.';
    }

    // Prevent account enumeration and raw upstream error disclosure.
    return 'Unable to create account. Please try again later.';
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));

    if (field === 'password') {
      let strength = 0;
      if (value.length >= 8) strength++;
      if (/[A-Z]/.test(value)) strength++;
      if (/[0-9]/.test(value)) strength++;
      if (/[^A-Za-z0-9]/.test(value)) strength++;
      setPasswordStrength(strength);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || state.isLoading) return;
    setError('');
    const nextFieldErrors: Partial<Record<keyof typeof formData, string>> = {};

    if (!formData.firstName.trim()) nextFieldErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) nextFieldErrors.lastName = 'Last name is required.';
    if (!formData.email.trim()) nextFieldErrors.email = 'Email is required.';
    if (!formData.password) nextFieldErrors.password = 'Password is required.';
    if (!formData.confirmPassword)
      nextFieldErrors.confirmPassword = 'Please confirm your password.';
    if (formData.password && formData.password !== formData.confirmPassword) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }
    if (formData.password && passwordStrength < 3) {
      nextFieldErrors.password = 'Please choose a stronger password.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) return;

    if (!agreeToTerms) {
      setError('Please accept the terms to continue.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      if (result.requiresEmailVerification) {
        router.push('/login?registered=true');
        return;
      }

      router.push('/booking/vehicle');
      router.refresh();
    } catch (err) {
      setError(toSafeRegisterError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = (fieldName: string) => `
    bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A]
    transition-all duration-300 rounded-xl py-5 sm:py-6 pl-12 pr-4
    ${
      focusedField === fieldName
        ? 'border-gold shadow-gold ring-2 ring-gold/20'
        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
    }
  `;

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-[#2A2A2A]';
    if (passwordStrength === 1) return 'bg-red-500';
    if (passwordStrength === 2) return 'bg-yellow-500';
    if (passwordStrength === 3) return 'bg-green-500';
    return 'bg-gold';
  };

  const passwordsMatch =
    formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-gold animate-pulse-gold">
            <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-[#0A0A0A]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-[#B0B0B0]">Join Gold Configurator for premium detailing</p>
        </div>

        <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-3.5 rounded-xl bg-white text-[#0A0A0A] font-medium opacity-60 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.5-1.13 2.77-2.42 3.62v2.25h3.9c2.28-2.1 3.58-5.2 3.58-8.85c0-.6-.05-1.18-.15-1.75"
              />
              <path
                fill="currentColor"
                d="M12.17 22c3.24 0 5.95-1.07 7.93-2.9l-3.9-2.25c-1.08.73-2.47 1.16-4.03 1.16c-3.1 0-5.73-2.1-6.66-4.92H1.5v2.33A9.83 9.83 0 0 0 12.17 22"
              />
              <path
                fill="currentColor"
                d="M5.51 13.09a5.9 5.9 0 0 1 0-3.76V7H1.5a9.83 9.83 0 0 0 0 8.42z"
              />
              <path
                fill="currentColor"
                d="M12.17 5.99c1.76 0 3.34.6 4.58 1.78l3.43-3.43A9.72 9.72 0 0 0 12.17 2A9.83 9.83 0 0 0 1.5 7l4.01 2.33c.93-2.82 3.56-4.92 6.66-4.92"
              />
            </svg>
            Continue with Google
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-3.5 rounded-xl bg-[#2F2F2F] text-white font-medium border border-[#3A3A3A] opacity-60 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M2 3h9.5v9.5H2zM12.5 3H22v9.5h-9.5zM2 13.5h9.5V23H2zM12.5 13.5H22V23h-9.5z"
              />
            </svg>
            Continue with Microsoft
          </button>
          <button
            disabled
            title="OAuth sign-in coming soon"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 sm:py-3.5 rounded-xl bg-[#000000] text-white font-medium border border-[#2A2A2A] opacity-60 cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16.72 12.86c-.03-2.53 2.07-3.75 2.16-3.8c-1.18-1.72-3-1.95-3.64-1.98c-1.55-.16-3.03.91-3.82.91s-2-.89-3.29-.87c-1.69.03-3.25.98-4.12 2.5c-1.76 3.05-.45 7.55 1.27 10.04c.84 1.21 1.84 2.56 3.16 2.51c1.27-.05 1.75-.82 3.29-.82c1.54 0 1.97.82 3.31.79c1.37-.03 2.23-1.24 3.07-2.45c.97-1.4 1.37-2.76 1.39-2.83c-.03-.01-2.66-1.02-2.69-4zM14.22 5.43c.7-.85 1.17-2.03 1.04-3.2c-1.01.04-2.24.67-2.96 1.52c-.65.75-1.22 1.95-1.07 3.1c1.13.09 2.29-.57 2.99-1.42"
              />
            </svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-4 mb-5 sm:mb-6">
          <div className="flex-1 h-px bg-[#2A2A2A]" />
          <span className="text-[#6B6B6B] text-sm">or register with email</span>
          <div className="flex-1 h-px bg-[#2A2A2A]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="firstName"
                className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${focusedField === 'firstName' ? 'text-gold' : 'text-[#B0B0B0]'}`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                First Name
              </Label>
              <div className="relative">
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  maxLength={100}
                  autoComplete="given-name"
                  value={formData.firstName}
                  onChange={e => handleInputChange('firstName', e.target.value)}
                  onFocus={() => setFocusedField('firstName')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('firstName')} py-4 sm:py-5 pl-10 sm:pl-12`}
                  required
                />
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                  <User className="w-4 h-4" />
                </div>
                {fieldErrors.firstName && (
                  <p className="text-red-400 text-xs">{fieldErrors.firstName}</p>
                )}
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label
                htmlFor="lastName"
                className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${focusedField === 'lastName' ? 'text-gold' : 'text-[#B0B0B0]'}`}
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Last Name
              </Label>
              <div className="relative">
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  maxLength={100}
                  autoComplete="family-name"
                  value={formData.lastName}
                  onChange={e => handleInputChange('lastName', e.target.value)}
                  onFocus={() => setFocusedField('lastName')}
                  onBlur={() => setFocusedField(null)}
                  className={`${inputClasses('lastName')} py-4 sm:py-5 pl-10 sm:pl-12`}
                  required
                />
                <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                  <User className="w-4 h-4" />
                </div>
                {fieldErrors.lastName && (
                  <p className="text-red-400 text-xs">{fieldErrors.lastName}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="email"
              className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${focusedField === 'email' ? 'text-gold' : 'text-[#B0B0B0]'}`}
            >
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Email Address
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                maxLength={254}
                autoComplete="email"
                inputMode="email"
                value={formData.email}
                onChange={e => handleInputChange('email', e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClasses('email')} py-4 sm:py-5 pl-10 sm:pl-12`}
                required
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            {fieldErrors.email && <p className="text-red-400 text-xs">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="password"
              className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${focusedField === 'password' ? 'text-gold' : 'text-[#B0B0B0]'}`}
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                maxLength={128}
                autoComplete="new-password"
                value={formData.password}
                onChange={e => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClasses('password')} pl-10 sm:pl-12 pr-12 py-4 sm:py-5`}
                required
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                <Lock className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-400 text-xs">{fieldErrors.password}</p>}
            <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                style={{ width: `${passwordStrength * 25}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label
              htmlFor="confirmPassword"
              className={`text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors ${focusedField === 'confirmPassword' ? 'text-gold' : 'text-[#B0B0B0]'}`}
            >
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                maxLength={128}
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={e => handleInputChange('confirmPassword', e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                className={`${inputClasses('confirmPassword')} pl-10 sm:pl-12 pr-12 py-4 sm:py-5`}
                required
              />
              <div className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]">
                <Lock className="w-4 h-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="text-xs text-red-400">{fieldErrors.confirmPassword}</p>
            ) : (
              formData.confirmPassword && (
                <p className={`text-xs ${passwordsMatch ? 'text-green-400' : 'text-red-400'}`}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={e => setAgreeToTerms(e.target.checked)}
              className="sr-only"
              aria-label="I agree to the terms and privacy policy."
            />
            <div
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${agreeToTerms ? 'bg-gold border-gold' : 'border-[#4A4A4A] group-hover:border-gold/50'}`}
            >
              {agreeToTerms && <Check className="w-3 h-3 text-[#0A0A0A]" />}
            </div>
            <span className="text-xs sm:text-sm text-[#B0B0B0]">
              I agree to the terms and privacy policy.
            </span>
          </label>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={state.isLoading || isSubmitting || !agreeToTerms || passwordStrength < 3}
            className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-5 sm:py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg"
          >
            {state.isLoading || isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
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

        <p className="mt-6 text-center text-[#B0B0B0]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-gold hover:text-gold-light font-semibold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
