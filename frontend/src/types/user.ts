export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  // Backend supports admin, company, driver, passenger
  role: 'admin' | 'company' | 'driver' | 'passenger';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  companyId?: number | null;
  driverId?: number | null;
  driverProfile?: {
    id: number;
    companyId: number;
    licenseNumber?: string | null;
    phone?: string | null;
    status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  } | null;
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
