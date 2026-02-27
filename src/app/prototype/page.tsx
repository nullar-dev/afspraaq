'use client';

import { useState } from 'react';

export default function TestPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-gold">Tailwind v4 Test</h1>

      <button
        onClick={() => setCount(c => c + 1)}
        className="px-8 py-4 bg-gold hover:bg-gold-light text-[#0A0A0A] font-bold rounded-xl transition-colors"
      >
        Gold Button - Clicked {count} times
      </button>

      <div className="flex gap-4">
        <div className="w-24 h-24 bg-[#141414] border border-[#2A2A2A] rounded-xl flex items-center justify-center">
          Card
        </div>
        <div className="w-24 h-24 bg-[#1E1E1E] hover:bg-[#252525] rounded-xl flex items-center justify-center transition-colors">
          Hover me
        </div>
      </div>
    </div>
  );
}
