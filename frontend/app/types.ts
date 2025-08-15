export interface User {
  id: string; // FrontendではIDを文字列として扱う
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

// Backendから直接受け取るユーザー情報の型。IDは数値。
export interface BackendUser {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Emotion {
  id: number;
  name: string;
}

export interface Dream {
  id: number;
  title: string;
  content?: string;
  userId: number;
  created_at: string;
  updated_at: string;
  emotions?: Emotion[];
}
export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterCredentials = {
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
};
