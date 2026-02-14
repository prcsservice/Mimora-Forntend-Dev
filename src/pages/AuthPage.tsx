import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import ProfileSelector from '../components/auth/views/ProfileSelector';
import CustomerSignupView from '../components/auth/views/CustomerSignupView';
import ArtistSignupView from '../components/auth/views/ArtistSignupView';
import LoginView from '../components/auth/views/LoginView';
import OTPVerificationView from '../components/auth/views/OTPVerificationView';
import SuccessView from '../components/auth/views/SuccessView';
import PrimaryButton from '../components/auth/PrimaryButton';
import { useAuth } from '../contexts/AuthContext';
import { useAuthFlow } from '../hooks/useAuthFlow';
import '../styles/auth.css';



const AuthPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { userType, setUserType, isAuthenticated } = useAuth();

    const {
        step,
        profileType,
        authMethod,
        formData,
        isEmailVerified,
        setProfileType,
        setAuthMethod,
        updateFormData,
        setEmailVerified,
        goToSuccess,
    } = useAuthFlow();

    // Redirect to appropriate home when authenticated
    // EXCEPTION: Don't redirect on artist signup page — artist must complete full registration first
    useEffect(() => {
        if (isAuthenticated && location.pathname !== '/auth/artist/signup') {
            const destination = userType === 'artist' ? '/artist/home' : '/home';
            navigate(destination, { replace: true });
        }
    }, [isAuthenticated, navigate, userType, location.pathname]);

    // Show loading state while checking auth or redirecting
    // Skip this on artist signup — artist stays on form even after OTP verification
    if (isAuthenticated && location.pathname !== '/auth/artist/signup') {
        return (
            <div className="min-h-screen bg-[#F8A5B8] flex flex-col items-center justify-center">
                <img
                    src="/Mimora Logo (No text).png"
                    alt="Mimora"
                    className="w-16 h-16 animate-pulse"
                />
                <p className="mt-4 text-[#1E1E1E] font-medium">Redirecting...</p>
            </div>
        );
    }

    // Determine what to show based on URL path
    const path = location.pathname;

    // Helper to handle profile selection navigation
    const handleProfileSelect = (profile: 'customer' | 'artist') => {
        setProfileType(profile);
        setUserType(profile);
    };

    const handleGetStarted = () => {
        if (profileType) {
            // Navigate to login page for the selected profile
            navigate(`/auth/${profileType}/login`);
        }
    };

    // Profile Selection View (default /auth)
    if (path === '/auth') {
        return (
            <AuthLayout>
                <h1 className="text-[28px] font-semibold text-[#1E1E1E] leading-tight mb-2">
                    Create or Join an Account
                </h1>
                <p className="text-sm text-[#6B6B6B] mb-8">
                    Select your profile to proceed
                </p>

                <ProfileSelector
                    selectedProfile={profileType}
                    onSelect={handleProfileSelect}
                />

                <div className="mt-8">
                    <PrimaryButton
                        onClick={handleGetStarted}
                        disabled={!profileType}
                    >
                        Get Started
                    </PrimaryButton>
                </div>
            </AuthLayout>
        );
    }

    // Customer Login
    if (path === '/auth/customer/login') {
        return (
            <AuthLayout>
                <LoginView
                    method={authMethod || 'phone'}
                    email={formData.email}
                    countryCode={formData.countryCode}
                    phone={formData.phone}
                    otp={formData.otp}
                    onEmailChange={(email) => updateFormData({ email })}
                    onCountryCodeChange={(code) => updateFormData({ countryCode: code })}
                    onPhoneChange={(phone) => updateFormData({ phone })}
                    onOtpChange={(otp) => updateFormData({ otp })}
                    onSubmit={goToSuccess}
                    onSwitchMethod={() => {
                        setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
                    }}
                    onSignupClick={() => navigate('/auth/customer/signup')}
                />
            </AuthLayout>
        );
    }

    // Customer Signup
    if (path === '/auth/customer/signup') {
        return (
            <AuthLayout>
                <CustomerSignupView
                    fullName={formData.fullName}
                    countryCode={formData.countryCode}
                    phone={formData.phone}
                    otp={formData.otp}
                    email={formData.email}
                    onFullNameChange={(name) => updateFormData({ fullName: name })}
                    onCountryCodeChange={(code) => updateFormData({ countryCode: code })}
                    onPhoneChange={(phone) => updateFormData({ phone })}
                    onOtpChange={(otp) => updateFormData({ otp })}
                    onEmailChange={(email) => updateFormData({ email })}
                    onSubmit={goToSuccess}
                    onEmailSignIn={() => { }}
                    onLoginClick={() => navigate('/auth/customer/login')}
                />
            </AuthLayout>
        );
    }

    // Artist Login
    if (path === '/auth/artist/login') {
        return (
            <AuthLayout>
                <LoginView
                    method={authMethod || 'phone'}
                    email={formData.email}
                    countryCode={formData.countryCode}
                    phone={formData.phone}
                    otp={formData.otp}
                    onEmailChange={(email) => updateFormData({ email })}
                    onCountryCodeChange={(code) => updateFormData({ countryCode: code })}
                    onPhoneChange={(phone) => updateFormData({ phone })}
                    onOtpChange={(otp) => updateFormData({ otp })}
                    onSubmit={goToSuccess}
                    onSwitchMethod={() => {
                        setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
                    }}
                    onSignupClick={() => navigate('/auth/artist/signup')}
                />
            </AuthLayout>
        );
    }

    // Artist Signup - Full page layout (not wrapped in AuthLayout)
    if (path === '/auth/artist/signup') {
        return <ArtistSignupView />;
    }

    // Legacy step-based views (for internal transitions like OTP, Success)
    // These can be kept for in-page transitions or migrated to URL-based later



    if (step === 'otp-verification') {
        return (
            <AuthLayout>
                <OTPVerificationView
                    method={authMethod || 'phone'}
                    fullName={formData.fullName}
                    email={formData.email}
                    countryCode={formData.countryCode}
                    phone={formData.phone}
                    otp={formData.otp}
                    isVerified={isEmailVerified}
                    onOtpChange={(otp) => updateFormData({ otp })}
                    onSubmit={() => {
                        setEmailVerified(true);
                        goToSuccess();
                    }}
                    onSwitchMethod={() => {
                        setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
                    }}
                    onGoogleSignIn={() => console.log('Google Sign In')}
                    onLoginClick={() => navigate(`/auth/${userType || 'customer'}/login`)}
                />
            </AuthLayout>
        );
    }

    if (step === 'success') {
        return (
            <AuthLayout>
                <SuccessView
                    onContinue={() => {
                        navigate('/home');
                    }}
                />
            </AuthLayout>
        );
    }

    // Fallback - redirect to profile selection
    return null;
};

export default AuthPage;
