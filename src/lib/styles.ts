/**
 * Generates Tailwind classes for styled input fields with focus states
 */
export function inputClasses(focusedField: string | null, fieldName: string): string {
  const baseClasses = `bg-[#1E1E1E] border-2 text-white placeholder:text-[#4A4A4A]
    transition-all duration-300 rounded-xl py-5 sm:py-6 px-4 sm:px-5`;

  const focusedClasses =
    focusedField === fieldName
      ? 'border-gold shadow-gold ring-2 ring-gold/20'
      : 'border-[#2A2A2A] hover:border-[#3A3A3A]';

  return `${baseClasses} ${focusedClasses}`;
}
