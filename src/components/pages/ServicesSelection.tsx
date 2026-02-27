'use client';

import React, { useState } from 'react';
import { Check, Sparkles, Star, ChevronRight, Zap } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { servicePackages, addOns } from '@/data/bookingData';

const ServicesSelection: React.FC = () => {
  const { state, dispatch } = useBooking();
  const [expandedFeatures, setExpandedFeatures] = useState<string | null>(null);

  const handleSelectPackage = (packageId: string) => {
    dispatch({ type: 'SET_PACKAGE', payload: packageId });
  };

  const handleToggleAddOn = (addOnId: string) => {
    dispatch({ type: 'TOGGLE_ADDON', payload: addOnId });
  };

  const toggleFeatures = (packageId: string) => {
    setExpandedFeatures(expandedFeatures === packageId ? null : packageId);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center animate-pulse-gold">
            <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Step 2 of 5
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
          Choose Your Package
        </h2>
        <p className="text-[#B0B0B0] text-base sm:text-lg max-w-2xl">
          Select the detailing package that best fits your vehicle&apos;s needs. All packages
          include our Gold Standard Guarantee.
        </p>
      </div>

      {/* Service Packages - Enhanced cards */}
      <div className="space-y-4 sm:space-y-5 mb-10 sm:mb-12">
        {servicePackages.map((pkg, index) => {
          const isSelected = state.selectedPackage === pkg.id;
          const isExpanded = expandedFeatures === pkg.id;

          return (
            <div
              key={pkg.id}
              onClick={() => handleSelectPackage(pkg.id)}
              className={`relative rounded-2xl border-2 cursor-pointer transition-all duration-500 overflow-hidden ${
                isSelected
                  ? 'border-gold bg-gradient-to-r from-gold/10 to-transparent shadow-gold'
                  : 'border-[#2A2A2A] bg-[#141414] hover:border-gold/40 hover:bg-[#1A1A1A]'
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
                opacity: 0,
                transform: 'translateY(20px)',
              }}
            >
              {/* Recommended Badge */}
              {pkg.recommended && (
                <div className="absolute -top-0 left-6 sm:left-8 px-4 py-1.5 bg-gradient-to-r from-gold to-gold-light text-[#0A0A0A] text-xs font-bold rounded-b-xl flex items-center gap-1.5 shadow-gold">
                  <Star className="w-3 h-3 fill-current" />
                  RECOMMENDED
                </div>
              )}

              <div className="p-5 sm:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-white font-bold text-xl sm:text-2xl">{pkg.name}</h3>
                      {isSelected && (
                        <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center animate-scale-in shadow-gold">
                          <Check className="w-5 h-5 text-[#0A0A0A]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[#B0B0B0] text-sm sm:text-base mb-4 sm:mb-5">
                      {pkg.description}
                    </p>

                    {/* Features - Expandable on mobile */}
                    <div
                      className={`grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 transition-all duration-500 overflow-hidden ${
                        isExpanded ? 'max-h-[500px]' : 'max-h-[80px] sm:max-h-none'
                      }`}
                    >
                      {pkg.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 text-sm text-[#B0B0B0] group/item"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <div className="w-5 h-5 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-gold/20 transition-colors">
                            <Check className="w-3 h-3 text-gold" />
                          </div>
                          <span className="group-hover/item:text-white transition-colors">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mobile expand button */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleFeatures(pkg.id);
                      }}
                      className="sm:hidden mt-3 text-gold text-sm font-medium flex items-center gap-1"
                    >
                      {isExpanded ? 'Show less' : 'Show all features'}
                      <ChevronRight
                        className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-2">
                    <span className="text-3xl sm:text-4xl font-bold text-gold">${pkg.price}</span>
                    <span className="text-[#6B6B6B] text-sm">one-time</span>
                  </div>
                </div>
              </div>

              {/* Selection indicator bar */}
              <div
                className={`h-1 transition-all duration-500 ${
                  isSelected ? 'bg-gold' : 'bg-transparent'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Add-ons Section - Enhanced */}
      <div>
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#1E1E1E] flex items-center justify-center">
            <Zap className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl">Enhance Your Detail</h3>
            <p className="text-[#6B6B6B] text-sm">Add extra protection and services</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {addOns.map((addOn, index) => {
            const isSelected = state.selectedAddOns.includes(addOn.id);

            return (
              <div
                key={addOn.id}
                onClick={() => handleToggleAddOn(addOn.id)}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-xl border cursor-pointer transition-all duration-300 group ${
                  isSelected
                    ? 'border-gold bg-gold/5 shadow-gold'
                    : 'border-[#2A2A2A] bg-[#141414] hover:border-gold/30 hover:bg-[#1A1A1A]'
                }`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                  opacity: 0,
                  transform: 'translateY(15px)',
                }}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? 'bg-gold border-gold scale-110'
                        : 'border-[#4A4A4A] group-hover:border-gold/50'
                    }`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-[#0A0A0A]" />}
                  </div>
                  <span
                    className={`text-sm sm:text-base font-medium transition-colors ${isSelected ? 'text-white' : 'text-[#B0B0B0] group-hover:text-white'}`}
                  >
                    {addOn.name}
                  </span>
                </div>
                <span className="text-gold font-bold text-sm sm:text-base">+${addOn.price}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServicesSelection;
