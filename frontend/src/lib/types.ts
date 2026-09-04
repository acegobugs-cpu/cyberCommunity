export type UUID = string;

export interface User {
  id: UUID;
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
  id: UUID;
  username: string;
  email: string;
  rank: number;
  points: number;
}

export interface PortalInfo {
  [key: string]: string;
}

export interface Tenant {
  id: string;
  name: string;
  university: string;
  description: string;
  ownerId: UUID;
  memberCount: number;
  createdAt: string;
  tags: string[];
  isPublic: boolean;
}

export interface Setting {
  tenantId: string;
  allowSelfSignup: boolean;
  allowInvites: boolean;
  theme: "hacker" | "neon" | "dark";
  requireUniversityEmail: boolean;
  primaryColor: string;
  emailNotifications: boolean;
  discordWebhook?: string;
}
