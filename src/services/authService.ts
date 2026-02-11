import { API_CONFIG } from '../config/api';
import type { User, UserLocationUpdate } from '../types/auth.types';
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
    const cachedAddr = this.getCachedAddress();
    return this.fetchJSON(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({
        latitude: location?.latitude,
        longitude: location?.longitude,
        ...cachedAddr,
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
    const cachedAddr = this.getCachedAddress();
    return this.fetchJSON(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify({
        name,
        latitude: location?.latitude,
        longitude: location?.longitude,
        ...cachedAddr,
      }),
    });
  }

  // Helper to get cached address from localStorage
  private getCachedAddress(): Record<string, string> {
    try {
      const cached = localStorage.getItem('userAddress');
      if (cached) {
        const addr = JSON.parse(cached);
        return {
          flat_building: addr.flat_building || '',
          street_area: addr.street_area || '',
          landmark: addr.landmark || '',
          pincode: addr.pincode || '',
          city: addr.city || '',
          state: addr.state || '',
        };
      }
    } catch { /* ignore */ }
    return {};
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

  // ===============================
  // UPDATE LOCATION
  // ===============================
  async updateLocation(
    firebaseToken: string,
    payload: UserLocationUpdate,
    userType: 'customer' | 'artist' = 'customer'
  ): Promise<User> {
    const endpoint = userType === 'artist'
      ? '/auth/artist/location'
      : '/auth/customer/location';

    const result = await this.fetchJSON(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify(payload),
    });

    // Cache the full address in localStorage
    localStorage.setItem('userAddress', JSON.stringify(payload));

    return result;
  }
}

export const authService = new AuthService();
