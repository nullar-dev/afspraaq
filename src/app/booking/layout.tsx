'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import BookingStepper from '@/components/BookingStepper';
import InvestmentSummary from '@/components/InvestmentSummary';
import { BookingProvider, useBooking } from '@/context/BookingContext';
import type { BookingStep } from '@/types/booking';

const STEP_TO_PATH: Record<BookingStep, string> = {
  vehicle: '/booking/vehicle',
  services: '/booking/services',
  schedule: '/booking/schedule',
  customer: '/booking/customer',
  payment: '/booking/payment',
};

const PATH_TO_STEP: Record<string, BookingStep> = {
  '/booking/vehicle': 'vehicle',
  '/booking/services': 'services',
  '/booking/schedule': 'schedule',
  '/booking/customer': 'customer',
  '/booking/payment': 'payment',
};

function BookingRouteSync() {
  const { state, dispatch } = useBooking();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const stepForPath = PATH_TO_STEP[pathname];
    if (stepForPath && stepForPath !== state.currentStep) {
      dispatch({ type: 'SET_STEP', payload: stepForPath });
    }
  }, [dispatch, pathname, state.currentStep]);

  useEffect(() => {
    const expectedPath = STEP_TO_PATH[state.currentStep];
    if (pathname !== expectedPath) {
      router.push(expectedPath);
    }
  }, [pathname, router, state.currentStep]);

  return null;
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <BookingRouteSync />
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
