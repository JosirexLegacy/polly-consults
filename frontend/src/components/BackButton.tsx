'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
}

export default function BackButton({ label, fallbackHref }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  };

  return (
    <button
      onClick={handleBack}
      className="
        group inline-flex items-center gap-1.5
        text-[15px] font-medium
        text-gray-400 dark:text-gray-500
        hover:text-black dark:hover:text-white
        transition-colors duration-200
        -ml-2 px-1 py-1
      "
    >
      <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" strokeWidth={1.75} />
      {label && <span>{label}</span>}
    </button>
  );
}