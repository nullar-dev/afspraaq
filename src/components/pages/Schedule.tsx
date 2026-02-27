'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Check } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { timeSlots } from '@/data/bookingData';

const Schedule: React.FC = () => {
  const { state, dispatch } = useBooking();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredTime, setHoveredTime] = useState<string | null>(null);

  // Generate calendar days
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    dispatch({ type: 'SET_DATE', payload: selectedDate });
  };

  const handleTimeSelect = (time: string) => {
    dispatch({ type: 'SET_TIME', payload: time });
  };

  const isDateSelected = (day: number) => {
    if (!state.selectedDate) return false;
    return (
      state.selectedDate.getDate() === day &&
      state.selectedDate.getMonth() === currentMonth.getMonth() &&
      state.selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const calendarDays = getDaysInMonth(currentMonth);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Schedule Your Detail</h2>
        <p className="text-[#B0B0B0]">
          Choose a convenient date and time for your vehicle detailing appointment.
        </p>
      </div>

      {/* Calendar - Full Width */}
      <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-gold" />
            </div>
            <h3 className="text-white font-semibold text-lg">Select Date</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={prevMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-[#1E1E1E] text-[#B0B0B0] hover:text-white transition-all duration-200 hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-semibold min-w-[140px] text-center text-sm sm:text-base">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 sm:p-3 rounded-xl hover:bg-[#1E1E1E] text-[#B0B0B0] hover:text-white transition-all duration-200 hover:scale-110"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid - Larger touch targets */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-medium text-[#6B6B6B] py-2 sm:py-3"
            >
              {day}
            </div>
          ))}
          {calendarDays.map((day, index) => (
            <div key={index} className="aspect-square p-0.5">
              {day !== null && (
                <button
                  onClick={() => !isDateDisabled(day) && handleDateSelect(day)}
                  disabled={isDateDisabled(day)}
                  className={`w-full h-full rounded-xl text-sm sm:text-base font-medium transition-all duration-300 ${
                    isDateSelected(day)
                      ? 'bg-gold text-[#0A0A0A] shadow-gold scale-105'
                      : isDateDisabled(day)
                        ? 'text-[#3A3A3A] cursor-not-allowed'
                        : 'text-white hover:bg-[#1E1E1E] hover:text-gold hover:scale-105'
                  }`}
                >
                  {day}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Slots - Full Width Below */}
      <div className="bg-[#141414] rounded-2xl border border-[#2A2A2A] p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-gold" />
          </div>
          <h3 className="text-white font-semibold text-lg">Select Time</h3>
        </div>

        {state.selectedDate ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
            {timeSlots.map((time, index) => {
              const isSelected = state.selectedTime === time;
              const isHovered = hoveredTime === time;

              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  onMouseEnter={() => setHoveredTime(time)}
                  onMouseLeave={() => setHoveredTime(null)}
                  className={`relative py-3 sm:py-4 px-2 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden ${
                    isSelected
                      ? 'bg-gold text-[#0A0A0A] shadow-gold'
                      : 'bg-[#1E1E1E] text-[#B0B0B0] hover:bg-[#252525] hover:text-white border border-[#2A2A2A] hover:border-gold/50'
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Ripple effect on hover */}
                  {isHovered && !isSelected && (
                    <span className="absolute inset-0 bg-gold/10 animate-pulse rounded-xl" />
                  )}
                  <span className="relative z-10">{time}</span>
                  {isSelected && (
                    <Check className="absolute top-1 right-1 w-3 h-3 text-[#0A0A0A]" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#1E1E1E] flex items-center justify-center mb-4 animate-pulse">
              <CalendarIcon className="w-10 h-10 text-[#6B6B6B]" />
            </div>
            <p className="text-[#6B6B6B] text-lg">Please select a date first</p>
            <p className="text-[#4A4A4A] text-sm mt-1">Choose from the calendar above</p>
          </div>
        )}
      </div>

      {/* Selected Summary */}
      {(state.selectedDate || state.selectedTime) && (
        <div className="mt-6 bg-gradient-to-r from-gold/10 to-transparent rounded-2xl border border-gold/30 p-5 sm:p-6 animate-fade-in-up">
          <h4 className="text-gold font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Your Selection
          </h4>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            {state.selectedDate && (
              <div className="flex items-center gap-3 bg-[#0A0A0A]/50 rounded-xl px-4 py-3">
                <CalendarIcon className="w-5 h-5 text-gold" />
                <span className="text-white font-medium">
                  {state.selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            )}
            {state.selectedTime && (
              <div className="flex items-center gap-3 bg-[#0A0A0A]/50 rounded-xl px-4 py-3">
                <Clock className="w-5 h-5 text-gold" />
                <span className="text-white font-medium">{state.selectedTime}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
