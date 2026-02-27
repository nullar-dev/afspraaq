import { z } from 'zod';
import type { BookingConfirmationResponse } from '@/types/api';

const bookingConfirmationSchema = z.object({
  code: z.string().regex(/^GC-[A-F0-9]{32}$/),
});

export function decodeBookingConfirmationResponse(data: unknown): BookingConfirmationResponse {
  return bookingConfirmationSchema.parse(data);
}
