export type UUID = string;

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface Member {
  service_name: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
}

export interface PortalInfo {
  userId: string;
  serviceName: string;
  role: string;
  message: string;
}

export interface SettingData {
  theme: string;
  notifications_enabled: boolean;
  language_code: string;
}
