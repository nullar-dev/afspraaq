'use client';

import React, { useRef, useEffect } from 'react';
import { Car, Sparkles, Calendar, User, CreditCard, Check } from 'lucide-react';
import type { BookingStep } from '@/types/booking';
import { useBooking } from '@/context/BookingContext';

interface Step {
  id: BookingStep;
  label: string;
  description: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  { id: 'vehicle', label: 'Vehicle', description: 'Select size & model', icon: Car },
  { id: 'services', label: 'Services', description: 'Choose detailing level', icon: Sparkles },
  { id: 'schedule', label: 'Schedule', description: 'Pick date & time', icon: Calendar },
  { id: 'customer', label: 'Details', description: 'Enter contact info', icon: User },
  { id: 'payment', label: 'Payment', description: 'Secure checkout', icon: CreditCard },
];

const BookingStepper: React.FC = () => {
  const { state, goToStep } = useBooking();
  const currentStepIndex = steps.findIndex(s => s.id === state.currentStep);
  const boundedProgressRatio = Math.max(0, Math.min(1, currentStepIndex / (steps.length - 1)));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step on mobile
  useEffect(() => {
    if (scrollRef.current) {
      const currentElement = scrollRef.current.children[currentStepIndex] as HTMLElement;
      if (currentElement) {
        currentElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentStepIndex]);

  const getStepStatus = (index: number): 'completed' | 'current' | 'upcoming' => {
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (stepId: BookingStep, index: number) => {
    if (index <= currentStepIndex) {
      goToStep(stepId);
    }
  };

  return (
    <div className="w-full lg:w-[280px]">
      {/* Mobile Horizontal Scroll */}
      <div
        ref={scrollRef}
        className="lg:hidden overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-3 min-w-max">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const Icon = step.icon;

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id, index)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-300 ${
                  status === 'current'
                    ? 'border-gold bg-gold/10 shadow-gold'
                    : status === 'completed'
                      ? 'border-gold/50 bg-gold/5'
                      : 'border-[#2A2A2A] bg-[#141414]/50'
                } ${index <= currentStepIndex ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    status === 'current'
                      ? 'bg-gold text-[#0A0A0A] shadow-gold scale-110'
                      : status === 'completed'
                        ? 'bg-gold/20 text-gold'
                        : 'bg-[#1E1E1E] text-[#6B6B6B]'
                  }`}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left">
                  <p
                    className={`text-sm font-semibold ${
                      status === 'current'
                        ? 'text-white'
                        : status === 'completed'
                          ? 'text-gold'
                          : 'text-[#6B6B6B]'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-[#6B6B6B] truncate max-w-[100px]">
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Vertical */}
      <div className="hidden lg:block sticky top-[96px]">
        <div className="mb-6">
          <p className="text-xs font-semibold text-gold uppercase tracking-wider mb-1">
            Booking Process
          </p>
          <p className="text-[#6B6B6B] text-sm">Complete all 5 steps</p>
        </div>

        <div className="relative">
          {/* Progress Line - Only show when progress > 0 */}
          {currentStepIndex > 0 && (
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#2A2A2A]">
              <div
                className="absolute top-0 left-0 w-full bg-gold transition-all duration-500"
                style={{ height: `${boundedProgressRatio * 100}%` }}
              />
            </div>
          )}

          <div className="space-y-2 relative">
            {steps.map((step, index) => {
              const status = getStepStatus(index);
              const Icon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id, index)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-300 group ${
                    status === 'current'
                      ? 'bg-gold/10'
                      : status === 'completed'
                        ? 'hover:bg-[#1E1E1E]'
                        : 'hover:bg-[#1E1E1E]/50'
                  } ${index <= currentStepIndex ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 z-10 ${
                      status === 'current'
                        ? 'bg-gold text-[#0A0A0A] shadow-gold scale-110'
                        : status === 'completed'
                          ? 'bg-gold text-[#0A0A0A]'
                          : 'bg-[#1E1E1E] text-[#6B6B6B] border border-[#2A2A2A]'
                    }`}
                  >
                    {status === 'completed' && index < currentStepIndex ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>

                  <div className="text-left pt-1">
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        status === 'current'
                          ? 'text-white'
                          : status === 'completed'
                            ? 'text-gold'
                            : 'text-[#B0B0B0]'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p
                      className={`text-xs mt-0.5 transition-colors ${
                        status === 'current' ? 'text-[#B0B0B0]' : 'text-[#6B6B6B]'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#6B6B6B]">Progress</span>
            <span className="text-gold font-semibold">
              {Math.round(boundedProgressRatio * 100)}%
            </span>
          </div>
          <div className="h-2 bg-[#1E1E1E] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-500 ease-out"
              style={{ width: `${boundedProgressRatio * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingStepper;
