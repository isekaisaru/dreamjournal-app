import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function useAuth() {
  console.log("useAuth hook initialized");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    console.log("useAuth hook called");
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.post('http://localhost:3001/auth/verify', {}, {
            headers: {
              Authorization: `Bearer ${token}`
            },
          });
          if (response.status === 200) {
            setIsAuthenticated(true);
            router.push('/home');
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [router]);

  return isAuthenticated;
}