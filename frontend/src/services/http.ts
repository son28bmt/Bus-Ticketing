import axios, { AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import type { User, LoginResponse, RegisterResponse, RegisterUserData } from "../types/user";
import type { Trip, TripSearchParams as SearchParams } from "../types/trip";

interface TripSearchResponse {
  success: boolean;
  message?: string;
  trips: Trip[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

interface LocationsResponse {
  success: boolean;
  message?: string;
  locations: {
    departure: Array<{
      id: number;
      name: string;
      code: string;
      province?: string;
    }>;
    arrival: Array<{
      id: number;
      name: string;
      code: string;
      province?: string;
    }>;
  };
}

type TripSearchParams = SearchParams;

const isBrowser = typeof window !== "undefined";
const storage = isBrowser ? window.localStorage : null;
const storedApiUrl = storage?.getItem("API_URL");
const rawApiUrl = storedApiUrl || import.meta.env.VITE_API_URL || "http://localhost:5000";
const baseUrl = rawApiUrl.endsWith("/api") ? rawApiUrl : `${rawApiUrl}/api`;
const enableDebugLog = import.meta.env.MODE !== "production";

const api = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = storage?.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (enableDebugLog) {
      console.debug("[http] request", config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error: unknown) => {
    if (enableDebugLog) {
      console.error("[http] request error", error);
    }
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (enableDebugLog) {
      console.debug("[http] response", response.config.url, response.status);
    }
    return response;
  },
  (error: unknown) => {
    console.error("[http] API error", error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (isBrowser && axiosError.response?.status === 401) {
        const requestUrl = axiosError.config?.url || "";
        const isAuthRequest =
          requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register");

        if (
          !isAuthRequest &&
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          storage?.removeItem("token");
          storage?.removeItem("user");
          window.location.href = "/login";
        }
      }

      if (axiosError.code === "ERR_NETWORK" || axiosError.code === "ECONNREFUSED") {
        console.error("[http] network error: cannot connect to server");
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    if (enableDebugLog) {
      console.debug("[auth] login request");
    }

    try {
      const response: AxiosResponse<LoginResponse> = await api.post("/auth/login", {
        email,
        password,
      });

      if (enableDebugLog) {
        console.debug("[auth] login response received");
      }

      return response.data;
    } catch (error) {
      console.error("[auth] login error", error);
      throw error;
    }
  },

  register: async (userData: RegisterUserData): Promise<RegisterResponse> => {
    try {
      const response: AxiosResponse<RegisterResponse> = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("[auth] register error", error);
      throw error;
    }
  },

  profile: async (): Promise<{ user: User }> => {
    try {
      const response: AxiosResponse<{ user: User }> = await api.get("/auth/profile");
      return response.data;
    } catch (error) {
      console.error("[auth] profile error", error);
      throw error;
    }
  },

  updateProfile: async (
    data: { name?: string; phone?: string }
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      const response = await api.put<{ success: boolean; message: string; user?: User }>(
        "/auth/profile",
        data
      );
      return response.data;
    } catch (error) {
      console.error("[auth] update profile error", error);
      throw error;
    }
  },

  changePassword: async (
    payload: { currentPassword: string; newPassword: string }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.put<{ success: boolean; message: string }>(
        "/auth/change-password",
        payload
      );
      return response.data;
    } catch (error) {
      console.error("[auth] change password error", error);
      throw error;
    }
  },
};

export const tripAPI = {
  searchTrips: async (params: TripSearchParams): Promise<TripSearchResponse> => {
    if (enableDebugLog) {
      console.debug("[trip] search", params);
    }

    try {
      const response = await api.get<TripSearchResponse>("/trips/search", { params });
      return response.data;
    } catch (error) {
      console.error("[trip] search error", error);

      const fallbackResponse: TripSearchResponse = {
        success: false,
        message: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message || "Loi tim kiem chuyen xe"
          : "Loi tim kiem chuyen xe",
        trips: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          limit: 10,
        },
      };

      return fallbackResponse;
    }
  },

  getLocations: async (): Promise<LocationsResponse> => {
    if (enableDebugLog) {
      console.debug("[trip] get locations");
    }

    try {
      const response = await api.get<LocationsResponse>("/trips/locations");
      return response.data;
    } catch (error) {
      console.error("[trip] get locations error", error);

      const fallbackResponse: LocationsResponse = {
        success: false,
        message: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message || "Loi lay danh sach dia diem"
          : "Loi lay danh sach dia diem",
        locations: {
          departure: [],
          arrival: [],
        },
      };

      return fallbackResponse;
    }
  },

  getFeatured: async (): Promise<TripSearchResponse> => {
    if (enableDebugLog) {
      console.debug("[trip] get featured");
    }

    try {
      const response = await api.get<TripSearchResponse>("/trips/featured", {
        params: { limit: 10 },
      });
      return response.data;
    } catch (error) {
      console.error("[trip] get featured error", error);

      const fallbackResponse: TripSearchResponse = {
        success: false,
        message: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message || "Loi lay chuyen xe noi bat"
          : "Loi lay chuyen xe noi bat",
        trips: [],
      };

      return fallbackResponse;
    }
  },

  listUpcoming: async (limit = 20): Promise<TripSearchResponse> => {
    try {
      const response = await api.get<TripSearchResponse>("/trips/search", {
        params: { page: 1, limit },
      });
      return response.data;
    } catch (error) {
      console.error("[trip] list upcoming error", error);

      const fallbackResponse: TripSearchResponse = {
        success: false,
        message: axios.isAxiosError(error)
          ? error.response?.data?.message || error.message || "Khong the lay danh sach chuyen xe"
          : "Khong the lay danh sach chuyen xe",
        trips: [],
      };
      return fallbackResponse;
    }
  },

  getById: async (id: string): Promise<{ success: boolean; trip?: Trip; message?: string }> => {
    try {
      const response = await api.get(`/trips/${id}`);
      return response.data;
    } catch (error) {
      console.error("[trip] get by id error", error);
      throw error;
    }
  },
};

export default api;
