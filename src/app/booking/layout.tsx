'use client';

import Header from '@/components/Header';
import BookingStepper from '@/components/BookingStepper';
import InvestmentSummary from '@/components/InvestmentSummary';
import { BookingProvider } from '@/context/BookingContext';

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <div className="min-h-screen bg-[#0A0A0A]">
        <Header />

        <main className="pt-[112px] min-h-screen">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-10">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              <div className="flex-shrink-0">
                <BookingStepper />
              </div>

              <div className="flex-1 min-w-0">
                <div className="animate-fade-in">{children}</div>
              </div>

              <div className="flex-shrink-0 order-first lg:order-last">
                <InvestmentSummary />
              </div>
            </div>
          </div>
        </main>
      </div>
    </BookingProvider>
  );
}
