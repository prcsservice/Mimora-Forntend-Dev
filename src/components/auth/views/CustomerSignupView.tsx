import React, { useState, useCallback, useEffect, useRef } from 'react';
import AuthInput from '../AuthInput';
import PhoneInput from '../PhoneInput';
import OTPInput from '../OTPInput';
import PrimaryButton from '../PrimaryButton';
import SecondaryButton, { EmailIcon, GoogleIcon } from '../SecondaryButton';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { useGeolocation } from '@/hooks/useGeolocation';

// Phone Icon for secondary button
const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
);

type SignupMode = 'phone' | 'email';

interface CustomerSignupViewProps {
    fullName: string;
    countryCode: string;
    phone: string;
    otp: string[];
    email?: string;
    onFullNameChange: (name: string) => void;
    onCountryCodeChange: (code: string) => void;
    onPhoneChange: (phone: string) => void;
    onOtpChange: (otp: string[]) => void;
    onEmailChange?: (email: string) => void;
    onSubmit: () => void;
    onEmailSignIn: () => void;
    onLoginClick: () => void;
}

// Validation helpers
const validateFullName = (name: string): string | undefined => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
        return 'Full name is required';
    }
    if (trimmedName.length < 2) {
        return 'Please enter your full name. Name should be at least 2 characters.';
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
        return 'Name can only contain letters and spaces';
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

const validateEmail = (email: string): string | undefined => {
    if (email.length === 0) {
        return 'Email address is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Please enter a valid email address';
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

const CustomerSignupView: React.FC<CustomerSignupViewProps> = ({
    fullName,
    countryCode,
    phone,
    otp,
    email = '',
    onFullNameChange,
    onCountryCodeChange,
    onPhoneChange,
    onOtpChange,
    onEmailChange,
    onLoginClick,
}) => {
    // Request geolocation on component mount (for location capture)
    useGeolocation();

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
    } = useAuth();

    const [signupMode, setSignupMode] = useState<SignupMode>('phone');
    const [localEmail, setLocalEmail] = useState(email);
    const [touched, setTouched] = useState({
        fullName: false,
        phone: false,
        email: false,
        otp: false,
    });
    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const timerRef = useRef<number | null>(null);

    // Get validation errors
    const fullNameError = touched.fullName ? validateFullName(fullName) : undefined;
    const phoneError = touched.phone ? validatePhone(phone) : undefined;
    const emailError = touched.email ? validateEmail(localEmail) : undefined;
    const otpError = touched.otp ? validateOtp(otp) : undefined;

    // Check if form is valid for getting OTP
    const isPhoneFormValid = !validateFullName(fullName) && !validatePhone(phone);
    const isEmailFormValid = !validateFullName(fullName) && !validateEmail(localEmail);
    const isFormValid = signupMode === 'phone' ? isPhoneFormValid : isEmailFormValid;

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
    }, [fullName, phone, localEmail, otp, clearError, error]);

    const handleFullNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onFullNameChange(e.target.value);
    }, [onFullNameChange]);

    const handleFullNameBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, fullName: true }));
    }, []);

    const handlePhoneChange = useCallback((value: string) => {
        onPhoneChange(value);
    }, [onPhoneChange]);

    const handlePhoneBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, phone: true }));
    }, []);

    const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalEmail(e.target.value);
        onEmailChange?.(e.target.value);
    }, [onEmailChange]);

    const handleEmailBlur = useCallback(() => {
        setTouched(prev => ({ ...prev, email: true }));
    }, []);

    const handleOtpChange = useCallback((newOtp: string[]) => {
        onOtpChange(newOtp);
        setTouched(prev => ({ ...prev, otp: true }));
    }, [onOtpChange]);

    // Send OTP via AuthContext
    const handleGetOtp = useCallback(async () => {
        if (signupMode === 'phone') {
            setTouched(prev => ({ ...prev, fullName: true, phone: true }));
        } else {
            setTouched(prev => ({ ...prev, fullName: true, email: true }));
        }

        if (!isFormValid) return;

        try {
            // First, check if user already exists
            const identifier = signupMode === 'phone' ? `${countryCode}${phone}` : localEmail;
            const { exists } = await authService.checkUserExists(identifier, signupMode);

            if (exists) {
                // User already exists - show error with toast
                const errorMsg = 'Account already exists. Try logging in instead.';
                toast.error(errorMsg);
                throw new Error(errorMsg);
            }

            if (signupMode === 'phone') {
                // Send Phone OTP via Firebase + Backend
                const fullPhoneNumber = `${countryCode}${phone}`;
                await sendPhoneOTP(fullPhoneNumber);
            } else {
                // Send Email OTP via Backend
                await sendEmailOTP(localEmail, fullName.trim());
            }
            setOtpSent(true);
            setTimer(30);
            setCanResend(false);
        } catch (err: any) {
            // Error is handled by AuthContext
            console.error('Failed to send OTP:', err);
        }
    }, [isFormValid, signupMode, countryCode, phone, localEmail, fullName, sendPhoneOTP, sendEmailOTP]);

    // Resend OTP
    const handleResendOtp = useCallback(async () => {
        if (!canResend || isLoading) return;

        try {
            if (signupMode === 'phone') {
                const fullPhoneNumber = `${countryCode}${phone}`;
                await sendPhoneOTP(fullPhoneNumber);
            } else {
                await sendEmailOTP(localEmail, fullName.trim());
            }
            setTimer(30);
            setCanResend(false);
            onOtpChange(['', '', '', '', '', '']);
            setTouched(prev => ({ ...prev, otp: false }));
        } catch (err) {
            console.error('Failed to resend OTP:', err);
        }
    }, [canResend, isLoading, signupMode, countryCode, phone, localEmail, fullName, sendPhoneOTP, sendEmailOTP, onOtpChange]);

    // Verify OTP via AuthContext
    const handleVerifyOtp = useCallback(async () => {
        setTouched(prev => ({ ...prev, otp: true }));

        if (!isOtpValid || isLoading) return;

        try {
            const otpString = otp.join('');
            if (signupMode === 'phone') {
                // Verify Phone OTP - sends to backend with name
                await verifyPhoneOTP(otpString, fullName.trim());
            } else {
                // Verify Email OTP
                await verifyEmailOTP(localEmail, otpString);
            }
            // Success is handled by AuthContext (sets isAuthenticated = true)
            // AuthPage will show reveal animation and redirect
        } catch (err) {
            console.error('Failed to verify OTP:', err);
        }
    }, [isOtpValid, isLoading, otp, signupMode, fullName, localEmail, verifyPhoneOTP, verifyEmailOTP]);

    // Switch between phone and email mode
    const handleSwitchMode = useCallback((mode: SignupMode) => {
        setSignupMode(mode);
        setOtpSent(false);
        setTimer(30);
        setCanResend(false);
        onOtpChange(['', '', '', '', '', '']);
        setTouched({
            fullName: touched.fullName,
            phone: false,
            email: false,
            otp: false,
        });
        clearError();
    }, [onOtpChange, touched.fullName, clearError]);

    const formatTimer = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="auth-view-enter">
            {/* Heading */}
            <h1 className={`font-semibold text-[#1E1E1E] leading-tight mb-1 ${otpSent ? 'text-[24px]' : 'text-[28px]'}`}>
                Create your account
            </h1>
            <p className={`text-sm text-[#6B6B6B] ${otpSent ? 'mb-2' : 'mb-4'}`}>
                Join Mimora to book trusted professionals.
            </p>

            {/* Error Display from AuthContext */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Form */}
            <div className={otpSent ? 'space-y-2' : 'space-y-3'}>
                <AuthInput
                    label="Full name"
                    placeholder="Eg. Naveen Kumar"
                    value={fullName}
                    onChange={handleFullNameChange}
                    onBlur={handleFullNameBlur}
                    error={fullNameError}
                    disabled={otpSent || isLoading}
                    compact={otpSent}
                />

                {/* Phone Input - shown in phone mode */}
                {signupMode === 'phone' && (
                    <div onBlur={handlePhoneBlur}>
                        <PhoneInput
                            countryCode={countryCode}
                            phoneNumber={phone}
                            onCountryCodeChange={onCountryCodeChange}
                            onPhoneNumberChange={handlePhoneChange}
                            error={!otpSent ? phoneError : undefined}
                            disabled={otpSent || isLoading}
                            compact={otpSent}
                        />
                    </div>
                )}

                {/* Email Input - shown in email mode */}
                {signupMode === 'email' && (
                    <AuthInput
                        label="Email address"
                        placeholder="Eg. name@company.com"
                        value={localEmail}
                        onChange={handleEmailChange}
                        onBlur={handleEmailBlur}
                        error={!otpSent ? emailError : undefined}
                        disabled={otpSent || isLoading}
                        compact={otpSent}
                        type="email"
                    />
                )}

                {/* OTP Section */}
                {otpSent && (
                    <div className="mt-2 animate-fade-in">
                        <label className="block text-xs text-[#6B6B6B] mb-1">
                            Enter OTP (One Time Password)
                        </label>
                        <OTPInput
                            value={otp}
                            onChange={handleOtpChange}
                            error={otpError}
                            length={6}
                            compact
                        />

                        <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-[#6B6B6B]">
                                {formatTimer(timer)}
                            </span>
                            <button
                                onClick={handleResendOtp}
                                disabled={!canResend || isLoading}
                                className={`text-xs font-medium underline transition-colors ${canResend && !isLoading
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

            {/* Create Account Button */}
            <div className={otpSent ? 'mt-2' : 'mt-4'}>
                {!otpSent ? (
                    <PrimaryButton
                        onClick={handleGetOtp}
                        disabled={!isFormValid || isLoading}
                    >
                        {isLoading ? 'Sending OTP...' : 'Create account'}
                    </PrimaryButton>
                ) : (
                    <PrimaryButton
                        onClick={handleVerifyOtp}
                        disabled={!isOtpComplete || isLoading}
                        compact
                    >
                        {isLoading ? 'Verifying...' : 'Create account'}
                    </PrimaryButton>
                )}
            </div>

            {/* Divider */}
            <div className={`flex items-center gap-4 ${otpSent ? 'my-2' : 'my-4'}`}>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Secondary Options */}
            <div className={otpSent ? 'space-y-1.5' : 'space-y-2'}>
                {/* Show Email button when in phone mode, Phone button when in email mode */}
                {signupMode === 'phone' ? (
                    <SecondaryButton
                        icon={<EmailIcon />}
                        onClick={() => handleSwitchMode('email')}
                        compact={otpSent}
                        disabled={isLoading}
                    >
                        Sign in with Email
                    </SecondaryButton>
                ) : (
                    <SecondaryButton
                        icon={<PhoneIcon />}
                        onClick={() => handleSwitchMode('phone')}
                        compact={otpSent}
                        disabled={isLoading}
                    >
                        Sign in with Phone
                    </SecondaryButton>
                )}
                <SecondaryButton
                    icon={<GoogleIcon />}
                    onClick={loginWithGoogle}
                    disabled={isLoading}
                    compact={otpSent}
                >
                    {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </SecondaryButton>
            </div>

            {/* Footer Link */}
            <p className={`text-center text-sm text-[#6B6B6B] ${otpSent ? 'mt-3' : 'mt-4'}`}>
                Already have an account?{' '}
                <button
                    onClick={onLoginClick}
                    className="font-semibold text-[#1E1E1E] hover:underline"
                    disabled={isLoading}
                >
                    Log in
                </button>
            </p>
        </div>
    );
};

export default CustomerSignupView;