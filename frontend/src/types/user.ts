export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  // Backend supports admin, company, passenger
  role: 'admin' | 'company' | 'passenger';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  companyId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface RegisterUserData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
  code?: string;
}
