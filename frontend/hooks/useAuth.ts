import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { set } from 'date-fns';

export default function useAuth() {
  console.log("useAuth hook initialized");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [message, setMessage] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    console.log("useAuth hook called");
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.log("Token beging sent for verification:", token);
      if (token) {
        try {
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, {}, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.status === 200) {
            setIsAuthenticated(true);
            setMessage("ログインに成功しました");
            router.push('/home');
          } else {
            setIsAuthenticated(false);
            setMessage("ログインに失敗しました。もう一度お試しください。");
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          setIsAuthenticated(false);
          setMessage("サーバーに接続できません。もう一度お試しください。");
        }
      } else {
        setIsAuthenticated(false);
        setMessage("認証トークンが見つかりません。");
      }
    };
    checkAuth();
  }, [router]);

  return {isAuthenticated, message };
}