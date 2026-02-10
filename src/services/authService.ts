import { API_CONFIG } from '../config/api';
import type { User } from '../types/auth.types';
import { getCachedLocation } from '../hooks/useGeolocation';

interface EmailOTPSendRequest {
  username: string;
  email: string;
}

interface EmailOTPVerifyRequest {
  email: string;
  otp: string;
}

class AuthService {

  private async fetchJSON(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // ===============================
  // EMAIL OTP – SEND OTP
  // ===============================
  async sendEmailOTP(payload: EmailOTPSendRequest): Promise<{ message: string }> {
    return this.fetchJSON('/auth/customer/email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ===============================
  // EMAIL OTP – VERIFY OTP
  // ===============================
  async verifyEmailOTP(payload: EmailOTPVerifyRequest): Promise<User> {
    return this.fetchJSON('/auth/customer/email/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ===============================
  // OAUTH (Firebase token required)
  // Supports both customer and artist auth
  // ===============================
  async authenticateWithOAuth(firebaseToken: string, userType: 'customer' | 'artist' = 'customer'): Promise<User> {
    const endpoint = userType === 'artist' ? '/auth/artist/oauth' : '/auth/customer/oauth';
    const location = getCachedLocation();
    return this.fetchJSON(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    });
  }

  // ===============================
  // PHONE OTP (Firebase)
  // Supports both customer and artist auth
  // ===============================
  async authenticateWithOTP(firebaseToken: string, name: string, userType: 'customer' | 'artist' = 'customer'): Promise<User> {
    const endpoint = userType === 'artist'
      ? '/auth/artist/otp'
      : API_CONFIG.ENDPOINTS.OTP_AUTH;
    const location = getCachedLocation();
    return this.fetchJSON(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({
        name,
        latitude: location?.latitude,
        longitude: location?.longitude,
      }),
    });
  }

  // ===============================
  // CHECK USER EXISTS
  // ===============================
  async checkUserExists(identifier: string, type: 'email' | 'phone'): Promise<{ exists: boolean; user_type: string | null }> {
    return this.fetchJSON('/auth/customer/check', {
      method: 'POST',
      body: JSON.stringify({ identifier, type }),
    });
  }
}

export const authService = new AuthService();
