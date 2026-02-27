'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ArrowRight, ChevronUp, ChevronDown, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/context/BookingContext';
import { vehicles, servicePackages, addOns } from '@/data/bookingData';

const isValidCustomerEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const isValidCustomerPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
};

const InvestmentSummary: React.FC = () => {
  const { state, nextStep } = useBooking();
  const [isExpanded, setIsExpanded] = useState(false);
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const animatedTotalRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const summary = useMemo(() => {
    const items: {
      id: string;
      name: string;
      priceCents: number;
      description?: string;
      type: string;
    }[] = [];
    let subtotalCents = 0;

    // Vehicle
    if (state.selectedVehicle) {
      const vehicle = vehicles.find(v => v.id === state.selectedVehicle);
      if (vehicle && Number.isFinite(vehicle.price) && vehicle.price >= 0) {
        items.push({
          id: `vehicle-${vehicle.id}`,
          name: vehicle.name,
          priceCents: Math.round(vehicle.price * 100),
          description: 'Base vehicle',
          type: 'vehicle',
        });
        subtotalCents += Math.round(vehicle.price * 100);
      }
    }

    // Service Package
    if (state.selectedPackage) {
      const pkg = servicePackages.find(p => p.id === state.selectedPackage);
      if (pkg) {
        items.push({
          id: `package-${pkg.id}`,
          name: pkg.name,
          priceCents: Math.round(pkg.price * 100),
          type: 'package',
        });
        subtotalCents += Math.round(pkg.price * 100);
      }
    }

    // Add-ons
    state.selectedAddOns.forEach(addOnId => {
      const addOn = addOns.find(a => a.id === addOnId);
      if (addOn) {
        items.push({
          id: `addon-${addOn.id}`,
          name: addOn.name,
          priceCents: Math.round(addOn.price * 100),
          type: 'addon',
        });
        subtotalCents += Math.round(addOn.price * 100);
      }
    });

    const taxCents = Math.round((subtotalCents * 8) / 100);
    const totalCents = subtotalCents + taxCents;

    return { items, subtotalCents, taxCents, totalCents };
  }, [state.selectedVehicle, state.selectedPackage, state.selectedAddOns]);

  // Animate total changes
  useEffect(() => {
    const start = animatedTotalRef.current;
    const end = summary.totalCents / 100;
    const duration = 500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * easeOut;

      setAnimatedTotal(current);
      animatedTotalRef.current = current;

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [summary.totalCents]);

  const canProceed = () => {
    switch (state.currentStep) {
      case 'vehicle':
        return !!state.selectedVehicle;
      case 'services':
        return !!state.selectedPackage;
      case 'schedule':
        return !!state.selectedDate && !!state.selectedTime;
      case 'customer':
        return (
          state.customerDetails.firstName.trim().length > 0 &&
          state.customerDetails.lastName.trim().length > 0 &&
          isValidCustomerEmail(state.customerDetails.email) &&
          isValidCustomerPhone(state.customerDetails.phone)
        );
      default:
        return true;
    }
  };

  const getButtonText = () => {
    switch (state.currentStep) {
      case 'vehicle':
        return 'Proceed to Services';
      case 'services':
        return 'Proceed to Schedule';
      case 'schedule':
        return 'Proceed to Details';
      case 'customer':
        return 'Proceed to Payment';
      case 'payment':
        return 'Complete Booking';
      default:
        return 'Continue';
    }
  };

  return (
    <div className="w-full lg:w-[360px]">
      {/* Mobile Collapsible Header */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full bg-[#141414] rounded-xl border border-[#2A2A2A] p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-gold" />
            </div>
            <div className="text-left">
              <p className="text-xs text-[#6B6B6B] uppercase tracking-wider">Total Investment</p>
              <p className="text-2xl font-bold text-gold">${animatedTotal.toFixed(2)}</p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#6B6B6B]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#6B6B6B]" />
          )}
        </button>
      </div>

      {/* Summary Content */}
      <div
        className={`bg-gradient-to-br from-[#141414] to-[#0F0F0F] rounded-2xl border border-[#2A2A2A] overflow-hidden transition-all duration-500 lg:sticky lg:top-[96px] ${
          isExpanded ? 'max-h-[800px] mt-4' : 'max-h-0 lg:max-h-none mt-0 lg:mt-0'
        }`}
      >
        <div className="p-5 sm:p-6">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-white font-bold text-lg">Investment Summary</h3>
          </div>

          {/* Service Details */}
          <div className="space-y-3 mb-6">
            <p className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Service Details
            </p>

            {summary.items.length === 0 ? (
              <div className="space-y-3 py-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#6B6B6B]">No items selected</span>
                </div>
                <p className="text-[#4A4A4A] text-xs">Select a vehicle to see pricing</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fade-in">
                {summary.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start py-2 border-b border-[#2A2A2A]/50 animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 pr-4">
                      <span
                        className={`text-sm font-medium ${
                          item.type === 'addon' ? 'text-[#B0B0B0]' : 'text-white'
                        }`}
                      >
                        {item.name}
                      </span>
                      {item.description && (
                        <p className="text-xs text-[#6B6B6B]">{item.description}</p>
                      )}
                    </div>
                    <span className="text-gold font-semibold text-sm">
                      ${(item.priceCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent my-4" />

          {/* Subtotal */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#B0B0B0]">Subtotal</span>
              <span className="text-white font-medium">
                ${(summary.subtotalCents / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#B0B0B0]">Tax (8%)</span>
              <span className="text-white font-medium">${(summary.taxCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent my-4" />

          {/* Total */}
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs font-semibold text-[#6B6B6B] uppercase tracking-wider">
              Total
            </span>
            <span className="text-3xl font-bold text-gold transition-all duration-300">
              ${animatedTotal.toFixed(2)}
            </span>
          </div>

          {/* CTA Button - Hidden on Payment step (Payment page has its own) */}
          {state.currentStep !== 'payment' && (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="w-full bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold py-5 sm:py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-gold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-base sm:text-lg"
            >
              {getButtonText()}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}

          {/* Security Badge */}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-[#4A4A4A] uppercase tracking-wider">
              Secured by GoldVault PayTech
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentSummary;
