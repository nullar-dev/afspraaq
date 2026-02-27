'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CreditCard, Lock, Shield, Check, Sparkles, Calendar, Clock, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fetchWithTimeout } from '@/lib/http';
import { decodeBookingConfirmationResponse } from '@/lib/decoders';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { vehicles, servicePackages, addOns } from '@/data/bookingData';

const Payment: React.FC = () => {
  const router = useRouter();
  const { state, dispatch } = useBooking();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });
  const [confirmationCode, setConfirmationCode] = useState('');
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const confettiParticles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53 + 17) % 100}%`,
        animationDelay: `${(i % 7) * 0.25}s`,
        animationDuration: `${1 + (i % 5) * 0.2}s`,
      })),
    []
  );

  const handleInputChange = (field: keyof typeof paymentDetails, value: string) => {
    // Format card number with spaces
    if (field === 'cardNumber') {
      const cleanValue = value.replace(/\s/g, '').replace(/\D/g, '');

      // Detect card type
      if (cleanValue.startsWith('4')) setCardType('visa');
      else if (cleanValue.startsWith('5')) setCardType('mastercard');
      else if (cleanValue.startsWith('3')) setCardType('amex');
      else setCardType(null);

      value = cleanValue
        .replace(/(\d{4})/g, '$1 ')
        .trim()
        .slice(0, 19);
    }
    // Format expiry date
    if (field === 'expiryDate') {
      value = value
        .replace(/\D/g, '')
        .replace(/(\d{2})(\d)/, '$1/$2')
        .slice(0, 5);
    }
    // Limit CVV
    if (field === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4);
    }

    setPaymentDetails(prev => ({ ...prev, [field]: value }));
  };

  const requestConfirmationCode = async () => {
    const response = await fetchWithTimeout('/api/bookings/confirmation', {
      method: 'POST',
      cache: 'no-store',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Unable to create confirmation code');
    }

    const body = await response.json();
    return decodeBookingConfirmationResponse(body).code;
  };

  const handleSubmit = () => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);

    setSubmitError(null);
    setIsProcessing(true);
    // Animate progress
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    // Simulate payment processing
    completionTimeoutRef.current = setTimeout(() => {
      void (async () => {
        let code = '';
        try {
          code = await requestConfirmationCode();
        } catch {
          if (!isMountedRef.current) return;
          setIsProcessing(false);
          setProgress(0);
          setSubmitError('Unable to confirm booking right now. Please try again.');
          return;
        }

        if (!isMountedRef.current) return;

        setIsProcessing(false);
        setShowSuccess(true);
        setSubmitError(null);
        setProgress(0);
        setConfirmationCode(code);
      })();
    }, 2200);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (completionTimeoutRef.current) clearTimeout(completionTimeoutRef.current);
    };
  }, []);

  const canSubmit = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = paymentDetails;
    const cardDigits = cardNumber.replace(/\s/g, '');
    const [monthText, yearText] = expiryDate.split('/');
    const month = Number(monthText);
    const year = Number(yearText);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    const isValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
    const isValidYear = Number.isInteger(year) && yearText?.length === 2 && year >= 0 && year <= 99;
    const isExpired = year < currentYear || (year === currentYear && month < currentMonth);
    return (
      cardDigits.length === 16 &&
      expiryDate.length === 5 &&
      isValidMonth &&
      isValidYear &&
      !isExpired &&
      (cvv.length === 3 || cvv.length === 4) &&
      cardholderName.trim().length > 0
    );
  };

  const inputClasses = (fieldName: string) => `
    bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A] 
    transition-all duration-300 rounded-xl py-5 sm:py-6 px-4 sm:px-5 text-lg
    ${
      focusedField === fieldName
        ? 'border-gold shadow-gold ring-2 ring-gold/20'
        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
    }
  `;

  const subtotalCents = useMemo(() => {
    let totalCents = 0;

    // Vehicle base price
    if (state.selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === state.selectedVehicle);
      if (vehicle) totalCents += Math.round(vehicle.price * 100);
    }

    // Package price
    if (state.selectedPackage) {
      const pkg = servicePackages.find(p => p.id === state.selectedPackage);
      if (pkg) totalCents += Math.round(pkg.price * 100);
    }

    // Add-ons
    state.selectedAddOns.forEach(addOnId => {
      const addOn = addOns.find(a => a.id === addOnId);
      if (addOn) totalCents += Math.round(addOn.price * 100);
    });

    return totalCents;
  }, [state.selectedVehicle, state.selectedPackage, state.selectedAddOns]);

  const getOrderSummary = () => {
    const items = [];

    if (state.selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === state.selectedVehicle);
      if (vehicle) items.push({ label: 'Vehicle', value: vehicle.name, icon: Car });
    }

    if (state.selectedPackage) {
      const pkg = servicePackages.find(p => p.id === state.selectedPackage);
      if (pkg) items.push({ label: 'Package', value: pkg.name, icon: Sparkles });
    }

    if (state.selectedDate) {
      items.push({
        label: 'Date',
        value: state.selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        icon: Calendar,
      });
    }

    if (state.selectedTime) {
      items.push({ label: 'Time', value: state.selectedTime, icon: Clock });
    }

    return items;
  };

  const taxCents = Math.round((subtotalCents * 8) / 100);
  const totalCents = subtotalCents + taxCents;

  const handleBookAnother = () => {
    dispatch({ type: 'RESET_BOOKING' });
    setShowSuccess(false);
    setSubmitError(null);
    setPaymentDetails({ cardNumber: '', expiryDate: '', cvv: '', cardholderName: '' });
    router.push('/booking/vehicle');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center animate-pulse-gold">
            <Lock className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Step 5 of 5
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
          Secure Payment
        </h2>
        <p className="text-[#B0B0B0] text-base sm:text-lg max-w-2xl">
          Complete your booking with our bank-grade encrypted payment system.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
        {/* Payment Form - Takes 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Card Form */}
          <div
            className="bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-gold" />
              </div>
              <h3 className="text-white font-bold text-lg">Card Details</h3>
            </div>

            <form className="space-y-5 sm:space-y-6">
              {/* Card Number */}
              <div className="space-y-2">
                <Label
                  htmlFor="cardNumber"
                  className={`text-sm font-medium flex items-center gap-2 transition-colors ${
                    focusedField === 'cardNumber' ? 'text-gold' : 'text-[#B0B0B0]'
                  }`}
                >
                  Card Number
                  {cardType && <span className="text-gold text-xs uppercase">{cardType}</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="0000 0000 0000 0000"
                    value={paymentDetails.cardNumber}
                    onChange={e => handleInputChange('cardNumber', e.target.value)}
                    onFocus={() => setFocusedField('cardNumber')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('cardNumber')} pl-14 font-mono tracking-wider`}
                    inputMode="numeric"
                    autoComplete="cc-number"
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2">
                    {cardType === 'visa' ? (
                      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                        <rect width="48" height="48" rx="8" fill="#1A1F71" />
                        <path d="M19.5 32L15 16H19L22 28L25 16H29L24.5 32H19.5Z" fill="white" />
                        <path
                          d="M33 16C31.5 16 30 16.5 29 17.5L32.5 28C33.5 27.5 34.5 27 36 27C38 27 39.5 28 40 29L36.5 18C35.5 17 34.5 16 33 16Z"
                          fill="white"
                        />
                      </svg>
                    ) : cardType === 'mastercard' ? (
                      <svg className="w-8 h-8" viewBox="0 0 48 48" fill="none">
                        <rect width="48" height="48" rx="8" fill="#EB001B" />
                        <circle cx="19" cy="24" r="10" fill="#F79E1B" />
                        <circle cx="29" cy="24" r="10" fill="#FF5F00" />
                      </svg>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#2A2A2A] flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-[#6B6B6B]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="expiryDate"
                    className={`text-sm font-medium transition-colors ${
                      focusedField === 'expiryDate' ? 'text-gold' : 'text-[#B0B0B0]'
                    }`}
                  >
                    Expiry Date
                  </Label>
                  <Input
                    id="expiryDate"
                    type="text"
                    placeholder="MM/YY"
                    value={paymentDetails.expiryDate}
                    onChange={e => handleInputChange('expiryDate', e.target.value)}
                    onFocus={() => setFocusedField('expiryDate')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('expiryDate')} font-mono text-center`}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="cvv"
                    className={`text-sm font-medium flex items-center gap-1 transition-colors ${
                      focusedField === 'cvv' ? 'text-gold' : 'text-[#B0B0B0]'
                    }`}
                  >
                    CVV
                    <span className="text-[#6B6B6B] text-xs">(3-4 digits)</span>
                  </Label>
                  <Input
                    id="cvv"
                    type="password"
                    placeholder="•••"
                    value={paymentDetails.cvv}
                    onChange={e => handleInputChange('cvv', e.target.value)}
                    onFocus={() => setFocusedField('cvv')}
                    onBlur={() => setFocusedField(null)}
                    className={`${inputClasses('cvv')} font-mono text-center tracking-[0.3em]`}
                    maxLength={4}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              {/* Cardholder Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="cardholderName"
                  className={`text-sm font-medium transition-colors ${
                    focusedField === 'cardholderName' ? 'text-gold' : 'text-[#B0B0B0]'
                  }`}
                >
                  Cardholder Name
                </Label>
                <Input
                  id="cardholderName"
                  type="text"
                  placeholder="JOHN DOE"
                  value={paymentDetails.cardholderName}
                  onChange={e => handleInputChange('cardholderName', e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('cardholderName')}
                  onBlur={() => setFocusedField(null)}
                  className={inputClasses('cardholderName')}
                  autoComplete="cc-name"
                />
              </div>
            </form>
            {submitError && (
              <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {submitError}
              </p>
            )}

            {/* Security Badges */}
            <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2 text-[#6B6B6B] text-xs">
                  <Lock className="w-4 h-4" />
                  <span>TLS encryption</span>
                </div>
                <div className="flex items-center gap-2 text-[#6B6B6B] text-xs">
                  <Shield className="w-4 h-4" />
                  <span>PCI Compliant</span>
                </div>
                <div className="flex items-center gap-2 text-[#6B6B6B] text-xs">
                  <Check className="w-4 h-4" />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>

          {/* Complete Button - Mobile only */}
          <div className="lg:hidden">
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit() || isProcessing}
              className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isProcessing ? (
                <span className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Complete Booking
                </span>
              )}
            </Button>
            {isProcessing && (
              <div className="mt-3">
                <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-gold text-sm mt-2">{progress}% Complete</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div
            className="bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] p-5 sm:p-6 lg:sticky lg:top-[96px] animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <h3 className="text-white font-bold text-lg mb-5 sm:mb-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                <Check className="w-4 h-4 text-gold" />
              </div>
              Order Summary
            </h3>

            <div className="space-y-4">
              {/* Summary Items */}
              {getOrderSummary().map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-[#2A2A2A] animate-fade-in"
                  style={{ animationDelay: `${(index + 3) * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-gold" />
                    <span className="text-[#6B6B6B] text-sm">{item.label}</span>
                  </div>
                  <span className="text-white font-medium text-sm">{item.value}</span>
                </div>
              ))}

              {/* Add-ons */}
              {state.selectedAddOns.length > 0 && (
                <div className="py-3 border-b border-[#2A2A2A]">
                  <p className="text-[#6B6B6B] text-sm mb-2">Add-ons:</p>
                  <div className="space-y-1">
                    {state.selectedAddOns.map(addonId => {
                      const addOn = addOns.find(a => a.id === addonId);
                      return addOn ? (
                        <div key={addonId} className="flex justify-between text-sm">
                          <span className="text-[#B0B0B0]">{addOn.name}</span>
                          <span className="text-gold">+${addOn.price}</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[#B0B0B0]">Subtotal</span>
                  <span className="text-white">${(subtotalCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#B0B0B0]">Tax (8%)</span>
                  <span className="text-white">${(taxCents / 100).toFixed(2)}</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-4" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-3xl font-bold text-gold">
                    ${(totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Button - Desktop */}
            <div className="hidden lg:block mt-6">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit() || isProcessing}
                className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-5 h-5" />
                    Complete Booking
                  </span>
                )}
              </Button>
              {isProcessing && (
                <div className="mt-3">
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-100 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-gold text-sm mt-2 font-medium">
                    {progress}% Complete
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog - Enhanced */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="bg-gradient-to-br from-[#141414] to-[#0A0A0A] border-gold/30 max-w-md sm:max-w-lg p-0 overflow-hidden">
          {/* Confetti effect background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {confettiParticles.map((particle, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-gold rounded-full animate-ping"
                style={particle}
              />
            ))}
          </div>

          <div className="relative p-6 sm:p-10 text-center">
            <DialogHeader>
              <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mb-6 animate-scale-in shadow-gold-lg">
                <Check className="w-10 h-10 text-[#0A0A0A]" />
              </div>
              <DialogTitle className="text-white text-2xl sm:text-3xl font-bold mb-3">
                Booking Confirmed!
              </DialogTitle>
              <DialogDescription className="text-[#B0B0B0] text-base sm:text-lg">
                Your vehicle detailing appointment has been scheduled successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-8 space-y-4">
              <div className="bg-[#1E1E1E] rounded-xl p-5 border border-gold/20">
                <p className="text-[#6B6B6B] text-xs uppercase tracking-wider mb-2">
                  Confirmation Number
                </p>
                <p className="text-gold font-mono text-xl sm:text-2xl font-bold tracking-wider">
                  {confirmationCode || 'GC-PENDING'}
                </p>
              </div>

              <div className="bg-[#1E1E1E] rounded-xl p-4 text-left space-y-2">
                {getOrderSummary().map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <item.icon className="w-4 h-4 text-gold" />
                    <span className="text-[#6B6B6B]">{item.label}:</span>
                    <span className="text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleBookAnother}
                className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-5 rounded-xl text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-gold"
              >
                Book Another Vehicle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payment;
