export interface User {
  id: string;
  email: string;
  name: string | null;
  preferredLocale: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
