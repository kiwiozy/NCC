'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function XeroPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to settings page with Xero tab
    router.replace('/settings');
  }, [router]);
  
  return null;
}
