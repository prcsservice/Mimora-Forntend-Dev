import React, { useState, useCallback, useEffect, useRef } from 'react';
import AuthInput from '../AuthInput';
import PhoneInput from '../PhoneInput';
import PrimaryButton from '../PrimaryButton';
import SecondaryButton, { EmailIcon, PhoneIcon, GoogleIcon } from '../SecondaryButton';
import OTPInput from '../OTPInput';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

type LoginMethod = 'email' | 'phone';

interface LoginViewProps {
    method: LoginMethod;
    email: string;
    countryCode: string;
    phone: string;
    otp: string[];
    onEmailChange: (email: string) => void;
    onCountryCodeChange: (code: string) => void;
    onPhoneChange: (phone: string) => void;
    onOtpChange: (otp: string[]) => void;
    onSubmit: () => void;
    onSwitchMethod: () => void;
    onSignupClick: () => void;
}

// Validation helpers
const validateEmail = (email: string): string | undefined => {
    if (email.length === 0) {
        return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Please enter a valid email address';
    }
    return undefined;
};

const validatePhone = (phone: string): string | undefined => {
    if (phone.length === 0) {
        return 'Mobile number is required';
    }
    if (phone.length !== 10) {
        return 'Please enter a valid phone number';
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
        return 'Please enter a valid phone number';
    }
    return undefined;
};

const validateOtp = (otp: string[]): string | undefined => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
        return 'Please enter all 6 digits';
    }
    return undefined;
};

