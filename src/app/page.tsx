'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FCF9EA]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFA4A4]"></div>
    </div>
  );
}
