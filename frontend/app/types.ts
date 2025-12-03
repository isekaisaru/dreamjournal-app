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
  analysis_json?: {
    analysis: string;
    text?: string;
    emotion_tags: string[];
  };
  analysis_status?: string;
  analyzed_at?: string;
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

// 音声解析結果（Whisper → Rails → Next API のレスポンス）
export type AnalysisResult = {
  transcript: string;
  analysis: string;
  emotion_tags: string[];
};

// sessionStorage に一時保存するドラフトデータの型
export interface DreamDraftData {
  transcript: string;
  analysis: string | null;
  emotion_tags: string[] | null;
  timestamp?: number;
}