const LoginView: React.FC<LoginViewProps> = ({
    method,
    email,
    countryCode,
    phone,
    otp,
    onEmailChange,
    onCountryCodeChange,
    onPhoneChange,
    onOtpChange,
    onSwitchMethod,
    onSignupClick,
}) => {
    // Use shared AuthContext for all authentication methods
    const {
        loginWithGoogle,
        sendPhoneOTP,
        verifyPhoneOTP,
        sendEmailOTP,
        verifyEmailOTP,
        isLoading,
        error,
        clearError,
        userType,
    } = useAuth();

    const [touched, setTouched] = useState({
        email: false,
        phone: false,
        otp: false,
    });
    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Get validation errors
    const emailError = touched.email ? validateEmail(email) : undefined;
    const phoneError = touched.phone ? validatePhone(phone) : undefined;
    const otpError = touched.otp ? validateOtp(otp) : undefined;

    // Check if form is valid for getting OTP
    const isPhoneValid = method === 'phone' && !validatePhone(phone);
    const isEmailValid = method === 'email' && !validateEmail(email);
    const isContactValid = method === 'email' ? isEmailValid : isPhoneValid;

    // Check if OTP is complete and valid
    const isOtpComplete = otp.join('').length === 6;
    const isOtpValid = !validateOtp(otp);

    // Timer effect
    useEffect(() => {
        if (otpSent && timer > 0) {
            timerRef.current = window.setTimeout(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        } else if (timer === 0) {
            setCanResend(true);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [otpSent, timer]);

    // Clear error when user starts typing
    useEffect(() => {
        if (error) {
            clearError();
        }
    }, [email, phone, otp, clearError, error]);

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onEmailChange(e.target.value);
    }, [onEmailChange]);

    const handleEmailBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, email: true }));
    }, []);

    const handlePhoneChange = useCallback((value: string) => {
        onPhoneChange(value);
    }, [onPhoneChange]);

    const handlePhoneBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, phone: true }));
    }, []);

    const handleOtpChange = useCallback((newOtp: string[]) => {
        onOtpChange(newOtp);
        setTouched(prev => ({ ...prev, otp: true }));
    }, [onOtpChange]);

    // Send OTP via AuthContext
    const handleGetOtp = useCallback(async () => {
        // Mark relevant field as touched to show any errors
        if (method === 'email') {
            setTouched(prev => ({ ...prev, email: true }));
        } else {
            setTouched(prev => ({ ...prev, phone: true }));
        }

        if (!isContactValid || isLoading) return;

        try {
            // First, check if user exists
            const identifier = method === 'email' ? email : `${countryCode}${phone}`;
            // Use userType from context (default to 'customer' if null)
            const currentType = userType || 'customer';

            const { exists, user_type: existingType } = await authService.checkUserExists(identifier, method, currentType);

            if (!exists) {
                // User doesn't exist - show error with toast
                const errorMsg = 'No account found. Please create an account first.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }

            // Check for role mismatch (specifically Customer trying to login as Artist)
            if (currentType === 'artist' && existingType === 'customer') {
                const errorMsg = 'You have a customer account. Please Sign Up to become an artist.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }

            if (method === 'phone') {
                // Send Phone OTP via Firebase
                const fullPhoneNumber = `${countryCode}${phone}`;
                await sendPhoneOTP(fullPhoneNumber);
            } else {
                // Send Email OTP via Backend (use email as username for login)
                // For artist login, we still need to send the email
                await sendEmailOTP(email, email.split('@')[0]);
            }
            setOtpSent(true);
            setTimer(30);
            setCanResend(false);
        } catch (err: any) {
            console.error('Failed to send OTP:', err);
        }
    }, [method, isContactValid, isLoading, countryCode, phone, email, sendPhoneOTP, sendEmailOTP, clearError, userType]);

    // Resend OTP
    const handleResendOtp = useCallback(async () => {
        if (!canResend || isLoading) return;

        try {
            if (method === 'phone') {
                const fullPhoneNumber = `${countryCode}${phone}`;
                await sendPhoneOTP(fullPhoneNumber);
            } else {
                await sendEmailOTP(email, email.split('@')[0]);
            }
            setTimer(30);
            setCanResend(false);
            onOtpChange(['', '', '', '', '', '']);
            setTouched(prev => ({ ...prev, otp: false }));
        } catch (err) {
            console.error('Failed to resend OTP:', err);
        }
    }, [canResend, isLoading, method, countryCode, phone, email, sendPhoneOTP, sendEmailOTP, onOtpChange]);

    // Verify OTP via AuthContext
    const handleVerifyOtp = useCallback(async () => {
        setTouched(prev => ({ ...prev, otp: true }));

        if (!isOtpValid || isLoading) return;

        try {
            const otpString = otp.join('');
            if (method === 'phone') {
                // Verify Phone OTP - for login, we don't need name (pass empty string)
                await verifyPhoneOTP(otpString, '');
            } else {
                // Verify Email OTP
                await verifyEmailOTP(email, otpString);
            }
            // Success is handled by AuthContext (sets isAuthenticated = true)
            // AuthPage will show reveal animation and redirect
        } catch (err) {
            console.error('Failed to verify OTP:', err);
        }
    }, [isOtpValid, isLoading, otp, method, email, verifyPhoneOTP, verifyEmailOTP]);

    // Format timer as MM:SS
    const formatTimer = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle method switch - reset state
    const handleSwitchMethod = useCallback(() => {
        setOtpSent(false);
        setTimer(30);
        setCanResend(false);
        onOtpChange(['', '', '', '', '', '']);
        setTouched({
            email: false,
            phone: false,
            otp: false,
        });
        clearError();
        onSwitchMethod();
    }, [onOtpChange, clearError, onSwitchMethod]);

    return (
        <div className="auth-view-enter">
            {/* Heading */}
            <h1 className="text-[28px] font-semibold text-[#1E1E1E] leading-tight mb-2">
                Log In
            </h1>
            <p className="text-sm text-[#6B6B6B] mb-8">
                Enter your {method === 'email' ? 'email' : 'phone number'} to continue, We'll send you a verification code
            </p>

            {/* Error Display from AuthContext */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Form */}
            <div className="space-y-4">
                {method === 'email' ? (
                    <AuthInput
                        label="Email address"
                        type="email"
                        placeholder="Eg. name@company.com"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        error={emailError}
                        disabled={otpSent || isLoading}
                    />
                ) : (
                    <div onBlur={handlePhoneBlur}>
                        <PhoneInput
                            countryCode={countryCode}
                            phoneNumber={phone}
                            onCountryCodeChange={onCountryCodeChange}
                            onPhoneNumberChange={handlePhoneChange}
                            error={!otpSent ? phoneError : undefined}
                            disabled={otpSent || isLoading}
                        />
                    </div>
                )}

                {/* OTP Section - appears after Get OTP is clicked */}
                {otpSent && (
                    <div className="mt-4 animate-fade-in">
                        <label className="block text-xs text-[#6B6B6B] mb-2">
                            Enter OTP (One Time Password)
                        </label>
                        <OTPInput
                            value={otp}
                            onChange={handleOtpChange}
                            error={otpError}
                            length={6}
                        />

                        {/* Timer and Resend */}
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-[#6B6B6B]">
                                {formatTimer(timer)}
                            </span>
                            <button
                                onClick={handleResendOtp}
                                disabled={!canResend || isLoading}
                                className={`text-sm font-medium underline transition-colors ${canResend && !isLoading
                                    ? 'text-[#1E1E1E] hover:text-[#E91E63] cursor-pointer'
                                    : 'text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isLoading ? 'Sending...' : 'Resend OTP'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Get OTP / Verify OTP Button */}
            <div className="mt-6">
                {!otpSent ? (
                    <PrimaryButton
                        onClick={handleGetOtp}
                        disabled={!isContactValid || isLoading}
                    >
                        {isLoading ? 'Sending OTP...' : 'Get OTP'}
                    </PrimaryButton>
                ) : (
                    <PrimaryButton
                        onClick={handleVerifyOtp}
                        disabled={!isOtpComplete || isLoading}
                    >
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </PrimaryButton>
                )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Secondary Options */}
            <div className="space-y-3">
                <SecondaryButton
                    icon={method === 'email' ? <PhoneIcon /> : <EmailIcon />}
                    onClick={handleSwitchMethod}
                    disabled={isLoading}
                >
                    Continue with {method === 'email' ? 'Phone' : 'Email'}
                </SecondaryButton>
                <SecondaryButton
                    icon={<GoogleIcon />}
                    onClick={loginWithGoogle}
                    disabled={isLoading}
                >
                    {isLoading ? 'Signing in...' : 'Continue with Google'}
                </SecondaryButton>
            </div>

            {/* Footer Link */}
            <p className="mt-8 text-center text-sm text-[#6B6B6B]">
                Don't have an account?{' '}
                <button
                    onClick={onSignupClick}
                    className="font-semibold text-[#1E1E1E] hover:underline"
                    disabled={isLoading}
                >
                    Sign up
                </button>
            </p>
        </div>
    );
};

export default LoginView;
