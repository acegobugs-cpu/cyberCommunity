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

/** Non-sensitive view of a signed-in account (shared across apps). */
export interface AccountSummary {
  id: string;
  email: string;
  username: string;
  /** epoch seconds */
  exp: number;
}

/** What the BFF returns to the browser after signin/signup/join or on /api/session. The JWT itself never leaves the server. */
export interface SessionResponse {
  user: User;
  expiresIn: number;
  portalRole?: string | null;
  /** Every account signed in on this browser, including `user`. */
  accounts: AccountSummary[];
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
