'use client';

import React, { useMemo, useState } from 'react';
import { Check, Info, ChevronRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useBooking } from '@/context/BookingContext';
import { vehicles } from '@/data/bookingData';

const VehicleSelection: React.FC = () => {
  const { state, dispatch } = useBooking();
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);
  const validVehicleIds = useMemo(() => new Set(vehicles.map(vehicle => vehicle.id)), []);

  const handleSelectVehicle = (vehicleId: string) => {
    if (!validVehicleIds.has(vehicleId)) return;
    dispatch({ type: 'SET_VEHICLE', payload: vehicleId });
  };

  return (
    <div className="animate-fade-in">
      {/* Header with animated gradient */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center animate-pulse-gold">
            <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <span className="text-gold text-sm font-semibold uppercase tracking-wider">
            Step 1 of 5
          </span>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3">
          Select Your Vehicle
        </h2>
        <p className="text-[#B0B0B0] text-base sm:text-lg max-w-2xl">
          Choose your vehicle category to customize the detailing package. Prices reflect base labor
          for surface area.
        </p>
      </div>

      {/* Vehicle Grid - Enhanced cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {vehicles.map((vehicle, index) => {
          const isSelected = state.selectedVehicle === vehicle.id;
          const isHovered = hoveredVehicle === vehicle.id;

          return (
            <div
              key={vehicle.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectVehicle(vehicle.id)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectVehicle(vehicle.id);
                }
              }}
              onMouseEnter={() => setHoveredVehicle(vehicle.id)}
              onMouseLeave={() => setHoveredVehicle(null)}
              className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ${
                isSelected
                  ? 'ring-2 ring-gold shadow-gold-lg scale-[1.02]'
                  : 'ring-1 ring-[#2A2A2A] hover:ring-gold/50 hover:shadow-xl'
              }`}
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards',
                opacity: 0,
                transform: 'translateY(20px)',
              }}
            >
              {/* Image Container with zoom effect */}
              <div className="relative aspect-[16/10] sm:aspect-[4/3] overflow-hidden">
                <Image
                  src={vehicle.image}
                  alt={vehicle.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className={`w-full h-full object-cover transition-all duration-700 ease-out-expo ${
                    isSelected ? 'scale-110' : isHovered ? 'scale-105' : 'scale-100'
                  }`}
                />

                {/* Animated Gradient Overlay */}
                <div
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    isHovered || isSelected ? 'opacity-90' : 'opacity-100'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
                </div>

                {/* Selected Checkmark with bounce animation */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gold flex items-center justify-center animate-scale-in shadow-gold">
                    <Check className="w-6 h-6 text-[#0A0A0A]" />
                  </div>
                )}

                {/* Hover indicator */}
                {!isSelected && isHovered && (
                  <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                    <ChevronRight className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Content with slide-up animation */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <div
                    className={`transform transition-all duration-500 ${
                      isHovered || isSelected ? 'translate-y-0' : 'translate-y-1'
                    }`}
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg sm:text-xl mb-1">
                          {vehicle.name}
                        </h3>
                        <p
                          className={`text-[#B0B0B0] text-sm line-clamp-2 transition-all duration-300 ${
                            isHovered || isSelected ? 'opacity-100 max-h-20' : 'opacity-70 max-h-10'
                          }`}
                        >
                          {vehicle.description}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`font-bold text-xl sm:text-2xl ${vehicle.price > 0 ? 'text-gold' : 'text-gold-light'}`}
                        >
                          {vehicle.subtitle}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom accent bar */}
              <div
                className={`h-1 transition-all duration-500 ${
                  isSelected ? 'bg-gold' : 'bg-transparent group-hover:bg-gold/30'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Gold Standard Guarantee - Enhanced */}
      <div
        className="mt-8 sm:mt-10 bg-gradient-to-r from-[#141414] to-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center flex-shrink-0 animate-pulse-gold">
            <svg
              className="w-7 h-7 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-bold text-lg">Gold Standard Guarantee</h4>
            <p className="text-[#B0B0B0] text-sm">
              Every session includes a 21-point premium inspection.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="More details coming soon"
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#2A2A2A] text-[#B0B0B0] text-sm font-medium opacity-70 cursor-not-allowed flex items-center justify-center gap-2 group"
        >
          <Info className="w-4 h-4" />
          Learn More
          <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default VehicleSelection;
