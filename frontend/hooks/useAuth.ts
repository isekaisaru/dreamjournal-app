import { useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { set } from 'date-fns';

interface DecodedToken {
  user_id: string;
  exp: number;
}

// useAuht関数の定義
export default function useAuth(redirectAfterLogin: boolean = false) {
  console.log("useAuth hook initialized");

  //  認証状態やユーザー情報を保持するためのstateを定義
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const router = useRouter();
  const logout = () => {
    // ログアウト処理: トークンを削除し、認証情報をリセット
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserId(null);
  };


  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
    // トークンが存在しない場合の処理
      if (!token) {
        setIsAuthenticated(false);
        setUserId(null);
        setMessage("ログインが必要です。");
        router.push('/login'); //トークンがない場合はログインページにリダイレクト
        return; // 早期リターンでAPIリクエストをスキップ
      }
        
        try {
          // トークンが存在する場合のみデコードと検証を実行
          const decoded: DecodedToken = jwtDecode<DecodedToken>(token);
          setUserId(decoded.user_id);

          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`, 
            {}, 
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.status === 200) {
            setIsAuthenticated(true);
            setMessage("ログインに成功しました");

            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            if (redirectAfterLogin) {
              router.push('/home');
            }
          } else {
            setIsAuthenticated(false);
            setMessage("ログインに失敗しました。もう一度お試しください。");
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          setIsAuthenticated(false);
          setMessage("サーバーに接続できません。もう一度お試しください。");
        }
    };

    checkAuth();
  }, [redirectAfterLogin, router]);

  return { isAuthenticated, message, userId, logout };
}