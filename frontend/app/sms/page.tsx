'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SMSPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to settings page with SMS tab
    router.replace('/settings');
  }, [router]);
  
  return null;
}
