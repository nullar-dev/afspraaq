'use client';

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check, Loader2, User, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const SAFE_REGISTER_MESSAGES = new Set([
  'unable to create account. please try again later.',
  'too many attempts. please wait and try again.',
  'password does not meet requirements.',
]);

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
    if (!(err instanceof Error)) return 'Unable to create account. Please try again later.';
    const message = err.message.trim();
    const normalized = message.toLowerCase();
    if (normalized.includes('too many attempts') || normalized.includes('rate limit')) {
      return 'Too many attempts. Please wait and try again.';
    }
    if (normalized.includes('password does not meet requirements')) {
      return 'Password does not meet requirements.';
    }
    if (!SAFE_REGISTER_MESSAGES.has(normalized)) {
      return 'Unable to create account. Please try again later. If you already have an account, sign in or reset your password.';
    }
    if (message === 'Unable to create account. Please try again later.') {
      return `${message} If you already have an account, sign in or reset your password.`;
    }
    return message;
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
