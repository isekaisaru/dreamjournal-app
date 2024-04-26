export interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Dream {
  id: number;
  title: string;
  description: string;
  userId: number;
  created_at: Date;
  updated_at: Date;
}