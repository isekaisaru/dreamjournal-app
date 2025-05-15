export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Dream {
  id: number;
  title: string;
  content?: string;
  userId: number;
  created_at: string;
  updated_at: string;
}
