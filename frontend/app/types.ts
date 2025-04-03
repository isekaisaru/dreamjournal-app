export interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface Dream {
  id: string;
  title: string;
  description: string;
  date: string;
  userId: number;
  created_at: Date;
  updated_at: Date;
}
