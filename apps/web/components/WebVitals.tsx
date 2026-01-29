'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/web-vitals';

export function WebVitals() {
  useEffect(() => {
    initWebVitals();
  }, []);

  return null;
}
