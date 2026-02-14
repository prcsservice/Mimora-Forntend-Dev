import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth';
import { auth } from '../firebase';
import { authService } from '../services/authService';
import type { User } from '../types/auth.types';
import { toast } from 'sonner';

// Types
export type UserType = 'customer' | 'artist' | null;
export type AuthMethod = 'phone' | 'email' | 'google';

interface AuthState {
    user: User | null;
    userType: UserType;
    isAuthenticated: boolean;
    isLoading: boolean;
    loadingAction: string | null;  // What action is loading (checking-user, sending-otp, etc.)
    error: string | null;
    isTransitioning: boolean;  // For reveal animation on redirect
}

interface AuthContextValue extends AuthState {
    // Actions
    setUserType: (type: UserType) => void;
    loginWithGoogle: () => Promise<void>;
    sendPhoneOTP: (phoneNumber: string) => Promise<void>;
    verifyPhoneOTP: (otp: string, name: string) => Promise<void>;
    sendEmailOTP: (email: string, username: string) => Promise<void>;
    verifyEmailOTP: (email: string, otp: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
    startTransition: () => void;  // Trigger reveal animation
    endTransition: () => void;    // End reveal animation
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Provider
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>({
        user: null,
        userType: null,
        isAuthenticated: false,
        isLoading: true, // Start true to check localStorage
        loadingAction: null,
        error: null,
        isTransitioning: false,
    });

    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedUserType = localStorage.getItem('userType') as UserType;
        // Also check sessionStorage for userType (for unauth users during signup flow)
        const sessionUserType = sessionStorage.getItem('userType') as UserType;

        if (storedUser) {
            try {
                const user = JSON.parse(storedUser) as User;
                setState(prev => ({
                    ...prev,
                    user,
                    userType: storedUserType,
                    isAuthenticated: true,
                    isLoading: false,
                }));
            } catch {
                localStorage.removeItem('user');
                localStorage.removeItem('userType');
                setState(prev => ({ ...prev, isLoading: false }));
            }
        } else {
            // Restore userType from session for signup flow
            setState(prev => ({
                ...prev,
                userType: sessionUserType,
                isLoading: false
            }));
        }
    }, []);

    // Session timeout check - monitor token expiry
    useEffect(() => {
        const checkTokenExpiry = () => {
            const token = localStorage.getItem('firebaseToken');
            if (!token) return;

            try {
                // Decode JWT payload (without verification, just to read expiry)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(window.atob(base64));

                if (payload.exp) {
                    const expiryTime = payload.exp * 1000; // Convert to milliseconds
                    const now = Date.now();

                    // If token expired, logout
                    if (expiryTime < now) {
                        toast.error('Your session has expired. Please login again.');
                        logout();
                    }
                    // If token expires in less than 1 hour, show warning
                    else if (expiryTime - now < 60 * 60 * 1000) {
                        const minutesLeft = Math.floor((expiryTime - now) / (60 * 1000));
                        if (minutesLeft <= 10) {
                            toast.warning(`Your session will expire in ${minutesLeft} minutes.`);
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to check token expiry:', err);
            }
        };

        // Check immediately
        checkTokenExpiry();

        // Check every 5 minutes
        const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [state.isAuthenticated]);

    // Helper to set loading & clear error
    const startLoading = useCallback((action: string = 'loading') => {
        setState(prev => ({ ...prev, isLoading: true, loadingAction: action, error: null }));
    }, []);

    const setError = useCallback((error: string) => {
        setState(prev => ({ ...prev, isLoading: false, loadingAction: null, error }));
    }, []);

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }));
    }, []);

    // Start reveal transition animation
    const startTransition = useCallback(() => {
        setState(prev => ({ ...prev, isTransitioning: true }));
    }, []);

    // End reveal transition animation
    const endTransition = useCallback(() => {
        setState(prev => ({ ...prev, isTransitioning: false }));
    }, []);

    // Helper to complete auth
    const completeAuth = useCallback((user: User, firebaseToken: string) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('firebaseToken', firebaseToken);
        if (state.userType) {
            localStorage.setItem('userType', state.userType);
        }
        setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
        }));
    }, [state.userType]);

    // Set user type (from profile selection) - persist to sessionStorage
    const setUserType = useCallback((type: UserType) => {
        if (type) {
            sessionStorage.setItem('userType', type);
        } else {
            sessionStorage.removeItem('userType');
        }
        setState(prev => ({ ...prev, userType: type }));
    }, []);

    // ============ Google Login ============
    const loginWithGoogle = useCallback(async () => {
        startLoading();
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            const result = await signInWithPopup(auth, provider);
            const firebaseToken = await result.user.getIdToken();

            // Call backend with userType
            const user = await authService.authenticateWithOAuth(firebaseToken, state.userType || 'customer');
            completeAuth(user, firebaseToken);
        } catch (err: any) {
            console.error('Google sign-in failed:', err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError('Sign-in cancelled');
            } else if (err.code === 'auth/popup-blocked') {
                setError('Popup blocked. Please allow popups for this site.');
            } else {
                setError(err.message || 'Failed to sign in with Google');
            }
        }
    }, [startLoading, setError, completeAuth, state.userType]);

    // ============ Phone OTP ============
    const setupRecaptcha = useCallback(() => {
        if (!(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(
                auth,
                'recaptcha-container',
                { size: 'invisible' }
            );
        }
    }, []);

    const sendPhoneOTP = useCallback(async (phoneNumber: string) => {
        startLoading('sending-otp');
        try {
            setupRecaptcha();
            const appVerifier = (window as any).recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setState(prev => ({ ...prev, isLoading: false, loadingAction: null }));
            toast.success('OTP sent to your phone!');
        } catch (err: any) {
            console.error('Send OTP failed:', err);
            if (err.code === 'auth/invalid-phone-number') {
                setError('Invalid phone number format');
                toast.error('Invalid phone number');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
                toast.error('Too many attempts. Try later.');
            } else {
                setError(err.message || 'Failed to send OTP');
                toast.error('Failed to send OTP');
            }
        }
    }, [startLoading, setError, setupRecaptcha]);

    const verifyPhoneOTP = useCallback(async (otp: string, name: string) => {
        startLoading();
        try {
            if (!confirmationResult) {
                throw new Error('No OTP request found. Please request OTP first.');
            }
            const result = await confirmationResult.confirm(otp);
            const firebaseToken = await result.user.getIdToken();

            const user = await authService.authenticateWithOTP(firebaseToken, name, state.userType || 'customer');
            completeAuth(user, firebaseToken);
        } catch (err: any) {
            console.error('Verify OTP failed:', err);
            if (err.code === 'auth/invalid-verification-code') {
                setError('Invalid OTP. Please check and try again.');
                toast.error('Invalid OTP. Please check and try again.');
            } else if (err.code === 'auth/code-expired') {
                setError('OTP has expired. Please request a new one.');
                toast.error('OTP expired. Request a new one.');
            } else {
                setError(err.message || 'Failed to verify OTP');
                toast.error('Verification failed');
            }
        }
    }, [startLoading, setError, confirmationResult, completeAuth, state.userType]);

    // ============ Email OTP ============
    const sendEmailOTP = useCallback(async (email: string, username: string) => {
        startLoading('sending-otp');
        try {
            await authService.sendEmailOTP({ email, username }, state.userType || 'customer');
            setState(prev => ({ ...prev, isLoading: false, loadingAction: null }));
            toast.success('OTP sent to your email!');
        } catch (err: any) {
            console.error('Send Email OTP failed:', err);
            setError(err.message || 'Failed to send email OTP');
            toast.error('Failed to send OTP');
        }
    }, [startLoading, setError, state.userType]);

    const verifyEmailOTP = useCallback(async (email: string, otp: string) => {
        startLoading('verifying-otp');
        try {
            const user = await authService.verifyEmailOTP({ email, otp }, state.userType || 'customer');
            // Backend returns a Firebase custom token in user.token
            const firebaseToken = user.token || 'email-otp-session';
            toast.success('Welcome to Mimora!');
            completeAuth(user, firebaseToken);
        } catch (err: any) {
            console.error('Verify Email OTP failed:', err);
            setError(err.message || 'Failed to verify email OTP');
            toast.error('Invalid OTP. Please try again.');
        }
    }, [startLoading, setError, completeAuth, state.userType]);

    // ============ Logout ============
    const logout = useCallback(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
        localStorage.removeItem('firebaseToken');
        sessionStorage.removeItem('userType');
        setState({
            user: null,
            userType: null,
            isAuthenticated: false,
            isLoading: false,
            loadingAction: null,
            error: null,
            isTransitioning: false,
        });
    }, []);

    // Memoize context value
    const value = useMemo<AuthContextValue>(() => ({
        ...state,
        setUserType,
        loginWithGoogle,
        sendPhoneOTP,
        verifyPhoneOTP,
        sendEmailOTP,
        verifyEmailOTP,
        logout,
        clearError,
        startTransition,
        endTransition,
    }), [state, setUserType, loginWithGoogle, sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, verifyEmailOTP, logout, clearError, startTransition, endTransition]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook
export const useAuth = (): AuthContextValue => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
