// User type matching the backend UserResponse / ArtistResponse schemas
export interface User {
  id: string;           // UUID
  firebase_uid: string; // Firebase user ID
  email: string | null; // Can be null for phone-only users
  phone_number?: string | null;
  name: string | null;
  provider: string;
  token?: string | null; // Firebase custom token from email OTP
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

  // Artist-specific fields (optional, only present for artist users)
  profile_completed?: boolean;
  profile_pic_url?: string | null;
  kyc_verified?: boolean;
  experience?: string | null;
  bio?: string | null;
  how_did_you_learn?: string | null;
  certificate_url?: string | null;
  rating?: number | null;
  total_reviews?: number | null;
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