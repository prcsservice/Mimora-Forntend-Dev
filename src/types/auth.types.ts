// User type matching the backend UserResponse schema
export interface User {
  id: string;           // UUID (was incorrectly typed as number)
  firebase_uid: string; // Added: Firebase user ID
  email: string | null; // Can be null for phone-only users
  phone_number?: string | null;
  name: string | null;
  provider: string;
  token?: string | null; // Added: Firebase custom token from email OTP
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  flat_building?: string | null;
  street_area?: string | null;
  landmark?: string | null;
  address?: string | null;
  created_at: string; // ISO date string
}

// Location update payload
export interface UserLocationUpdate {
  latitude: number;
  longitude: number;
  flat_building?: string | null;
  street_area: string;
  landmark?: string | null;
  pincode: string;
  city: string;
  state: string;
}

// Request/Response types
export interface EmailOTPSendRequest {
  username: string;
  email: string;
}

export interface EmailOTPVerifyRequest {
  email: string;
  otp: string;
}

export interface OTPResponse {
  message: string;
}

export interface AuthError {
  detail: string;
}

export interface CheckUserRequest {
  identifier: string;
  type: 'email' | 'phone';
}

export interface CheckUserResponse {
  exists: boolean;
  user_type: string | null;
}