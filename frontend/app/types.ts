export interface User {
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
  username: string;
  password: string;
};

export type RegisterCredentials = {
  username: string;
  password: string;
  password_confirmation: string;
};
