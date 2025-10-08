export type UserRole = 'owner' | 'admin' | 'member';

export interface SignupPayload {
  email: string;
  password: string;
  f_name: string;
  l_name: string;
  role: UserRole;
  organization_id?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthCookie {
  profile_id: string;
  access_token: string;
  refresh_token: string;
  full_name: string;
  role: UserRole;
  organization_id?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    profile_id: string;
    full_name: string;
    role: UserRole;
    organization_id?: string;
  };
}
