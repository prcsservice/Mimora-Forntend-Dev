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
  // Supports both customer and artist auth
  // ===============================
  async sendEmailOTP(payload: EmailOTPSendRequest, userType: 'customer' | 'artist' = 'customer'): Promise<{ message: string }> {
    const endpoint = userType === 'artist'
      ? '/auth/artist/email'
      : '/auth/customer/email';
    return this.fetchJSON(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ===============================
  // EMAIL OTP – VERIFY OTP
  // Supports both customer and artist auth
  // ===============================
  async verifyEmailOTP(payload: EmailOTPVerifyRequest, userType: 'customer' | 'artist' = 'customer'): Promise<User> {
    const endpoint = userType === 'artist'
      ? '/auth/artist/email/verify'
      : '/auth/customer/email/verify';
    return this.fetchJSON(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ===============================
  // OAUTH (Firebase token required)
  // Supports both customer and artist auth
  // ===============================
  async authenticateWithOAuth(
    firebaseToken: string,
    userType: 'customer' | 'artist' = 'customer',
    mode: 'login' | 'signup' = 'login'
  ): Promise<User> {
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
        mode,
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
  // Supports both customer and artist checks
  // ===============================
  async checkUserExists(
    identifier: string,
    type: 'email' | 'phone',
    userType: 'customer' | 'artist' = 'customer'
  ): Promise<{ exists: boolean; user_type: string | null }> {
    const endpoint = userType === 'artist'
      ? '/auth/artist/check'
      : '/auth/customer/check';
    return this.fetchJSON(endpoint, {
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
  // ===============================
  // COMPLETE ARTIST PROFILE
  // Called after initial auth to submit all profile data
  // ===============================
  async completeArtistProfile(profileData: {
    phone_number?: string;
    birthdate?: string;  // DD/MM/YYYY
    gender?: string;
    experience?: string;
    bio?: string;
    profile_pic_url?: string;
    name?: string;
    username?: string;
    how_did_you_learn?: string;
    certificate_url?: string;
    profession?: string[];
    flat_building?: string;
    street_area?: string;
    landmark?: string;
    pincode?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
    // Step 2: Booking Preferences
    booking_mode?: string;
    skills?: string[];
    event_types?: string[];
    service_location?: string;
    travel_willingness?: string[];
    studio_address?: string;  // JSON string
    working_hours?: string;  // JSON string
    // Step 3: Portfolio
    portfolio?: string[];
    // Step 4: Bank Details
    bank_account_name?: string;
    bank_account_number?: string;
    bank_name?: string;
    bank_ifsc?: string;
    upi_id?: string;
    mark_complete?: boolean;  // Only true when ALL steps are done
  }): Promise<User> {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      throw new Error('Not authenticated. Please log in first.');
    }

    return this.fetchJSON('/auth/artist/profile', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  }

  // ===============================
  // GET CURRENT ARTIST PROFILE
  // Fetch the authenticated artist's full profile from backend
  // Used as fallback when localStorage is missing/corrupted
  // ===============================
  async getCurrentArtist(): Promise<User> {
    const token = localStorage.getItem('firebaseToken');
    if (!token) {
      throw new Error('Not authenticated. Please log in first.');
    }

    return this.fetchJSON('/auth/artist/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const authService = new AuthService();
