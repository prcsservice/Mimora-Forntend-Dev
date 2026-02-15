import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SuccessAnimation from '@/components/common/SuccessAnimation';
import { storage, auth as firebaseAuth } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useGeolocation } from '@/hooks/useGeolocation';
import ArtistProfilePreview from '@/components/auth/ArtistProfilePreview';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/utils/errorHandling';
import { uploadProfilePicture, uploadCertificate, uploadPortfolioImage } from '@/services/uploadService';

// Types
type SignupMethod = 'phone' | 'email' | 'google' | null;
type FormStep = 'method-select' | 'otp-verify' | 'details-form' | 'booking-modes' | 'portfolio' | 'bank-details';

interface FormData {
    fullName: string;
    email: string;
    countryCode: string;
    phone: string;
    birthday: string;
    gender: string;
    experience: string;
    bio: string;
    otp: string;
    // Step 2: Identity Verification
    kycStatus: 'pending' | 'verified';
    profilePicUrl: string;
    faceVerified: boolean;
    // Step 3: Professional Info
    howDidYouLearn: 'professional' | 'self-learned' | 'apprentice' | '';
    certificateUrl: string;
    // Step 4: Address Details
    address: {
        flatNo: string;
        street: string;
        landmark: string;
        pincode: string;
        city: string;
        state: string;
        location?: { lat: number; lng: number };
    };
}

// Icons
const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
);

const EmailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 5L2 7" />
    </svg>
);

const GoogleIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

const LockIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);

const BackArrowIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const ChevronLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" />
    </svg>
);

const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18l6-6-6-6" />
    </svg>
);

// Custom Date Picker Component
interface DatePickerFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    helperText?: string;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
    label,
    value,
    onChange,
    error,
    required = false,
    helperText,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => {
        // Parse existing value or use 18 years ago as default
        if (value) {
            const [day, month, year] = value.split('/').map(Number);
            if (day && month && year) {
                return new Date(year, month - 1, day);
            }
        }
        const date = new Date();
        date.setFullYear(date.getFullYear() - 18);
        return date;
    });
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return { firstDay, daysInMonth };
    };

    const handlePrevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleSelectDate = (day: number) => {
        const formatted = `${String(day).padStart(2, '0')}/${String(viewDate.getMonth() + 1).padStart(2, '0')}/${viewDate.getFullYear()}`;
        onChange(formatted);
        setIsOpen(false);
    };

    const { firstDay, daysInMonth } = getDaysInMonth(viewDate);
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

    // Parse selected date
    const selectedParts = value?.split('/').map(Number);
    const selectedDate = selectedParts?.length === 3
        ? new Date(selectedParts[2], selectedParts[1] - 1, selectedParts[0])
        : null;

    const isDateDisabled = (day: number) => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        return date > maxDate;
    };

    return (
        <div className="relative space-y-1" ref={containerRef}>
            <div
                className={`relative border rounded-lg px-3 py-2 bg-white transition-colors cursor-pointer ${error ? 'border-red-400' : isOpen ? 'border-[#E91E63]' : 'border-gray-200'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <label className="block text-xs text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-2">
                    <span className={`flex-1 text-sm ${value ? 'text-gray-900' : 'text-gray-400'}`}>
                        {value || 'DD/MM/YYYY'}
                    </span>
                    <CalendarIcon />
                </div>
            </div>

            {/* Calendar Dropdown - positioned above the input */}
            {isOpen && (
                <div className="absolute z-50 bottom-full mb-2 left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-[300px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {/* Header with Month/Year Dropdowns */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronLeftIcon />
                        </button>

                        {/* Month Dropdown */}
                        <select
                            value={viewDate.getMonth()}
                            onChange={(e) => {
                                e.stopPropagation();
                                setViewDate(prev => new Date(prev.getFullYear(), parseInt(e.target.value), 1));
                            }}
                            className="text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors outline-none focus:border-[#E91E63]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {months.map((month, index) => (
                                <option key={month} value={index}>{month}</option>
                            ))}
                        </select>

                        {/* Year Dropdown */}
                        <select
                            value={viewDate.getFullYear()}
                            onChange={(e) => {
                                e.stopPropagation();
                                setViewDate(prev => new Date(parseInt(e.target.value), prev.getMonth(), 1));
                            }}
                            className="text-sm font-semibold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-100 transition-colors outline-none focus:border-[#E91E63]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {Array.from({ length: maxDate.getFullYear() - 1940 + 1 }, (_, i) => 1940 + i).reverse().map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ChevronRightIcon />
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-xs text-gray-400 text-center py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {/* Empty cells for days before first */}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-8 h-8" />
                        ))}
                        {/* Day cells */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const isSelected = selectedDate?.getDate() === day &&
                                selectedDate?.getMonth() === viewDate.getMonth() &&
                                selectedDate?.getFullYear() === viewDate.getFullYear();
                            const isToday = today.getDate() === day &&
                                today.getMonth() === viewDate.getMonth() &&
                                today.getFullYear() === viewDate.getFullYear();
                            const disabled = isDateDisabled(day);

                            return (
                                <button
                                    key={day}
                                    onClick={(e) => { e.stopPropagation(); if (!disabled) handleSelectDate(day); }}
                                    disabled={disabled}
                                    className={`w-8 h-8 text-sm rounded-lg transition-all duration-150 ${isSelected
                                        ? 'bg-[#E91E63] text-white font-semibold'
                                        : disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : isToday
                                                ? 'border border-[#E91E63] text-[#E91E63] hover:bg-pink-50'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {error ? (
                <p className="text-xs text-red-500 px-1">{error}</p>
            ) : helperText ? (
                <p className="text-xs text-gray-400 px-1">{helperText}</p>
            ) : null}
        </div>
    );
};

// Step card icons
const PersonalDetailsIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
        <span className="text-lg">📋</span>
    </div>
);

const BookingModesIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
        <span className="text-lg">⭐</span>
    </div>
);

const PortfolioIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
        <span className="text-lg">🎨</span>
    </div>
);

const BankDetailsIcon = () => (
    <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
        <span className="text-lg">🏦</span>
    </div>
);

// Reusable Input Component
interface InputFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    disabled?: boolean;
    suffix?: React.ReactNode;
    helperText?: string;
    error?: string;
    required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    placeholder,
    value,
    onChange,
    type = 'text',
    disabled = false,
    suffix,
    helperText,
    error,
    required = false,
}) => (
    <div className="space-y-1">
        <div className={`relative border rounded-lg px-3 py-2 bg-white transition-colors ${error ? 'border-red-400 focus-within:border-red-500' : 'border-gray-200 focus-within:border-[#E91E63]'}`}>
            <label className="block text-xs text-gray-500">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400 disabled:text-gray-500"
                />
                {suffix}
            </div>
        </div>
        {error ? (
            <p className="text-xs text-red-500 px-1">{error}</p>
        ) : helperText ? (
            <p className="text-xs text-gray-400 px-1">{helperText}</p>
        ) : null}
    </div>
);

// Phone Input with Country Code
interface PhoneInputFieldProps {
    countryCode: string;
    phone: string;
    onCountryCodeChange: (code: string) => void;
    onPhoneChange: (phone: string) => void;
    verified?: boolean;
    onVerifyClick?: () => void;
    showVerify?: boolean;
    error?: string;
    required?: boolean;
    isLoading?: boolean;
    canVerify?: boolean;
}

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
    countryCode,
    phone,
    onCountryCodeChange,
    onPhoneChange,
    verified,
    onVerifyClick,
    showVerify = true,
    error,
    required = false,
    isLoading = false,
    canVerify = false,
}) => (
    <div className="space-y-1">
        <div className="flex gap-2">
            <div className={`w-20 border rounded-lg px-3 py-2 bg-white transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}>
                <label className="block text-xs text-gray-500">Country code</label>
                <input
                    type="text"
                    value={countryCode}
                    onChange={(e) => onCountryCodeChange(e.target.value)}
                    className="w-full text-sm text-gray-900 bg-transparent outline-none"
                />
            </div>
            <div className={`flex-1 border rounded-lg px-3 py-2 bg-white transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}>
                <label className="block text-xs text-gray-500">
                    Mobile number {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center gap-2">
                    <input
                        type="tel"
                        placeholder="Eg. 86941 86903"
                        value={phone}
                        onChange={(e) => onPhoneChange(e.target.value)}
                        className="flex-1 text-sm text-gray-900 bg-transparent outline-none placeholder:text-gray-400"
                    />
                    {showVerify && (
                        <button
                            onClick={onVerifyClick}
                            disabled={isLoading || (!canVerify && !verified)}
                            className={`text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${verified
                                ? 'text-emerald-600'
                                : isLoading
                                    ? 'text-[#E91E63]'
                                    : canVerify
                                        ? 'text-[#E91E63] hover:text-[#C2185B]'
                                        : 'text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Sending...
                                </>
                            ) : verified ? (
                                '✓ Verified'
                            ) : (
                                'Verify'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
        {error && <p className="text-xs text-red-500 px-1">{error}</p>}
    </div>
);

// Select Dropdown
interface SelectFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, onChange, options, placeholder, error, required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="space-y-1" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`relative border rounded-lg px-3 py-2 bg-white transition-all cursor-pointer ${error ? 'border-red-400' : isOpen ? 'border-[#E91E63] ring-1 ring-[#E91E63]/20' : 'border-gray-200 hover:border-gray-300'
                    }`}
            >
                <label className="block text-xs text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className="flex items-center justify-between">
                    <span className={`text-sm ${selectedOption ? 'text-gray-900' : 'text-gray-400'}`}>
                        {selectedOption?.label || placeholder || 'Select an option'}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                {/* Custom Dropdown Menu */}
                {isOpen && (
                    <div
                        data-lenis-prevent
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-[120px] overflow-y-auto"
                    >
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-3 py-2.5 text-sm cursor-pointer transition-colors ${value === opt.value
                                    ? 'bg-[#FCE4EC] text-[#E91E63] font-medium'
                                    : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{opt.label}</span>
                                    {value === opt.value && (
                                        <svg className="w-4 h-4 text-[#E91E63]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {error && <p className="text-xs text-red-500 px-1">{error}</p>}
        </div>
    );
};

// Textarea
interface TextareaFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    required?: boolean;
    maxLength?: number;
    helperText?: string;
}

const TextareaField: React.FC<TextareaFieldProps> = ({ label, placeholder, value, onChange, error, required = false, maxLength = 500, helperText }) => (
    <div className="space-y-1">
        <div className={`border rounded-lg px-3 py-2 bg-white transition-colors ${error ? 'border-red-400' : 'border-gray-200'}`}>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs text-gray-500">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <span className={`text-xs ${value.length > maxLength ? 'text-red-500' : 'text-gray-400'}`}>
                    {value.length}/{maxLength}
                </span>
            </div>
            <textarea
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full text-sm text-gray-900 bg-transparent outline-none resize-none placeholder:text-gray-400"
            />
        </div>
        {error ? (
            <p className="text-xs text-red-500 px-1">{error}</p>
        ) : helperText ? (
            <p className="text-xs text-gray-400 px-1">{helperText}</p>
        ) : null}
    </div>
);

// OTP Input Component with auto-verify, resend timer, and status messages
interface OTPInputProps {
    value: string;
    onChange: (value: string) => void;
    onComplete?: (otp: string) => Promise<boolean>;
    onResend?: () => Promise<void>;
    length?: number;
    isVerifying?: boolean;
    isSending?: boolean;
    error?: string;
    successMessage?: string;
}

const OTPInputField: React.FC<OTPInputProps> = ({
    value,
    onChange,
    onComplete,
    onResend,
    length = 6,
    isVerifying = false,
    isSending = false,
    error,
    successMessage
}) => {
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const [resendTimer, setResendTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [localError, setLocalError] = useState<string>('');
    const [localSuccess, setLocalSuccess] = useState<string>('');
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Clear local messages when external props change
    useEffect(() => {
        if (error) setLocalError(error);
        if (successMessage) setLocalSuccess(successMessage);
    }, [error, successMessage]);

    // Countdown timer for resend
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    // Auto-verify when all digits are entered
    useEffect(() => {
        if (value.length === length && onComplete && !isVerifying) {
            setLocalError('');
            setLocalSuccess('');
            onComplete(value);
        }
    }, [value, length, onComplete, isVerifying]);

    const handleChange = (index: number, digit: string) => {
        // Only allow numbers
        if (digit && !/^\d$/.test(digit)) return;

        // Clear error when typing
        setLocalError('');

        const newOtp = value.split('');
        newOtp[index] = digit;
        onChange(newOtp.join(''));

        // Auto-focus next input
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace - move to previous input
        if (e.key === 'Backspace' && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Handle arrow keys
        if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === 'ArrowRight' && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        onChange(pastedData);
        setLocalError('');
        // Focus the next empty input or the last one
        const focusIndex = Math.min(pastedData.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
    };

    const handleResend = async () => {
        if (canResend && onResend && !isResending) {
            setIsResending(true);
            setLocalError('');
            setLocalSuccess('');
            try {
                await onResend();
                setResendTimer(30);
                setCanResend(false);
                onChange(''); // Clear OTP
                setLocalSuccess('OTP sent successfully!');
                // Clear success message after 3 seconds
                setTimeout(() => setLocalSuccess(''), 3000);
            } catch {
                setLocalError('Failed to resend OTP. Please try again.');
            } finally {
                setIsResending(false);
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const displayError = localError || error;
    const displaySuccess = localSuccess || successMessage;
    const hasError = !!displayError;
    const hasSuccess = !!displaySuccess;

    return (
        <div className="space-y-3">
            {/* OTP Label */}
            <p className="text-sm text-gray-600">Enter OTP (One Time Password)</p>

            {/* OTP Input Boxes */}
            <div className="flex gap-3 justify-start">
                {Array.from({ length }).map((_, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={value[i] || ''}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={() => setFocusedIndex(i)}
                        onBlur={() => setFocusedIndex(null)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={isVerifying || isSending}
                        className={`w-12 h-14 text-center text-xl font-semibold rounded-xl transition-all duration-200 outline-none ${isVerifying || isSending
                            ? 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                            : hasError
                                ? 'border-2 border-red-400 bg-red-50'
                                : hasSuccess
                                    ? 'border-2 border-emerald-400 bg-emerald-50'
                                    : focusedIndex === i
                                        ? 'border-2 border-gray-800 shadow-sm'
                                        : value[i]
                                            ? 'border-2 border-gray-300 bg-white'
                                            : 'border-2 border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    />
                ))}
            </div>

            {/* Status Messages */}
            {displayError && (
                <div className="flex items-center gap-2 text-sm text-red-600 animate-in fade-in duration-200">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{displayError}</span>
                </div>
            )}
            {displaySuccess && !displayError && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 animate-in fade-in duration-200">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{displaySuccess}</span>
                </div>
            )}

            {/* Timer and Resend */}
            <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                    {isVerifying ? (
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Verifying...
                        </span>
                    ) : isSending ? (
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending OTP...
                        </span>
                    ) : (
                        formatTime(resendTimer)
                    )}
                </span>
                <button
                    onClick={handleResend}
                    disabled={!canResend || isVerifying || isResending || isSending}
                    className={`text-sm font-medium transition-colors ${canResend && !isVerifying && !isResending && !isSending
                        ? 'text-gray-800 hover:text-[#E91E63] cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isResending ? 'Sending...' : 'Resend OTP'}
                </button>
            </div>
        </div>
    );
};

// Signup Method Button
interface SignupMethodButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

const SignupMethodButton: React.FC<SignupMethodButtonProps> = ({ icon, label, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full 
                   hover:border-[#E91E63] hover:bg-pink-50 transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700 bg-white"
    >
        {icon}
        <span>{label}</span>
    </button>
);

// Step Card (collapsed view)
interface StepCardProps {
    stepNumber: number;
    title: string;
    description: string;
    icon: React.ReactNode;
    isActive: boolean;
    isCompleted: boolean;
    onContinue?: () => void;
}

const StepCard: React.FC<StepCardProps> = ({
    stepNumber,
    title,
    description,
    icon,
    isActive,
    isCompleted,
    onContinue,
}) => (
    <div
        className={`rounded-xl transition-all duration-300 ${isCompleted
            ? 'bg-green-50/50 border border-green-200 p-4'
            : isActive
                ? 'bg-white border-2 border-gray-300 shadow-sm p-4'
                : 'bg-white/50 border border-gray-100 p-3'
            }`}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                            ? 'bg-[#1E1E1E] text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                >
                    {isCompleted ? '✓' : isActive ? stepNumber : <LockIcon />}
                </div>
                <div>
                    <p className={`text-xs ${isCompleted ? 'text-green-600' : isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                        Step {stepNumber}
                    </p>
                    <h3 className={`text-sm font-semibold ${isCompleted ? 'text-green-700' : isActive ? 'text-[#1E1E1E]' : 'text-gray-500'}`}>
                        {title}
                    </h3>
                    {!isActive && !isCompleted && (
                        <p className="text-xs text-gray-400">{description}</p>
                    )}
                    {isCompleted && (
                        <p className="text-xs text-green-600">Completed</p>
                    )}
                </div>
            </div>
            <div className={`shrink-0 ${!isActive && !isCompleted && 'opacity-40'}`}>{icon}</div>
        </div>
        {isActive && onContinue && (
            <div className="mt-3 ml-9">
                <button
                    onClick={onContinue}
                    className="px-5 py-2 text-sm font-medium text-white bg-[#1E1E1E] rounded-lg hover:bg-[#333] transition-colors"
                >
                    Continue
                </button>
            </div>
        )}
    </div>
);

// Progress bar for steps
const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
    <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i < current ? 'bg-[#E91E63]' : 'bg-gray-200'}`}
            />
        ))}
    </div>
);

// Main Component
const ArtistSignupView: React.FC = () => {
    const navigate = useNavigate();
    const { sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, isLoading, error, setUserType, updateUser, user } = useAuth();

    // Set user type to artist on mount
    useEffect(() => {
        setUserType('artist');
    }, [setUserType]);

    // Redirect completed artists to home (prevents stuck state)
    useEffect(() => {
        if (user && 'username' in user && (user as any).profile_completed) {
            navigate('/artist/home', { replace: true });
        }
    }, [user, navigate]);

    // State
    const [signupMethod, setSignupMethod] = useState<SignupMethod>(null);
    const [formStep, setFormStep] = useState<FormStep>('method-select');

    // Track which setup steps are completed (persisted in localStorage)
    const [setupSteps, setSetupSteps] = useState<{ step1: boolean; step2: boolean; step3: boolean; step4: boolean }>(() => {
        try {
            const saved = localStorage.getItem('artist_setup_steps');
            return saved ? JSON.parse(saved) : { step1: false, step2: false, step3: false, step4: false };
        } catch {
            return { step1: false, step2: false, step3: false, step4: false };
        }
    });

    // Persist setup step state
    useEffect(() => {
        localStorage.setItem('artist_setup_steps', JSON.stringify(setupSteps));
    }, [setupSteps]);
    const [subStep, setSubStep] = useState<number>(1); // 1: Basic, 2: Identity, 3: Professional, 4: Address
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpSending, setOtpSending] = useState(false);
    const [otpError, setOtpError] = useState<string>('');
    const [otpSuccess, setOtpSuccess] = useState<string>('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const profilePicInputRef = useRef<HTMLInputElement>(null);
    const { location: geoLocation, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();
    const [locationCaptured, setLocationCaptured] = useState(false);

    // Booking mode state (Step 2)
    const [bookingMode, setBookingMode] = useState<'instant' | 'flexi' | 'both' | ''>('');

    // Booking mode sub-step: 1 = mode selection, 2 = profession selection, 3 = event types & skills, 4 = service location, 5 = travel/studio details
    const [bookingModeSubStep, setBookingModeSubStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    // Selected professions (multi-select)
    const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);

    // Event types & skills (Sub-step 3)
    const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
    const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);

    // Service location (Sub-step 4)
    const [serviceLocation, setServiceLocation] = useState<'client' | 'studio' | 'both' | ''>('');

    // Travel willingness (Sub-step 5 - when client/both)
    const [travelWillingness, setTravelWillingness] = useState<string[]>([]);

    // Studio address (Sub-step 5 - when studio/both)
    const [studioAddress, setStudioAddress] = useState({
        shopNo: '',
        area: '',
        landmark: '',
        pincode: '',
        city: '',
        state: '',
    });

    // Working hours (Sub-step 5 - when studio/both)
    const [workingHours, setWorkingHours] = useState<{ period: string; startTime: string; endTime: string }[]>([]);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [timePeriodSelection, setTimePeriodSelection] = useState('');
    const [customStartTime, setCustomStartTime] = useState('');
    const [customEndTime, setCustomEndTime] = useState('');

    // Portfolio state (Step 3)
    const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
    const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const portfolioInputRef = useRef<HTMLInputElement>(null);

    // Bank Details state (Step 4)
    const [bankDetails, setBankDetails] = useState({
        accountHolderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        bankName: '',
        ifscCode: '',
        upiId: '',
    });

    // Event type options
    const eventTypeOptions = [
        'Wedding', 'Engagement', 'Shoot', 'Parties', 'Baby shower',
        'Haldi/Sangeet', 'Corporate events', 'Fashion shows', 'Others'
    ];

    // Skill suggestions based on profession
    const getSkillSuggestions = (): string[] => {
        const suggestions: string[] = [];
        if (selectedProfessions.includes('makeup')) {
            suggestions.push('HD Makeup', 'Airbrush Makeup', 'Party Makeup', 'Matte Finish', 'Dewy Finish', 'No-Makeup Look', 'Glam Look', 'Smokey Eyes', 'Bridal Eye Makeup', 'Cut Crease');
        }
        if (selectedProfessions.includes('hairstylist')) {
            suggestions.push('Bridal Hairstyling', 'Hair Extensions', 'Blow Dry', 'Updos', 'Braids', 'Hair Coloring');
        }
        if (selectedProfessions.includes('nail')) {
            suggestions.push('Gel Nails', 'Acrylic Nails', 'Nail Art', 'Manicure', 'Pedicure', 'French Tips');
        }
        if (selectedProfessions.includes('mehendi')) {
            suggestions.push('Bridal Mehendi', 'Arabic Mehendi', 'Indo-Arabic', 'Rajasthani', 'Minimalist Mehendi');
        }
        if (selectedProfessions.includes('saree-draping')) {
            suggestions.push('Bengali Style', 'Gujarati Style', 'Maharashtrian Style', 'South Indian Style', 'Lehenga Draping');
        }
        if (selectedProfessions.includes('saree-pleating')) {
            suggestions.push('Pre-pleated Saree', 'Party Draping', 'Designer Draping', 'Seedha Pallu', 'Ulta Pallu');
        }
        // Filter out already added skills
        return suggestions.filter(s => !skills.includes(s));
    };

    // Toggle event type selection
    const toggleEventType = (eventType: string) => {
        setSelectedEventTypes(prev =>
            prev.includes(eventType)
                ? prev.filter(e => e !== eventType)
                : [...prev, eventType]
        );
    };

    // Add a skill
    const addSkill = (skill: string) => {
        const trimmed = skill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills(prev => [...prev, trimmed]);
        }
        setSkillInput('');
    };

    // Remove a skill
    const removeSkill = (skill: string) => {
        setSkills(prev => prev.filter(s => s !== skill));
    };

    // Service location options
    const serviceLocationOptions = [
        { id: 'client' as const, label: "Client's Location", subtitle: 'I travel to the client', image: "/info/signup/client's.png" },
        { id: 'studio' as const, label: 'My Studio', subtitle: 'Client comes to me', image: '/info/signup/studio.png' },
        { id: 'both' as const, label: 'Both', subtitle: '', image: '/info/signup/boths.png' },
    ];

    // Travel willingness options
    const travelWillingnessOptions = [
        { id: 'within-city', label: 'Within my city', image: '/info/signup/city/within my city.png' },
        { id: 'within-region', label: 'Within my region', image: '/info/signup/city/with my region.png' },
        { id: 'nationwide', label: 'Nationwide', image: '/info/signup/city/nationwide.png' },
    ];

    // Toggle travel willingness
    const toggleTravelWillingness = (id: string) => {
        setTravelWillingness(prev =>
            prev.includes(id)
                ? prev.filter(t => t !== id)
                : [...prev, id]
        );
    };

    // Update studio address field
    const updateStudioAddress = (field: string, value: string) => {
        setStudioAddress(prev => ({ ...prev, [field]: value }));
    };

    // Time period presets
    const timePresets: { label: string; startTime: string; endTime: string }[] = [
        { label: 'Morning', startTime: '9am', endTime: '12pm' },
        { label: 'Afternoon', startTime: '1pm', endTime: '3pm' },
        { label: 'Evening', startTime: '5pm', endTime: '9pm' },
    ];

    // Add working hour
    const addWorkingHour = (period: string, startTime: string, endTime: string) => {
        // Don't add duplicates
        const exists = workingHours.some(wh => wh.period === period);
        if (!exists) {
            setWorkingHours(prev => [...prev, { period, startTime, endTime }]);
        }
    };

    // Remove working hour
    const removeWorkingHour = (period: string) => {
        setWorkingHours(prev => prev.filter(wh => wh.period !== period));
    };

    // Handle time picker done
    const handleTimePickerDone = () => {
        if (timePeriodSelection === 'Any time') {
            addWorkingHour('Any time', '12am', '12am');
        } else if (timePeriodSelection === 'Custom' && customStartTime && customEndTime) {
            addWorkingHour('Custom', customStartTime, customEndTime);
        } else {
            const preset = timePresets.find(tp => tp.label === timePeriodSelection);
            if (preset) {
                addWorkingHour(preset.label, preset.startTime, preset.endTime);
            }
        }
        setIsTimePickerOpen(false);
        setTimePeriodSelection('');
        setCustomStartTime('');
        setCustomEndTime('');
    };

    // Generate time options for custom dropdowns
    const timeOptions = [
        '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', '8am', '9am', '10am', '11am',
        '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
    ];

    // Profession options with images
    const professions = [
        { id: 'makeup', label: 'Makeup Artist', image: '/info/home/catagory section/mackup.png' },
        { id: 'hairstylist', label: 'Hairstylist', image: '/info/home/catagory section/hairstylist.png' },
        { id: 'nail', label: 'Nail Artist', image: '/info/home/catagory section/nail.png' },
        { id: 'saree-draping', label: 'Saree Draping', image: '/info/home/catagory section/saree daping.png' },
        { id: 'mehendi', label: 'Mehendi Artist', image: '/info/home/catagory section/mahendi.png' },
        { id: 'saree-pleating', label: 'Saree Pleating', image: '/info/home/catagory section/saree plating.png' },
    ];

    // Toggle profession selection
    const toggleProfession = (professionId: string) => {
        setSelectedProfessions(prev =>
            prev.includes(professionId)
                ? prev.filter(id => id !== professionId)
                : [...prev, professionId]
        );
    };

    // Ref for event dropdown click-outside
    const eventDropdownRef = React.useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        email: '',
        countryCode: '+91',
        phone: '',
        birthday: '',
        gender: '',
        experience: '',
        bio: '',
        otp: '',
        kycStatus: 'pending',
        profilePicUrl: '',
        faceVerified: false,
        howDidYouLearn: '',
        certificateUrl: '',
        address: {
            flatNo: '',
            street: '',
            landmark: '',
            pincode: '',
            city: '',
            state: '',
        },
    });

    // Ref for scrollable form container
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Initialize Lenis for the scrollable form section
    useEffect(() => {
        if (!scrollContainerRef.current || !contentRef.current) return;

        const lenis = new Lenis({
            wrapper: scrollContainerRef.current,
            content: contentRef.current,
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            syncTouch: true,
        });

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);

        return () => {
            lenis.destroy();
        };
    }, [formStep]);

    // Helper function to restore all state from artist profile data
    const restoreStateFromArtist = (artist: any) => {
        // Restore formData (profile details for preview)
        setFormData(prev => ({
            ...prev,
            fullName: artist.name || prev.fullName,
            email: artist.email || prev.email,
            phone: artist.phone_number?.replace(/^\+91/, '') || prev.phone,
            bio: artist.bio || prev.bio,
            gender: artist.gender || prev.gender,
            experience: artist.experience || prev.experience,
            profilePicUrl: artist.profile_pic_url || prev.profilePicUrl,
            howDidYouLearn: artist.how_did_you_learn || prev.howDidYouLearn,
            certificateUrl: artist.certificate_url || prev.certificateUrl,
            kycStatus: artist.kyc_verified ? 'verified' as const : prev.kycStatus,
            address: {
                flatNo: artist.flat_building || prev.address.flatNo,
                street: artist.street_area || prev.address.street,
                landmark: artist.landmark || prev.address.landmark,
                pincode: artist.pincode || prev.address.pincode,
                city: artist.city || prev.address.city,
                state: artist.state || prev.address.state,
            },
        }));

        // Restore booking mode state
        if (artist.booking_mode && !bookingMode) setBookingMode(artist.booking_mode);
        if (artist.profession?.length && selectedProfessions.length === 0) setSelectedProfessions(artist.profession);
        if (artist.event_types?.length && selectedEventTypes.length === 0) setSelectedEventTypes(artist.event_types);
        if (artist.skills?.length && skills.length === 0) setSkills(artist.skills);
        if (artist.service_location && !serviceLocation) setServiceLocation(artist.service_location);
        if (artist.travel_willingness?.length && travelWillingness.length === 0) setTravelWillingness(artist.travel_willingness);
        if (artist.studio_address) {
            try { setStudioAddress(JSON.parse(artist.studio_address)); } catch { /* ignore */ }
        }
        if (artist.working_hours) {
            try { setWorkingHours(JSON.parse(artist.working_hours)); } catch { /* ignore */ }
        }
        // Restore portfolio
        if (artist.portfolio?.length && portfolioImages.length === 0) {
            setPortfolioImages(artist.portfolio);
        }
        // Restore bank details
        if (artist.bank_account_name) {
            setBankDetails(prev => ({
                ...prev,
                accountHolderName: artist.bank_account_name || '',
                accountNumber: artist.bank_account_number || '',
                confirmAccountNumber: artist.bank_account_number || '',
                bankName: artist.bank_name || '',
                ifscCode: artist.bank_ifsc || '',
                upiId: artist.upi_id || '',
            }));
        }
    };

    // Fetch artist profile from backend as fallback
    const fetchAndRestoreProfile = async () => {
        try {
            const artist = await authService.getCurrentArtist();
            localStorage.setItem('user', JSON.stringify(artist));
            restoreStateFromArtist(artist);
            console.log('Fetched and restored artist profile from backend');
        } catch (error: any) {
            console.error('Failed to fetch artist profile:', error);
            toast.error('Failed to load profile data. Please refresh the page.');
        }
    };

    // Load saved progress from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('artist_signup_data');
        if (saved) {
            try {
                const progress = JSON.parse(saved);
                if (progress.formData) setFormData(progress.formData);
                if (progress.subStep) setSubStep(progress.subStep);
                if (progress.formStep) setFormStep(progress.formStep);
                if (progress.signupMethod) setSignupMethod(progress.signupMethod);
                if (progress.phoneVerified) setPhoneVerified(progress.phoneVerified);
                if (progress.emailVerified) setEmailVerified(progress.emailVerified);
                console.log('Loaded saved progress:', progress);
            } catch (e) {
                console.error('Failed to parse saved progress:', e);
            }
        }

        // ALWAYS restore from saved artist profile (backend source of truth)
        // This ensures preview data (name, pic, bio, skills, etc.) persists across all steps
        const savedUser = localStorage.getItem('user');
        const firebaseToken = localStorage.getItem('firebaseToken');

        if (savedUser) {
            try {
                const artist = JSON.parse(savedUser);
                restoreStateFromArtist(artist);
                console.log('Restored artist profile data from localStorage');
            } catch (error) {
                console.error('Failed to parse localStorage user, fetching from backend:', error);
                // localStorage corrupted, fetch from backend (only if authenticated)
                if (firebaseToken) {
                    fetchAndRestoreProfile();
                } else {
                    console.log('User not authenticated, skipping backend fetch');
                }
            }
        } else if (firebaseToken) {
            // No localStorage but user is authenticated → fetch from backend
            console.log('No localStorage user found but authenticated, fetching from backend');
            fetchAndRestoreProfile();
        } else {
            // New user, not authenticated yet → skip fetch (normal signup flow)
            console.log('New user signup flow, no profile to restore');
        }
    }, []);

    // Auto-fill address from localStorage('userAddress') if available
    useEffect(() => {
        if (subStep === 4) {
            const cachedAddr = localStorage.getItem('userAddress');
            if (cachedAddr) {
                try {
                    const addr = JSON.parse(cachedAddr);
                    setFormData(prev => ({
                        ...prev,
                        address: {
                            flatNo: addr.flat_building || prev.address.flatNo || '',
                            street: addr.street_area || prev.address.street || '',
                            landmark: addr.landmark || prev.address.landmark || '',
                            pincode: addr.pincode || prev.address.pincode || '',
                            city: addr.city || prev.address.city || '',
                            state: addr.state || prev.address.state || '',
                            location: prev.address.location,
                        },
                    }));
                    setLocationCaptured(true);
                } catch { /* ignore */ }
            }
        }
    }, [subStep]);

    // Reverse geocode: auto-fill address fields when location is captured
    useEffect(() => {
        if (!geoLocation) return;

        // Store lat/lng in form data
        setFormData(prev => ({
            ...prev,
            address: {
                ...prev.address,
                location: { lat: geoLocation.latitude, lng: geoLocation.longitude },
            },
        }));

        // Reverse geocode via backend proxy (calls Nominatim server-side, no CORS issues)
        const reverseGeocode = async () => {
            try {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await fetch(
                    `${baseUrl}/geocode/reverse?lat=${geoLocation.latitude}&lon=${geoLocation.longitude}`
                );
                if (!res.ok) return;
                const data = await res.json();
                const addr = data.address || {};

                setFormData(prev => ({
                    ...prev,
                    address: {
                        flatNo: prev.address.flatNo || '',
                        street: addr.road || addr.neighbourhood || addr.suburb || prev.address.street || '',
                        landmark: addr.neighbourhood || addr.suburb || prev.address.landmark || '',
                        pincode: addr.postcode || prev.address.pincode || '',
                        city: addr.city || addr.town || addr.village || addr.county || prev.address.city || '',
                        state: addr.state || prev.address.state || '',
                        location: { lat: geoLocation.latitude, lng: geoLocation.longitude },
                    },
                }));
                setLocationCaptured(true);
                toast.success('Address auto-filled from your location!');
            } catch (err) {
                console.error('Reverse geocoding failed:', err);
                // Still mark location as captured even if geocoding fails
                setLocationCaptured(true);
            }
        };

        reverseGeocode();
    }, [geoLocation]);

    const updateFormData = (updates: Partial<FormData>) => {
        setFormData(prev => ({ ...prev, ...updates }));
        // Mark fields as touched and validate
        Object.keys(updates).forEach(key => {
            setTouchedFields(prev => ({ ...prev, [key]: true }));
        });
    };

    // Validation state
    const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof FormData, boolean>>>({});

    // Validation functions
    const validateEmail = (email: string): string => {
        if (!email.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Please enter a valid email address';
        return '';
    };

    const validatePhone = (phone: string): string => {
        if (!phone.trim()) return 'Phone number is required';
        const cleanPhone = phone.replace(/\s/g, '');
        if (!/^\d{10}$/.test(cleanPhone)) return 'Phone number must be 10 digits';
        return '';
    };

    const validateBirthday = (birthday: string): string => {
        if (!birthday.trim()) return 'Birthday is required';
        // Check format DD/MM/YYYY
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = birthday.match(dateRegex);
        if (!match) return 'Use format: DD/MM/YYYY';

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (month < 1 || month > 12) return 'Invalid month';
        if (day < 1 || day > 31) return 'Invalid day';

        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const isUnder18 = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())));

        if (isUnder18) return 'You must be at least 18 years old';
        if (birthDate > today) return 'Birthday cannot be in the future';

        return '';
    };

    const validateFullName = (name: string): string => {
        if (!name.trim()) return 'Full name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name should only contain letters';
        return '';
    };

    const validateGender = (gender: string): string => {
        if (!gender) return 'Please select your gender';
        return '';
    };

    const validateExperience = (experience: string): string => {
        if (!experience) return 'Please select your experience level';
        return '';
    };

    const validateBio = (bio: string): string => {
        if (!bio.trim()) return 'Bio is required';
        if (bio.length < 20) return 'Bio must be at least 20 characters';
        if (bio.length > 500) return 'Bio cannot exceed 500 characters';
        return '';
    };

    // Get field errors (only show if touched)
    const getFieldError = (field: keyof FormData): string => {
        if (!touchedFields[field]) return '';

        switch (field) {
            case 'fullName': return validateFullName(formData.fullName);
            case 'email': return validateEmail(formData.email);
            case 'phone': return validatePhone(formData.phone);
            case 'birthday': return validateBirthday(formData.birthday);
            case 'gender': return validateGender(formData.gender);
            case 'experience': return validateExperience(formData.experience);
            case 'bio': return validateBio(formData.bio);
            default: return '';
        }
    };

    // Check if form is valid (for disabling submit button) - based on current substep
    const isFormValid = (): boolean => {
        switch (subStep) {
            case 1: // Basic Information
                const basicInfoValid =
                    !validateFullName(formData.fullName) &&
                    !validateEmail(formData.email) &&
                    !validatePhone(formData.phone) &&
                    !validateBirthday(formData.birthday) &&
                    !validateGender(formData.gender) &&
                    !validateExperience(formData.experience) &&
                    !validateBio(formData.bio);

                // Also check verification status based on signup method
                if (signupMethod === 'phone' && !phoneVerified) return false;
                if (signupMethod === 'email' && !emailVerified) return false;

                return basicInfoValid;

            case 2: // Identity Verification
                // For now, allow proceeding (KYC and profile pic are optional for demo)
                return true;

            case 3: // Professional Info
                // Must select an option
                if (!formData.howDidYouLearn) return false;
                // If Professional Training, certificate is mandatory
                if (formData.howDidYouLearn === 'professional' && !formData.certificateUrl) return false;
                return true;

            case 4: // Address Details
                // Basic address validation
                return formData.address.street.trim().length > 0 &&
                    formData.address.city.trim().length > 0 &&
                    formData.address.pincode.trim().length >= 5;

            default:
                return false;
        }
    };

    // Handlers
    const handlePhoneSignup = () => {
        setSignupMethod('phone');
        setFormStep('details-form');
    };

    const handleEmailSignup = () => {
        setSignupMethod('email');
        setFormStep('details-form');
    };

    const handleGoogleSignup = async () => {
        setSignupMethod('google');
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            const result = await signInWithPopup(firebaseAuth, provider);
            const user = result.user;
            const token = await user.getIdToken();

            // Store Firebase token for later backend call on final submit
            localStorage.setItem('firebaseToken', token);

            // Auto-fill name and email from Google account
            setFormData(prev => ({
                ...prev,
                fullName: user.displayName || prev.fullName,
                email: user.email || prev.email,
                profilePicUrl: user.photoURL || prev.profilePicUrl,
            }));

            // Mark email as verified (Google already verified it)
            setEmailVerified(true);

            // Go to registration form - DON'T call backend yet
            setFormStep('details-form');

            toast.success('Google account connected! Please complete your profile.');
        } catch (err: any) {
            if (err.code === 'auth/popup-closed-by-user') {
                toast.error('Sign-in cancelled');
            } else if (err.code === 'auth/popup-blocked') {
                toast.error('Popup blocked. Please allow popups for this site.');
            } else {
                toast.error(err.message || 'Failed to sign in with Google');
            }
        }
    };

    // File upload handlers (Direct Firebase Storage Upload)
    const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        setOtpError('');

        try {
            const url = await uploadProfilePicture(file, {
                onProgress: (progress) => console.log(`Upload: ${Math.round(progress)}%`),
                onError: (error) => {
                    setOtpError(error);
                    toast.error(error);
                },
                onSuccess: () => toast.success('Profile picture uploaded!')
            });

            setFormData(prev => ({ ...prev, profilePicUrl: url }));
        } catch (error: any) {
            const friendlyError = getErrorMessage(error);
            setOtpError(friendlyError);
            toast.error(friendlyError);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleCertificateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        setOtpError('');

        try {
            const url = await uploadCertificate(file, {
                onProgress: (progress) => console.log(`Upload: ${Math.round(progress)}%`),
                onError: (error) => {
                    setOtpError(error);
                    toast.error(error);
                },
                onSuccess: () => toast.success('Certificate uploaded!')
            });

            setFormData(prev => ({ ...prev, certificateUrl: url }));
        } catch (error: any) {
            const friendlyError = getErrorMessage(error);
            setOtpError(friendlyError);
            toast.error(friendlyError);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleSendPhoneOTP = async () => {
        setOtpSending(true);
        setOtpError('');
        setOtpSuccess('');
        try {
            const fullPhone = `${formData.countryCode}${formData.phone}`;

            // Check if user exists
            const { exists, user_type: existingType } = await authService.checkUserExists(fullPhone, 'phone', 'artist');

            if (exists && existingType === 'artist') {
                throw new Error('Account already exists. Please login instead.');
            }

            if (exists && existingType === 'customer') {
                toast.info('We found your customer account! Proceeding to create your artist profile.');
            }

            await sendPhoneOTP(fullPhone);
            setOtpSent(true);
            setOtpSuccess('OTP sent to your phone!');
            setTimeout(() => setOtpSuccess(''), 3000);
        } catch (err) {
            setOtpError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyPhoneOTP = async () => {
        setOtpError('');
        setOtpSuccess('');
        try {
            // Use AuthContext's verifyPhoneOTP but DON'T let it redirect
            // We need Firebase confirmation first, then call backend
            if (!formData.otp || formData.otp.length < 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }
            await verifyPhoneOTP(formData.otp, formData.fullName);
            setPhoneVerified(true);
            setOtpSent(false);
            updateFormData({ otp: '' });
            setOtpSuccess('Phone verified successfully!');
        } catch (err) {
            setOtpError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
            updateFormData({ otp: '' }); // Clear OTP on error
        }
    };

    const handleSendEmailOTP = async () => {
        setOtpSending(true);
        setOtpError('');
        setOtpSuccess('');
        try {
            // Check if user exists
            const { exists, user_type: existingType } = await authService.checkUserExists(formData.email, 'email', 'artist');

            if (exists && existingType === 'artist') {
                throw new Error('Account already exists. Please login instead.');
            }

            if (exists && existingType === 'customer') {
                toast.info('We found your customer account! Proceeding to create your artist profile.');
            }

            await sendEmailOTP(formData.email, formData.fullName || 'User');
            setOtpSent(true);
            setOtpSuccess('OTP sent to your email!');
            setTimeout(() => setOtpSuccess(''), 3000);
        } catch (err) {
            setOtpError(err instanceof Error ? err.message : 'Failed to send OTP. Please try again.');
        } finally {
            setOtpSending(false);
        }
    };

    const handleVerifyEmailOTP = async () => {
        setOtpError('');
        setOtpSuccess('');
        try {
            // Call authService DIRECTLY instead of AuthContext's verifyEmailOTP
            // This prevents completeAuth from firing and redirecting to /home
            const user = await authService.verifyEmailOTP(
                { email: formData.email, otp: formData.otp },
                'artist'
            );

            // Store the firebase token for later profile completion
            if (user.token) {
                localStorage.setItem('firebaseToken', user.token);
            }

            setEmailVerified(true);
            setOtpSent(false);
            updateFormData({ otp: '' });
            setOtpSuccess('Email verified successfully!');
        } catch (err) {
            setOtpError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.');
            updateFormData({ otp: '' }); // Clear OTP on error
        }
    };

    const handleBack = () => {
        if (subStep > 1) {
            setSubStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (formStep === 'details-form' || formStep === 'otp-verify') {
            setFormStep('method-select');
            setSignupMethod(null);
            setOtpSent(false);
        } else {
            navigate('/auth/artist/login');
        }
    };

    const handleSaveAndContinue = async () => {
        setIsSaving(true);
        try {
            if (subStep < 4) {
                // Save progress to localStorage and move to next step
                const progress = {
                    formData,
                    subStep: subStep + 1,
                    formStep,
                    signupMethod,
                    phoneVerified,
                    emailVerified
                };
                localStorage.setItem('artist_signup_data', JSON.stringify(progress));
                setSubStep(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Final step - submit complete profile to backend
                const profileData = {
                    name: formData.fullName,
                    phone_number: `${formData.countryCode}${formData.phone.replace(/\s/g, '')}`,
                    birthdate: formData.birthday,  // DD/MM/YYYY
                    gender: formData.gender,
                    experience: formData.experience,
                    bio: formData.bio,
                    profile_pic_url: formData.profilePicUrl,
                    how_did_you_learn: formData.howDidYouLearn,
                    certificate_url: formData.certificateUrl,
                    flat_building: formData.address.flatNo,
                    street_area: formData.address.street,
                    landmark: formData.address.landmark,
                    pincode: formData.address.pincode,
                    city: formData.address.city,
                    state: formData.address.state,
                    latitude: formData.address.location?.lat,
                    longitude: formData.address.location?.lng,
                };

                // For Google OAuth signup: first register the artist in backend
                if (signupMethod === 'google') {
                    const firebaseToken = localStorage.getItem('firebaseToken');
                    if (!firebaseToken) {
                        throw new Error('Session expired. Please sign up again.');
                    }
                    // Create artist in backend with mode=signup
                    await authService.authenticateWithOAuth(firebaseToken, 'artist', 'signup');
                }

                // Call profile completion endpoint (don't mark complete — only Step 1)
                const updatedArtist = await authService.completeArtistProfile({
                    ...profileData,
                    mark_complete: false,
                });

                // Update user in localStorage
                localStorage.setItem('user', JSON.stringify(updatedArtist));

                // Mark Step 1 as completed
                setSetupSteps(prev => {
                    const next = { ...prev, step1: true };
                    localStorage.setItem('artist_setup_steps', JSON.stringify(next));
                    return next;
                });

                // Clear saved signup progress (form data for step 1)
                localStorage.removeItem('artist_signup_data');

                toast.success('Personal details saved!');
                setShowSuccess(true);
            }
        } catch (error: any) {
            console.error('Error saving progress:', error);
            toast.error(error.message || 'Failed to save profile. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = () => {
        setFormData({
            fullName: '',
            email: '',
            countryCode: '+91',
            phone: '',
            birthday: '',
            gender: '',
            experience: '',
            bio: '',
            otp: '',
            kycStatus: 'pending',
            profilePicUrl: '',
            faceVerified: false,
            howDidYouLearn: '',
            certificateUrl: '',
            address: {
                flatNo: '',
                street: '',
                landmark: '',
                pincode: '',
                city: '',
                state: '',
            },
        });
        setPhoneVerified(false);
        setEmailVerified(false);
        localStorage.removeItem('artist_signup_data');
    };


    // Handle profile picture removal
    const handleRemoveProfilePic = () => {
        updateFormData({ profilePicUrl: '' });
        if (profilePicInputRef.current) {
            profilePicInputRef.current.value = '';
        }
    };

    // Determine the next active step
    const getActiveStep = (): number => {
        if (!setupSteps.step1) return 1;
        if (!setupSteps.step2) return 2;
        if (!setupSteps.step3) return 3;
        if (!setupSteps.step4) return 4;
        return 0; // All done
    };

    const activeStep = getActiveStep();

    // Handle "Continue" on step cards
    const handleStepContinue = (step: number) => {
        if (step === 2) {
            setFormStep('booking-modes');
        } else if (step === 3) {
            setFormStep('portfolio');
        } else if (step === 4) {
            setFormStep('bank-details');
        }
    };

    // Handle booking mode step navigation
    const handleBookingModeNext = () => {
        if (bookingModeSubStep === 1) {
            if (!bookingMode) {
                toast.error('Please select a booking mode');
                return;
            }
            setBookingModeSubStep(2);
        } else if (bookingModeSubStep === 2) {
            if (selectedProfessions.length === 0) {
                toast.error('Please select at least one specialization');
                return;
            }
            setBookingModeSubStep(3);
        } else if (bookingModeSubStep === 3) {
            if (selectedEventTypes.length === 0) {
                toast.error('Please select at least one event type');
                return;
            }
            if (skills.length === 0) {
                toast.error('Please add at least one skill');
                return;
            }
            setBookingModeSubStep(4);
        } else if (bookingModeSubStep === 4) {
            if (!serviceLocation) {
                toast.error('Please select where you provide services');
                return;
            }
            setBookingModeSubStep(5);
        } else if (bookingModeSubStep === 5) {
            // Validate based on service location
            if (serviceLocation === 'client' || serviceLocation === 'both') {
                if (travelWillingness.length === 0) {
                    toast.error('Please select your travel willingness');
                    return;
                }
            }
            if (serviceLocation === 'studio' || serviceLocation === 'both') {
                if (!studioAddress.area || !studioAddress.pincode || !studioAddress.city || !studioAddress.state) {
                    toast.error('Please fill in the required studio address fields');
                    return;
                }
            }
            handleBookingModeSave();
        }
    };

    const handleBookingModeSave = async () => {
        try {
            // Build payload for backend
            const bookingData: Parameters<typeof authService.completeArtistProfile>[0] = {
                booking_mode: bookingMode,
                profession: selectedProfessions,
                skills: skills,
                event_types: selectedEventTypes,
                service_location: serviceLocation,
                travel_willingness: travelWillingness,
                studio_address: (serviceLocation === 'studio' || serviceLocation === 'both')
                    ? JSON.stringify(studioAddress) : undefined,
                working_hours: workingHours.length > 0
                    ? JSON.stringify(workingHours) : undefined,
                mark_complete: false,
            };

            // Sync to backend
            const updatedArtist = await authService.completeArtistProfile(bookingData);
            localStorage.setItem('user', JSON.stringify(updatedArtist));

            // Also keep localStorage copies for quick restore
            localStorage.setItem('artist_booking_mode', bookingMode);
            localStorage.setItem('artist_professions', JSON.stringify(selectedProfessions));
            localStorage.setItem('artist_event_types', JSON.stringify(selectedEventTypes));
            localStorage.setItem('artist_skills', JSON.stringify(skills));
            localStorage.setItem('artist_service_location', serviceLocation);
            localStorage.setItem('artist_travel_willingness', JSON.stringify(travelWillingness));
            localStorage.setItem('artist_studio_address', JSON.stringify(studioAddress));
            localStorage.setItem('artist_working_hours', JSON.stringify(workingHours));

            // Mark Step 2 as completed
            setSetupSteps(prev => {
                const next = { ...prev, step2: true };
                localStorage.setItem('artist_setup_steps', JSON.stringify(next));
                return next;
            });

            toast.success('Booking mode saved!');
            setShowSuccess(true);
        } catch (error: any) {
            console.error('Error saving booking mode:', error);
            toast.error(error.message || 'Failed to save booking mode. Please try again.');
        }
    };

    const handleBookingModeBack = () => {
        if (bookingModeSubStep === 5) {
            setBookingModeSubStep(4);
        } else if (bookingModeSubStep === 4) {
            setBookingModeSubStep(3);
        } else if (bookingModeSubStep === 3) {
            setBookingModeSubStep(2);
        } else if (bookingModeSubStep === 2) {
            setBookingModeSubStep(1);
        } else {
            setFormStep('method-select');
        }
    };

    // ========================
    // PORTFOLIO HANDLERS (Step 3)
    // ========================

    const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const remaining = 10 - portfolioImages.length;
        if (remaining <= 0) {
            toast.error('Maximum 10 photos allowed');
            return;
        }

        const filesToUpload = Array.from(files).slice(0, remaining);
        setIsUploadingPortfolio(true);

        try {
            const uploadPromises = filesToUpload.map(file =>
                uploadPortfolioImage(file)
            );
            const urls = await Promise.all(uploadPromises);
            setPortfolioImages(prev => [...prev, ...urls]);
            toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded!`);
        } catch (error: any) {
            console.error('Portfolio upload error:', error);
            toast.error('Failed to upload some photos. Please try again.');
        } finally {
            setIsUploadingPortfolio(false);
            // Reset the input
            if (portfolioInputRef.current) {
                portfolioInputRef.current.value = '';
            }
        }
    };

    const handlePortfolioDelete = (index: number) => {
        setPortfolioImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePortfolioDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handlePortfolioDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        setPortfolioImages(prev => {
            const newImages = [...prev];
            const draggedImage = newImages[draggedIndex];
            newImages.splice(draggedIndex, 1);
            newImages.splice(index, 0, draggedImage);
            return newImages;
        });
        setDraggedIndex(index);
    };

    const handlePortfolioDragEnd = () => {
        setDraggedIndex(null);
    };

    const handlePortfolioSave = async () => {
        if (portfolioImages.length === 0) {
            toast.error('Please upload at least one photo');
            return;
        }

        try {
            const updatedArtist = await authService.completeArtistProfile({
                portfolio: portfolioImages,
                mark_complete: false,
            });
            localStorage.setItem('user', JSON.stringify(updatedArtist));

            setSetupSteps(prev => {
                const next = { ...prev, step3: true };
                localStorage.setItem('artist_setup_steps', JSON.stringify(next));
                return next;
            });

            toast.success('Portfolio saved!');
            setShowSuccess(true);
        } catch (error: any) {
            console.error('Error saving portfolio:', error);
            toast.error(error.message || 'Failed to save portfolio. Please try again.');
        }
    };

    // ========================
    // BANK DETAILS HANDLERS (Step 4)
    // ========================

    const handleBankFieldChange = (field: keyof typeof bankDetails, value: string) => {
        setBankDetails(prev => ({ ...prev, [field]: value }));
    };

    const handleBankClear = () => {
        setBankDetails({
            accountHolderName: '',
            accountNumber: '',
            confirmAccountNumber: '',
            bankName: '',
            ifscCode: '',
            upiId: '',
        });
    };

    const bankAccountMatch = bankDetails.accountNumber.length > 0 &&
        bankDetails.confirmAccountNumber.length > 0 &&
        bankDetails.accountNumber === bankDetails.confirmAccountNumber;

    const upiValid = bankDetails.upiId.length > 0 && /^[\w.-]+@[\w]+$/.test(bankDetails.upiId);

    const bankFilledCount = [
        bankDetails.accountHolderName,
        bankDetails.accountNumber,
        bankDetails.confirmAccountNumber,
        bankDetails.bankName,
        bankDetails.ifscCode,
    ].filter(v => v.length > 0).length;

    const bankProgress = bankFilledCount / 5;

    const canSubmitBank = bankDetails.accountHolderName.length > 0 &&
        bankAccountMatch &&
        bankDetails.bankName.length > 0 &&
        bankDetails.ifscCode.length > 0;

    const handleBankSave = async () => {
        if (!canSubmitBank && !upiValid) {
            toast.error('Please fill in all required fields or provide a valid UPI ID');
            return;
        }

        try {
            const updatedArtist = await authService.completeArtistProfile({
                bank_account_name: bankDetails.accountHolderName || undefined,
                bank_account_number: bankDetails.accountNumber || undefined,
                bank_name: bankDetails.bankName || undefined,
                bank_ifsc: bankDetails.ifscCode || undefined,
                upi_id: bankDetails.upiId || undefined,
                mark_complete: true,  // Mark profile as complete (all 4 steps done)
            });
            // Update both localStorage AND AuthContext in-memory state
            // so ProfileCompletionGuard sees profile_completed: true
            updateUser(updatedArtist);

            setSetupSteps(prev => {
                const next = { ...prev, step4: true };
                localStorage.setItem('artist_setup_steps', JSON.stringify(next));
                return next;
            });

            toast.success('Profile completed!');
            setShowSuccess(true);

            // Redirect to artist home after success animation
            setTimeout(() => {
                navigate('/artist/home');
            }, 2000);
        } catch (error: any) {
            console.error('Error saving bank details:', error);
            toast.error(error.message || 'Failed to save bank details. Please try again.');
        }
    };

    // ========================
    // RENDER: Portfolio Form (Step 3)
    // ========================

    const renderPortfolioForm = () => (
        <div className="h-screen bg-white flex overflow-hidden">
            {/* Left side - Form (70%) */}
            <div className="w-[70%] pl-14 py-6 flex flex-col h-full">
                <div className="w-[90%] flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setFormStep('method-select')} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                                <BackArrowIcon />
                            </button>
                            <h1 className="text-xl font-semibold">Portfolio</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {portfolioImages.length > 1 && (
                                <button
                                    onClick={() => toast.info('Drag photos to reorder them')}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Reorder
                                </button>
                            )}
                            <button
                                onClick={handlePortfolioSave}
                                disabled={portfolioImages.length === 0}
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${portfolioImages.length > 0
                                    ? 'bg-gray-900 hover:bg-gray-800'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Upload area */}
                    <div className="flex-1 overflow-y-auto pr-4">
                        <input
                            ref={portfolioInputRef}
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={handlePortfolioUpload}
                            className="hidden"
                        />

                        {portfolioImages.length === 0 && !isUploadingPortfolio ? (
                            /* Empty state */
                            <div
                                onClick={() => portfolioInputRef.current?.click()}
                                className="flex flex-col items-center justify-center py-32 cursor-pointer hover:bg-gray-50 rounded-2xl transition-colors"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
                                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                                        <rect x="3" y="3" width="7" height="7" rx="1" />
                                        <rect x="14" y="3" width="7" height="7" rx="1" />
                                        <rect x="3" y="14" width="7" height="7" rx="1" />
                                        <rect x="14" y="14" width="7" height="7" rx="1" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Upload up to 10 photos</h3>
                                <p className="text-sm text-gray-500">Minimum recommended is 5. JPEG, PNG, PDF up to 2 MB.</p>
                            </div>
                        ) : (
                            /* Photo grid */
                            <div>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {portfolioImages.map((url, index) => (
                                        <div
                                            key={index}
                                            draggable
                                            onDragStart={() => handlePortfolioDragStart(index)}
                                            onDragOver={(e) => handlePortfolioDragOver(e, index)}
                                            onDragEnd={handlePortfolioDragEnd}
                                            className={`relative group aspect-4/5 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-all ${draggedIndex === index ? 'border-pink-400 opacity-60 scale-95' : 'border-transparent'
                                                }`}
                                        >
                                            <img
                                                src={url}
                                                alt={`Portfolio ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Delete overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePortfolioDelete(index); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                                                        <path d="M18 6L6 18M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add more button */}
                                    {portfolioImages.length < 10 && (
                                        <div
                                            onClick={() => portfolioInputRef.current?.click()}
                                            className="aspect-4/5 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors"
                                        >
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 mb-1">
                                                <path d="M12 5v14M5 12h14" />
                                            </svg>
                                            <span className="text-xs text-gray-500">Add more</span>
                                        </div>
                                    )}
                                </div>

                                {/* Upload progress */}
                                {isUploadingPortfolio && (
                                    <div className="flex items-center gap-3 py-3 px-4 bg-pink-50 rounded-xl">
                                        <div className="w-5 h-5 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-pink-700">Uploading photos...</span>
                                    </div>
                                )}

                                <p className="text-xs text-gray-400 mt-2">
                                    {portfolioImages.length}/10 photos • Drag to reorder
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side - Profile Preview (30%) */}
            <div className="w-[30%] border-l border-gray-200 hidden lg:block">
                <div className="h-10 bg-linear-to-b from-pink-100 to-white"></div>
                <div className="p-6">
                    <ArtistProfilePreview
                        name={formData.fullName}
                        profilePicUrl={formData.profilePicUrl}
                        profession={selectedProfessions.map(id => professions.find(p => p.id === id)?.label || '').filter(Boolean)}
                        bio={formData.bio}
                        kycVerified={formData.kycStatus === 'verified'}
                        certificateUrl={formData.certificateUrl}
                        city={formData.address.city}
                        state={formData.address.state}
                        street={formData.address.street}
                        skills={skills}
                    />
                </div>
            </div>
        </div>
    );

    // ========================
    // RENDER: Bank Details Form (Step 4)
    // ========================

    const renderBankDetailsForm = () => (
        <div className="h-screen bg-white flex overflow-hidden">
            {/* Left side - Form (70%) */}
            <div className="w-[70%] pl-14 py-6 flex flex-col h-full">
                <div className="w-[90%] flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setFormStep('method-select')} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                                <BackArrowIcon />
                            </button>
                            <h1 className="text-xl font-semibold">Bank details</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleBankClear}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleBankSave}
                                disabled={!canSubmitBank && !upiValid}
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${(canSubmitBank || upiValid)
                                    ? 'bg-gray-900 hover:bg-gray-800'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-[60%] h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-pink-300 to-pink-500 rounded-full transition-all duration-500"
                            style={{ width: `${bankProgress * 100}%` }}
                        />
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto pr-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Add your bank details</h2>

                        <div className="space-y-5 max-w-md">
                            {/* Account holder name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Account holder name</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountHolderName}
                                    onChange={(e) => handleBankFieldChange('accountHolderName', e.target.value)}
                                    placeholder="Eg. Naveen Kumar"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-400"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Add your name as per in the bank account</p>
                            </div>

                            {/* Account number */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Account number / IBAN</label>
                                <input
                                    type="text"
                                    value={bankDetails.accountNumber}
                                    onChange={(e) => handleBankFieldChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                                    placeholder="Eg. 50100466215966"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-400"
                                />
                            </div>

                            {/* Confirm account number */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Re-enter your Account number / IBAN</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={bankDetails.confirmAccountNumber}
                                        onChange={(e) => handleBankFieldChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Eg. 50100466215966"
                                        className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 bg-white focus:outline-none transition-colors placeholder:text-gray-400 ${bankAccountMatch ? 'border-green-400' : 'border-gray-300 focus:border-gray-500'
                                            }`}
                                    />
                                    {bankAccountMatch && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                                                <circle cx="12" cy="12" r="10" fill="currentColor" />
                                                <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-xs font-medium text-green-600">Verified</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bank Name */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Bank Name</label>
                                <input
                                    type="text"
                                    value={bankDetails.bankName}
                                    onChange={(e) => handleBankFieldChange('bankName', e.target.value)}
                                    placeholder="Eg. HDFC"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-400"
                                />
                            </div>

                            {/* IFSC Code */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">IFSC Code</label>
                                <input
                                    type="text"
                                    value={bankDetails.ifscCode}
                                    onChange={(e) => handleBankFieldChange('ifscCode', e.target.value.toUpperCase())}
                                    placeholder="Eg. HDFC0002034"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-500 transition-colors placeholder:text-gray-400"
                                />
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs text-gray-400 font-medium">Or</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {/* UPI ID */}
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">UPI ID</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={bankDetails.upiId}
                                        onChange={(e) => handleBankFieldChange('upiId', e.target.value)}
                                        placeholder="Eg. admin-1@okhdfcbank"
                                        className={`w-full px-4 py-3 border rounded-xl text-sm text-gray-900 bg-white focus:outline-none transition-colors placeholder:text-gray-400 ${upiValid ? 'border-green-400' : 'border-gray-300 focus:border-gray-500'
                                            }`}
                                    />
                                    {upiValid && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                                                <circle cx="12" cy="12" r="10" fill="currentColor" />
                                                <path d="M8 12l2.5 2.5L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="text-xs font-medium text-green-600">Verified</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Profile Preview (30%) */}
            <div className="w-[30%] border-l border-gray-200 hidden lg:block">
                <div className="h-10 bg-linear-to-b from-pink-100 to-white"></div>
                <div className="p-6">
                    <ArtistProfilePreview
                        name={formData.fullName}
                        profilePicUrl={formData.profilePicUrl}
                        profession={selectedProfessions.map(id => professions.find(p => p.id === id)?.label || '').filter(Boolean)}
                        bio={formData.bio}
                        kycVerified={formData.kycStatus === 'verified'}
                        certificateUrl={formData.certificateUrl}
                        city={formData.address.city}
                        state={formData.address.state}
                        street={formData.address.street}
                        skills={skills}
                        portfolioImages={portfolioImages}
                    />
                </div>
            </div>
        </div>
    );

    // Render booking modes form (Step 2)
    const renderBookingModesForm = () => (
        <div className="h-screen bg-white flex overflow-hidden">
            {/* Left side - Form (70%) */}
            <div className="w-[70%] pl-14 py-6 flex flex-col h-full">
                <div className="w-[90%] flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBookingModeBack} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                                <BackArrowIcon />
                            </button>
                            <h1 className="text-xl font-semibold">Booking modes</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {bookingModeSubStep === 5 && (
                                <button
                                    onClick={() => {
                                        setFormStep('method-select');
                                    }}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                            <button
                                onClick={handleBookingModeNext}
                                disabled={
                                    (bookingModeSubStep === 1 && !bookingMode) ||
                                    (bookingModeSubStep === 2 && selectedProfessions.length === 0) ||
                                    (bookingModeSubStep === 3 && (selectedEventTypes.length === 0 || skills.length === 0)) ||
                                    (bookingModeSubStep === 4 && !serviceLocation)
                                }
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${((bookingModeSubStep === 1 && bookingMode) ||
                                    (bookingModeSubStep === 2 && selectedProfessions.length > 0) ||
                                    (bookingModeSubStep === 3 && selectedEventTypes.length > 0 && skills.length > 0) ||
                                    (bookingModeSubStep === 4 && serviceLocation) ||
                                    bookingModeSubStep === 5)
                                    ? 'bg-gray-700 hover:bg-gray-800'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {bookingModeSubStep === 5 ? 'Submit' : bookingModeSubStep === 4 ? 'Save & continue' : 'Next'}
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-6 shrink-0">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-pink-500 rounded-full transition-all duration-300"
                                style={{ width: `${bookingModeSubStep * 20}%` }}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>Booking modes</span>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto pr-4" data-lenis-prevent>
                        {bookingModeSubStep === 1 ? (
                            <>
                                <h2 className="text-2xl font-semibold mb-6">Choose your booking mode</h2>

                                {/* Booking mode options - Bento Grid */}
                                <div className="flex flex-wrap gap-6 px-4 mb-4">
                                    {/* Instant Booking */}
                                    <button
                                        onClick={() => setBookingMode('instant')}
                                        className={`relative rounded-2xl border-2 p-5 text-left transition-all w-[220px] h-[220px] flex flex-col justify-between overflow-hidden group ${bookingMode === 'instant'
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start w-full z-10">
                                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">Instant Booking</h3>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${bookingMode === 'instant' ? 'border-gray-900' : 'border-gray-300'
                                                }`}>
                                                {bookingMode === 'instant' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-36 transition-transform group-hover:scale-105 duration-300">
                                            <img src="/info/signup/instant.png" alt="Instant Booking" className="w-full h-auto object-contain" />
                                        </div>
                                    </button>

                                    {/* Flexi Booking */}
                                    <button
                                        onClick={() => setBookingMode('flexi')}
                                        className={`relative rounded-2xl border-2 p-5 text-left transition-all w-[220px] h-[220px] flex flex-col justify-between overflow-hidden group ${bookingMode === 'flexi'
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start w-full z-10">
                                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">Flexi Booking</h3>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${bookingMode === 'flexi' ? 'border-gray-900' : 'border-gray-300'
                                                }`}>
                                                {bookingMode === 'flexi' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-36 transition-transform group-hover:scale-105 duration-300">
                                            <img src="/info/signup/flexi.png" alt="Flexi Booking" className="w-full h-auto object-contain" />
                                        </div>
                                    </button>

                                    {/* Both */}
                                    <button
                                        onClick={() => setBookingMode('both')}
                                        className={`relative rounded-2xl border-2 p-5 text-left transition-all w-[220px] h-[220px] flex flex-col justify-between overflow-hidden group ${bookingMode === 'both'
                                            ? 'border-gray-900 bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start w-full z-10">
                                            <h3 className="font-semibold text-lg text-gray-900 leading-tight">Both</h3>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${bookingMode === 'both' ? 'border-gray-900' : 'border-gray-300'
                                                }`}>
                                                {bookingMode === 'both' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-48 transition-transform group-hover:scale-105 duration-300">
                                            <img src="/info/signup/both.png" alt="Both" className="w-full h-auto object-contain" />
                                        </div>
                                    </button>
                                </div>


                                {/* Descriptions */}
                                <div className="space-y-3 text-sm text-gray-600 mt-8">
                                    <div>
                                        <span className="font-semibold text-gray-900">Instant Booking:</span>
                                        <br />
                                        Get booked right away for quick beauty needs. Example: touch-ups, simple makeup, etc.
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-900">Flexi Booking:</span>
                                        <br />
                                        Bigger events that needs bigger planning. Example: weddings, bridal, etc.
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-900">Both:</span>
                                        <br />
                                        You are ready to slay both the above.
                                    </div>
                                </div>
                            </>
                        ) : bookingModeSubStep === 2 ? (
                            <>
                                {/* Profession Selection */}
                                <h2 className="text-3xl font-semibold text-[#1E1E1E] mb-2">What do you specialize in ?</h2>
                                <p className="text-sm text-gray-500 mb-8">Choose all that apply</p>

                                {/* Profession Cards Grid */}
                                <div className="grid grid-cols-2 gap-5 max-w-lg">
                                    {professions.map((profession) => {
                                        const isSelected = selectedProfessions.includes(profession.id);
                                        return (
                                            <button
                                                key={profession.id}
                                                onClick={() => toggleProfession(profession.id)}
                                                className={`relative rounded-xl border-2 w-52 h-48 text-left transition-all hover:shadow-md overflow-hidden ${isSelected
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {/* Top row: Checkbox + Label */}
                                                <div className="flex items-center gap-2 px-3.5 pt-3.5">
                                                    <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected
                                                        ? 'bg-gray-900 border-gray-900'
                                                        : 'bg-white border-gray-300'
                                                        }`}>
                                                        {isSelected && (
                                                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                                                <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-semibold text-gray-900">{profession.label}</p>
                                                </div>

                                                {/* Illustration */}
                                                <div className="flex items-end justify-center h-36 pt-1">
                                                    <img
                                                        src={profession.image}
                                                        alt={profession.label}
                                                        className="h-full w-auto object-contain object-bottom"
                                                    />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : bookingModeSubStep === 3 ? (
                            <>
                                {/* Sub-step 3: Event Types & Skills */}
                                <h2 className="text-3xl font-semibold text-[#1E1E1E] mb-2">Event types & Skills</h2>
                                <p className="text-sm text-gray-500 mb-8">Tell us about the events you cover and your key skills</p>

                                <div className="space-y-8 max-w-lg">
                                    {/* Event Type Dropdown */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Event types you cover</label>
                                        <div className="relative" ref={eventDropdownRef}>
                                            <button
                                                type="button"
                                                onClick={() => setIsEventDropdownOpen(!isEventDropdownOpen)}
                                                className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-xl bg-white text-left hover:border-gray-400 transition-colors"
                                            >
                                                <span className={`text-sm ${selectedEventTypes.length > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {selectedEventTypes.length > 0
                                                        ? `${selectedEventTypes.length} event type${selectedEventTypes.length > 1 ? 's' : ''} selected`
                                                        : 'Select event types'}
                                                </span>
                                                <svg className={`w-4 h-4 text-gray-500 transition-transform ${isEventDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>

                                            {/* Dropdown menu */}
                                            {isEventDropdownOpen && (
                                                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                                    {eventTypeOptions.map((eventType) => {
                                                        const isSelected = selectedEventTypes.includes(eventType);
                                                        return (
                                                            <button
                                                                key={eventType}
                                                                type="button"
                                                                onClick={() => toggleEventType(eventType)}
                                                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isSelected ? 'bg-gray-50' : ''
                                                                    }`}
                                                            >
                                                                <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                    ? 'bg-gray-900 border-gray-900'
                                                                    : 'bg-white border-gray-300'
                                                                    }`}>
                                                                    {isSelected && (
                                                                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                                                                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                                <span className="text-sm text-gray-900">{eventType}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected event type chips */}
                                        {selectedEventTypes.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedEventTypes.map((eventType) => (
                                                    <span
                                                        key={eventType}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-800 text-xs font-medium rounded-full"
                                                    >
                                                        {eventType}
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleEventType(eventType)}
                                                            className="text-gray-500 hover:text-gray-700"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Skills Input */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">Your skills</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={skillInput}
                                                onChange={(e) => setSkillInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && skillInput.trim()) {
                                                        e.preventDefault();
                                                        addSkill(skillInput);
                                                    }
                                                }}
                                                onFocus={() => setIsSkillsModalOpen(true)}
                                                placeholder="Type a skill and press Enter"
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-500 transition-colors"
                                            />
                                            {skillInput.trim() && (
                                                <button
                                                    type="button"
                                                    onClick={() => addSkill(skillInput)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                                >
                                                    Add
                                                </button>
                                            )}
                                        </div>

                                        {/* Added skills chips */}
                                        {skills.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {skills.map((skill) => (
                                                    <span
                                                        key={skill}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 text-pink-700 border border-pink-200 text-xs font-medium rounded-full"
                                                    >
                                                        {skill}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSkill(skill)}
                                                            className="text-pink-400 hover:text-pink-600"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Skill suggestions */}
                                        {isSkillsModalOpen && getSkillSuggestions().length > 0 && (
                                            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Suggested skills</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsSkillsModalOpen(false)}
                                                        className="text-gray-400 hover:text-gray-600"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {getSkillSuggestions().map((suggestion) => (
                                                        <button
                                                            key={suggestion}
                                                            type="button"
                                                            onClick={() => addSkill(suggestion)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 text-xs font-medium text-gray-700 rounded-full hover:border-gray-400 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : bookingModeSubStep === 4 ? (
                            <>
                                {/* Sub-step 4: Service Location */}
                                <h2 className="text-3xl font-semibold text-[#1E1E1E] mb-8">Where do you provide your services?</h2>

                                <div className="flex flex-wrap gap-6 px-1">
                                    {serviceLocationOptions.map((option) => {
                                        const isSelected = serviceLocation === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => setServiceLocation(option.id)}
                                                className={`relative rounded-2xl border-2 p-5 text-left transition-all w-55 h-55 flex flex-col justify-between overflow-hidden group ${isSelected
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-start gap-2 w-full z-10">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'border-gray-900' : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && (
                                                            <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-base text-gray-900 leading-tight">{option.label}</h3>
                                                        {option.subtitle && (
                                                            <p className="text-xs text-gray-500 mt-0.5">{option.subtitle}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 transition-transform group-hover:scale-105 duration-300">
                                                    <img src={option.image} alt={option.label} className="w-full h-auto object-contain" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Sub-step 5: Travel Willingness / Studio Address */}

                                {/* Travel Willingness - shown for 'client' or 'both' */}
                                {(serviceLocation === 'client' || serviceLocation === 'both') && (
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-semibold text-[#1E1E1E] mb-8">How about your travel willingness?</h2>

                                        <div className="flex flex-wrap gap-6 px-1">
                                            {travelWillingnessOptions.map((option) => {
                                                const isSelected = travelWillingness.includes(option.id);
                                                return (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => toggleTravelWillingness(option.id)}
                                                        className={`relative rounded-2xl border-2 p-5 text-left transition-all w-55 h-55 flex flex-col justify-between overflow-hidden group ${isSelected
                                                            ? 'border-gray-900 bg-gray-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 w-full z-10">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${isSelected
                                                                ? 'bg-gray-900 border-gray-900'
                                                                : 'bg-white border-gray-300'
                                                                }`}>
                                                                {isSelected && (
                                                                    <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            <h3 className="font-semibold text-base text-gray-900 leading-tight">{option.label}</h3>
                                                        </div>
                                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 transition-transform group-hover:scale-105 duration-300">
                                                            <img src={option.image} alt={option.label} className="w-full h-auto object-contain" />
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Studio Address - shown for 'studio' or 'both' */}
                                {(serviceLocation === 'studio' || serviceLocation === 'both') && (
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-semibold text-[#1E1E1E] mb-6">Studio Address</h2>

                                        <div className="space-y-4 max-w-lg">
                                            {/* Shop No */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={studioAddress.shopNo}
                                                    onChange={(e) => updateStudioAddress('shopNo', e.target.value)}
                                                    placeholder=" "
                                                    className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                />
                                                <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                    Shop No
                                                </label>
                                            </div>

                                            {/* Area, Street, Sector, Village */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={studioAddress.area}
                                                    onChange={(e) => updateStudioAddress('area', e.target.value)}
                                                    placeholder=" "
                                                    className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                />
                                                <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                    Area, Street, Sector, Village
                                                </label>
                                            </div>

                                            {/* Landmark */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={studioAddress.landmark}
                                                    onChange={(e) => updateStudioAddress('landmark', e.target.value)}
                                                    placeholder=" "
                                                    className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                />
                                                <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                    Landmark
                                                </label>
                                            </div>

                                            {/* Pincode + Town/City row */}
                                            <div className="flex gap-4">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={studioAddress.pincode}
                                                        onChange={(e) => updateStudioAddress('pincode', e.target.value)}
                                                        placeholder=" "
                                                        className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                    />
                                                    <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                        Pincode
                                                    </label>
                                                </div>
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={studioAddress.city}
                                                        onChange={(e) => updateStudioAddress('city', e.target.value)}
                                                        placeholder=" "
                                                        className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                    />
                                                    <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                        Town/City
                                                    </label>
                                                </div>
                                            </div>

                                            {/* State */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={studioAddress.state}
                                                    onChange={(e) => updateStudioAddress('state', e.target.value)}
                                                    placeholder=" "
                                                    className="peer w-full px-4 pt-5 pb-2 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:outline-none focus:border-gray-500 transition-colors"
                                                />
                                                <label className="absolute left-4 top-2 text-[10px] text-gray-500 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px]">
                                                    State
                                                </label>
                                            </div>
                                        </div>

                                        {/* Studio Working Hours (optional) */}
                                        <div className="mt-8">
                                            <h3 className="text-lg font-semibold text-[#1E1E1E] mb-4">Studio working hours (optional)</h3>

                                            {/* Added working hour chips */}
                                            <div className="space-y-2 mb-4">
                                                {workingHours.map((wh) => (
                                                    <div
                                                        key={wh.period}
                                                        className="inline-flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl bg-white mr-2"
                                                    >
                                                        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-sm text-gray-900">
                                                            {wh.period === 'Any time' ? 'Any time' : `${wh.period} • ${wh.startTime} - ${wh.endTime}`}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeWorkingHour(wh.period)}
                                                            className="text-gray-400 hover:text-gray-600 ml-1"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add working hours button */}
                                            <button
                                                type="button"
                                                onClick={() => setIsTimePickerOpen(true)}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add working hours
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Time Picker Modal */}
                        {isTimePickerOpen && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                                <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl">
                                    <h3 className="text-lg font-semibold text-[#1E1E1E] mb-5">Select time</h3>

                                    {/* Presets row 1 */}
                                    <div className="flex gap-3 mb-3">
                                        {timePresets.map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() => setTimePeriodSelection(preset.label)}
                                                className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center transition-all ${timePeriodSelection === preset.label
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <p className="text-sm font-medium text-gray-900">{preset.label}</p>
                                                <p className="text-[10px] text-gray-500">{preset.startTime} - {preset.endTime}</p>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Presets row 2 */}
                                    <div className="flex gap-3 mb-5">
                                        <button
                                            type="button"
                                            onClick={() => setTimePeriodSelection('Custom')}
                                            className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center transition-all ${timePeriodSelection === 'Custom'
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="text-sm font-medium text-gray-900">Custom</p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTimePeriodSelection('Any time')}
                                            className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-center transition-all ${timePeriodSelection === 'Any time'
                                                ? 'border-gray-900 bg-gray-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <p className="text-sm font-medium text-gray-900">Any time</p>
                                        </button>
                                    </div>

                                    {/* Custom time inputs */}
                                    {timePeriodSelection === 'Custom' && (
                                        <div className="flex gap-3 mb-5">
                                            <div className="flex-1">
                                                <select
                                                    value={customStartTime}
                                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500"
                                                >
                                                    <option value="">Select start time</option>
                                                    {timeOptions.map((t) => (
                                                        <option key={`start-${t}`} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <select
                                                    value={customEndTime}
                                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:border-gray-500"
                                                >
                                                    <option value="">Select end time</option>
                                                    {timeOptions.map((t) => (
                                                        <option key={`end-${t}`} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsTimePickerOpen(false);
                                                setTimePeriodSelection('');
                                                setCustomStartTime('');
                                                setCustomEndTime('');
                                            }}
                                            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTimePickerDone}
                                            disabled={!timePeriodSelection || (timePeriodSelection === 'Custom' && (!customStartTime || !customEndTime))}
                                            className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${timePeriodSelection && !(timePeriodSelection === 'Custom' && (!customStartTime || !customEndTime))
                                                ? 'bg-gray-900 hover:bg-gray-800'
                                                : 'bg-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right side - Profile Preview (30%) */}
            <div className="w-[30%] border-l border-gray-200 hidden lg:block">
                <div className="h-10 bg-linear-to-b from-pink-100 to-white"></div>
                <div className="p-6">
                    <ArtistProfilePreview
                        name={formData.fullName}
                        profilePicUrl={formData.profilePicUrl}
                        profession={selectedProfessions.map(id => professions.find(p => p.id === id)?.label || '').filter(Boolean)}
                        bio={formData.bio}
                        kycVerified={formData.kycStatus === 'verified'}
                        certificateUrl={formData.certificateUrl}
                        city={formData.address.city}
                        state={formData.address.state}
                        street={formData.address.street}
                        skills={skills}
                    />
                </div>
            </div>
        </div>
    );

    // Render method selection (initial view) / Setup hub
    const renderMethodSelection = () => (
        <div className="h-screen bg-[#FAF9F8] relative overflow-hidden">
            <button
                onClick={() => navigate('/auth/artist/login')}
                className="absolute top-5 left-5 flex items-center gap-2 text-gray-600 hover:text-[#1E1E1E] transition-colors z-10"
            >
                <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                    <BackArrowIcon />
                </div>
                <span className="text-sm font-medium">Back to Sign in</span>
            </button>

            <div className="h-full flex flex-col items-center justify-center px-4">
                <div className="w-full max-w-xl">
                    <div className="flex justify-center mb-3">
                        <img
                            src="/info/signup/Gemini_Generated_Image_ul535hul535hul53 1.png"
                            alt="Artist"
                            className="w-24 h-auto"
                        />
                    </div>
                    <h1 className="text-lg font-semibold text-center text-[#1E1E1E] mb-4">
                        Set up your artist account in 4 steps
                    </h1>

                    <div className="space-y-2">
                        {/* Step 1: Personal Details */}
                        {setupSteps.step1 ? (
                            // Step 1 completed — show as completed card
                            <StepCard
                                stepNumber={1}
                                title="Personal details"
                                description="Basic details about you"
                                icon={<PersonalDetailsIcon />}
                                isActive={false}
                                isCompleted={true}
                            />
                        ) : (
                            // Step 1 not done — show signup method buttons
                            <div className="rounded-xl bg-white border-2 border-gray-300 shadow-sm p-4">
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold bg-[#1E1E1E] text-white">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Step 1</p>
                                            <h3 className="text-sm font-semibold text-[#1E1E1E]">Personal details</h3>
                                        </div>
                                    </div>
                                    <PersonalDetailsIcon />
                                </div>
                                <div className="flex flex-wrap gap-2 ml-9">
                                    <SignupMethodButton icon={<PhoneIcon />} label="Sign up with" onClick={handlePhoneSignup} disabled={isLoading} />
                                    <SignupMethodButton icon={<EmailIcon />} label="Sign up with" onClick={handleEmailSignup} disabled={isLoading} />
                                    <SignupMethodButton icon={<GoogleIcon />} label="Sign up with" onClick={handleGoogleSignup} disabled={isLoading} />
                                </div>
                            </div>
                        )}

                        {/* Steps 2-4 */}
                        <StepCard
                            stepNumber={2}
                            title="Booking Modes"
                            description="Pick your categories and specialization"
                            icon={<BookingModesIcon />}
                            isActive={activeStep === 2}
                            isCompleted={setupSteps.step2}
                            onContinue={activeStep === 2 ? () => handleStepContinue(2) : undefined}
                        />
                        <StepCard
                            stepNumber={3}
                            title="Portfolio"
                            description="Showcase your best work"
                            icon={<PortfolioIcon />}
                            isActive={activeStep === 3}
                            isCompleted={setupSteps.step3}
                            onContinue={activeStep === 3 ? () => handleStepContinue(3) : undefined}
                        />
                        <StepCard
                            stepNumber={4}
                            title="Bank details"
                            description="Set up your account details for payouts"
                            icon={<BankDetailsIcon />}
                            isActive={activeStep === 4}
                            isCompleted={setupSteps.step4}
                            onContinue={activeStep === 4 ? () => handleStepContinue(4) : undefined}
                        />
                    </div>
                </div>
            </div>
        </div>
    );


    // Render Personal Details Form
    const renderDetailsForm = () => (
        <div className="h-screen bg-white flex overflow-hidden">
            {/* Left side - Form (70%) */}
            <div className="w-[70%] pl-14 py-6 flex flex-col h-full">
                {/* Form container - 80% of left side */}
                <div className="w-[80%] flex flex-col h-full">
                    {/* Header - Fixed */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBack} className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center bg-white hover:bg-gray-50">
                                <BackArrowIcon />
                            </button>
                            <h1 className="text-xl font-semibold">Personal Details</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={handleClear} className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                                Clear
                            </button>
                            <button
                                onClick={handleSaveAndContinue}
                                disabled={!isFormValid() || isSaving}
                                className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${isFormValid() && !isSaving
                                    ? 'bg-gray-700 hover:bg-gray-800'
                                    : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSaving && (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                )}
                                {isSaving ? 'Saving...' : 'Save & continue'}
                            </button>
                        </div>
                    </div>

                    {/* Progress - Fixed */}
                    <div className="mb-6 shrink-0">
                        <ProgressBar current={subStep} total={4} />
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>Step {subStep} of 4</span>
                            <span className="text-gray-300">•</span>
                            <span>Personal Details</span>
                        </div>
                    </div>

                    {/* Scrollable Form Section */}
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pr-4">
                        <div ref={contentRef}>
                            <h2 className="text-2xl font-semibold mb-6">
                                {subStep === 1 && 'Basic Information'}
                                {subStep === 2 && 'Identity Verification'}
                                {subStep === 3 && 'Professional Information'}
                                {subStep === 4 && 'Address Details'}
                            </h2>

                            {/* SUBSTEP 1: Basic Information */}
                            {subStep === 1 && (
                                <div className="space-y-4">
                                    {/* Full Name */}
                                    <InputField
                                        label="Full name"
                                        placeholder="Eg. Naveen Kumar"
                                        value={formData.fullName}
                                        onChange={(v) => updateFormData({ fullName: v })}
                                        helperText="Make sure this matches the name on your government ID"
                                        error={getFieldError('fullName')}
                                        required
                                    />

                                    {/* Phone or Email first based on signup method */}
                                    {signupMethod === 'phone' ? (
                                        <>
                                            {/* Phone Input */}
                                            <PhoneInputField
                                                countryCode={formData.countryCode}
                                                phone={formData.phone}
                                                onCountryCodeChange={(v) => updateFormData({ countryCode: v })}
                                                onPhoneChange={(v) => updateFormData({ phone: v })}
                                                verified={phoneVerified}
                                                onVerifyClick={handleSendPhoneOTP}
                                                canVerify={!phoneVerified && formData.phone.replace(/\s/g, '').length >= 10}
                                                error={getFieldError('phone')}
                                                required
                                            />

                                            {/* OTP for phone verification */}
                                            {otpSent && !phoneVerified && (
                                                <div className="ml-0">
                                                    <OTPInputField
                                                        value={formData.otp}
                                                        onChange={(v: string) => updateFormData({ otp: v })}
                                                        onComplete={async () => {
                                                            await handleVerifyPhoneOTP();
                                                            return true;
                                                        }}
                                                        onResend={handleSendPhoneOTP}
                                                        isVerifying={isLoading}
                                                        isSending={otpSending}
                                                        error={otpError}
                                                        successMessage={otpSuccess}
                                                    />
                                                </div>
                                            )}

                                            {/* Email (secondary) */}
                                            <InputField
                                                label="Email address"
                                                placeholder="Eg. name@gmail.com"
                                                value={formData.email}
                                                onChange={(v) => updateFormData({ email: v })}
                                                type="email"
                                                error={getFieldError('email')}
                                                required
                                            />
                                        </>
                                    ) : signupMethod === 'email' ? (
                                        <>
                                            {/* Email Input */}
                                            <div className="space-y-2">
                                                <InputField
                                                    label="Email address"
                                                    placeholder="Eg. name@gmail.com"
                                                    value={formData.email}
                                                    onChange={(v) => updateFormData({ email: v })}
                                                    type="email"
                                                    disabled={emailVerified}
                                                    error={getFieldError('email')}
                                                    required
                                                    suffix={
                                                        emailVerified ? (
                                                            <span className="text-sm text-emerald-600">✓ Verified</span>
                                                        ) : formData.email && !emailVerified ? (
                                                            <button
                                                                onClick={handleSendEmailOTP}
                                                                disabled={otpSending || !formData.email}
                                                                className="text-sm text-[#E91E63] hover:underline disabled:opacity-50"
                                                            >
                                                                {otpSending ? 'Sending...' : 'Verify'}
                                                            </button>
                                                        ) : null
                                                    }
                                                />
                                            </div>

                                            {/* OTP for email verification */}
                                            {otpSent && !emailVerified && (
                                                <div className="ml-0">
                                                    <OTPInputField
                                                        value={formData.otp}
                                                        onChange={(v: string) => updateFormData({ otp: v })}
                                                        onComplete={async () => {
                                                            await handleVerifyEmailOTP();
                                                            return true;
                                                        }}
                                                        onResend={handleSendEmailOTP}
                                                        isVerifying={isLoading}
                                                        isSending={otpSending}
                                                        error={otpError}
                                                        successMessage={otpSuccess}
                                                    />
                                                </div>
                                            )}

                                            {/* Phone (secondary) */}
                                            <PhoneInputField
                                                countryCode={formData.countryCode}
                                                phone={formData.phone}
                                                onCountryCodeChange={(v) => updateFormData({ countryCode: v })}
                                                onPhoneChange={(v) => updateFormData({ phone: v })}
                                                showVerify={false}
                                                error={getFieldError('phone')}
                                                required
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* Google signup - email auto-filled */}
                                            <InputField
                                                label="Email address"
                                                placeholder="Eg. name@gmail.com"
                                                value={formData.email}
                                                onChange={(v) => updateFormData({ email: v })}
                                                type="email"
                                                disabled={emailVerified}
                                                error={getFieldError('email')}
                                                required
                                                suffix={emailVerified && <span className="text-sm text-emerald-600">✓ Verified</span>}
                                            />

                                            {/* Phone (secondary) */}
                                            <PhoneInputField
                                                countryCode={formData.countryCode}
                                                phone={formData.phone}
                                                onCountryCodeChange={(v) => updateFormData({ countryCode: v })}
                                                onPhoneChange={(v) => updateFormData({ phone: v })}
                                                showVerify={false}
                                                error={getFieldError('phone')}
                                                required
                                            />
                                        </>
                                    )}

                                    {/* Birthday */}
                                    <DatePickerField
                                        label="Birthday"
                                        value={formData.birthday}
                                        onChange={(v) => updateFormData({ birthday: v })}
                                        helperText="You must be at least 18 years old"
                                        error={getFieldError('birthday')}
                                        required
                                    />

                                    {/* Gender */}
                                    <SelectField
                                        label="Gender"
                                        value={formData.gender}
                                        onChange={(v) => updateFormData({ gender: v })}
                                        options={[
                                            { value: 'male', label: 'Male' },
                                            { value: 'female', label: 'Female' },
                                            { value: 'other', label: 'Other' },
                                        ]}
                                        error={getFieldError('gender')}
                                        required
                                    />

                                    {/* Experience */}
                                    <SelectField
                                        label="Years of Experience"
                                        value={formData.experience}
                                        onChange={(v) => updateFormData({ experience: v })}
                                        placeholder="Select your experience"
                                        options={[
                                            { value: '0-2', label: '0-2 years' },
                                            { value: '3-5', label: '3-5 years' },
                                            { value: '6-10', label: '6-10 years' },
                                            { value: '10+', label: '10+ years' },
                                        ]}
                                        error={getFieldError('experience')}
                                        required
                                    />

                                    {/* Bio */}
                                    <TextareaField
                                        label="Bio"
                                        placeholder="Tell us about yourself, your skills, specializations, and what makes you unique as an artist..."
                                        value={formData.bio}
                                        onChange={(v) => updateFormData({ bio: v })}
                                        helperText="Minimum 20 characters, maximum 500"
                                        error={getFieldError('bio')}
                                        required
                                        maxLength={500}
                                    />
                                </div>
                            )}

                            {/* SUBSTEP 2: Identity Verification */}
                            {subStep === 2 && (
                                <div className="space-y-4">
                                    {/* Hidden file input */}
                                    <input
                                        type="file"
                                        ref={profilePicInputRef}
                                        onChange={handleProfilePicUpload}
                                        accept="image/jpeg,image/png"
                                        className="hidden"
                                    />

                                    {/* KYC Verification Card */}
                                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-medium text-gray-900">KYC verification</h3>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    Verify your identity by uploading your government-issued document.
                                                    <br />
                                                    This will allow us to confirm your KYC status.
                                                </p>
                                            </div>
                                            {formData.kycStatus === 'verified' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="font-medium">Verified</span>
                                                </div>
                                            ) : (
                                                <button
                                                    className="px-5 py-2.5 bg-[#1E1E1E] text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                                    onClick={() => {
                                                        // TODO: Integrate MEON KYC
                                                        console.log('Opening KYC verification...');
                                                        updateFormData({ kycStatus: 'verified' });
                                                    }}
                                                >
                                                    Verify KYC
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Profile Picture Upload Card */}
                                    <div className="p-4 border border-gray-200 rounded-lg bg-white">
                                        <h3 className="font-medium text-gray-900 mb-1">Profile photo</h3>

                                        {!formData.profilePicUrl ? (
                                            /* Before Upload: Dashed box with Browse File button */
                                            <>
                                                <div
                                                    className="mt-3 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                                                    onClick={() => profilePicInputRef.current?.click()}
                                                >
                                                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    <p className="text-sm text-gray-500 mb-3">Add a profile image (Optional)</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            profilePicInputRef.current?.click();
                                                        }}
                                                        disabled={isUploadingImage}
                                                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                    >
                                                        {isUploadingImage ? 'Uploading...' : 'Browse File'}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2">Note: Image size should be under 1MB. Support JPEG, PNG format</p>
                                            </>
                                        ) : (
                                            /* After Upload: Show image with buttons */
                                            <div className="mt-3 flex items-center gap-6">
                                                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 shrink-0">
                                                    <img
                                                        src={formData.profilePicUrl}
                                                        alt="Profile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => profilePicInputRef.current?.click()}
                                                        disabled={isUploadingImage}
                                                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-left"
                                                    >
                                                        {isUploadingImage ? 'Uploading...' : 'Upload new photo'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveProfilePic}
                                                        className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        Remove photo
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Selfie Verification - Only shows after profile image is uploaded */}
                                    {formData.profilePicUrl && (
                                        <div className="p-4 border border-gray-200 rounded-lg bg-white">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-gray-900">Selfie verification</h3>
                                                    <p className="text-sm text-gray-500 mt-0.5">
                                                        Take a selfie so we can match it with your
                                                        <br />
                                                        profile image.
                                                    </p>
                                                    <button
                                                        className="mt-3 px-4 py-2 bg-[#1E1E1E] text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                                        onClick={() => {
                                                            // TODO: Integrate face verification
                                                            updateFormData({ faceVerified: true });
                                                        }}
                                                    >
                                                        {formData.faceVerified ? '✓ Verified' : 'Click a selfie'}
                                                    </button>
                                                </div>
                                                {/* Illustration placeholder */}
                                                <div className="w-28 h-28 shrink-0 ml-4">
                                                    <svg viewBox="0 0 100 100" className="w-full h-full text-gray-300">
                                                        <circle cx="50" cy="35" r="18" fill="currentColor" opacity="0.3" />
                                                        <rect x="30" y="55" width="40" height="35" rx="5" fill="currentColor" opacity="0.2" />
                                                        <rect x="65" y="45" width="15" height="25" rx="3" fill="currentColor" opacity="0.4" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SUBSTEP 3: Professional Information */}
                            {subStep === 3 && (
                                <div className="space-y-4">
                                    {/* Hidden file input for certificate */}
                                    <input
                                        type="file"
                                        id="certificate-upload"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // Validate file type
                                            const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
                                            if (!validTypes.includes(file.type)) {
                                                console.error('Please select JPEG, PNG, or PDF file');
                                                return;
                                            }

                                            // Validate file size (max 2MB)
                                            if (file.size > 2 * 1024 * 1024) {
                                                console.error('File size should be under 2MB');
                                                return;
                                            }

                                            setIsUploadingImage(true);
                                            try {
                                                const fileName = `certificates/${Date.now()}_${file.name}`;
                                                const storageRef = ref(storage, fileName);
                                                await uploadBytes(storageRef, file);
                                                const downloadUrl = await getDownloadURL(storageRef);
                                                updateFormData({ certificateUrl: downloadUrl });
                                                console.log('Certificate uploaded successfully:', downloadUrl);
                                            } catch (error) {
                                                console.error('Error uploading certificate:', error);
                                            } finally {
                                                setIsUploadingImage(false);
                                            }
                                        }}
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        className="hidden"
                                    />

                                    {/* How did you learn the Art? */}
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">How did you learned the Art?</h2>

                                    <div className="space-y-3">
                                        {/* Professional Training Option */}
                                        <div
                                            className={`border rounded-lg cursor-pointer transition-colors ${formData.howDidYouLearn === 'professional'
                                                ? 'border-gray-300'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <label className="flex items-center gap-3 p-4 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="howDidYouLearn"
                                                    value="professional"
                                                    checked={formData.howDidYouLearn === 'professional'}
                                                    onChange={(e) => updateFormData({ howDidYouLearn: e.target.value as 'professional' | 'self-learned' | 'apprentice' })}
                                                    className="w-5 h-5 text-[#0D9488] focus:ring-[#0D9488] border-gray-300"
                                                />
                                                <span className="font-medium text-gray-900">Professional Training</span>
                                            </label>

                                            {/* Certificate Upload - Shows only when Professional Training is selected */}
                                            {formData.howDidYouLearn === 'professional' && (
                                                <div className="px-4 pb-4">
                                                    <div
                                                        className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                                                        onClick={() => document.getElementById('certificate-upload')?.click()}
                                                    >
                                                        {formData.certificateUrl ? (
                                                            <div className="text-center">
                                                                <svg className="w-8 h-8 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                                <p className="text-sm text-emerald-600 font-medium">Certificate uploaded</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        updateFormData({ certificateUrl: '' });
                                                                    }}
                                                                    className="text-xs text-gray-500 hover:text-gray-700 mt-1"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                                </svg>
                                                                <p className="text-sm font-medium text-gray-700">Upload your certificate</p>
                                                                <p className="text-xs text-gray-500 mt-0.5">Choose your weightage certificates</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        document.getElementById('certificate-upload')?.click();
                                                                    }}
                                                                    disabled={isUploadingImage}
                                                                    className="mt-3 px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                                >
                                                                    {isUploadingImage ? 'Uploading...' : 'Browse File'}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-2">Note: Size should be under 2MB. Support JPEG, PNG, PDF format</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Self-Learned Option */}
                                        <div
                                            className={`border rounded-lg cursor-pointer transition-colors ${formData.howDidYouLearn === 'self-learned'
                                                ? 'border-gray-300'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <label className="flex items-center gap-3 p-4 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="howDidYouLearn"
                                                    value="self-learned"
                                                    checked={formData.howDidYouLearn === 'self-learned'}
                                                    onChange={(e) => updateFormData({ howDidYouLearn: e.target.value as 'professional' | 'self-learned' | 'apprentice' })}
                                                    className="w-5 h-5 text-[#0D9488] focus:ring-[#0D9488] border-gray-300"
                                                />
                                                <span className="font-medium text-gray-900">Self-Learned</span>
                                            </label>
                                        </div>

                                        {/* Apprenticeship Option */}
                                        <div
                                            className={`border rounded-lg cursor-pointer transition-colors ${formData.howDidYouLearn === 'apprentice'
                                                ? 'border-gray-300'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <label className="flex items-center gap-3 p-4 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="howDidYouLearn"
                                                    value="apprentice"
                                                    checked={formData.howDidYouLearn === 'apprentice'}
                                                    onChange={(e) => updateFormData({ howDidYouLearn: e.target.value as 'professional' | 'self-learned' | 'apprentice' })}
                                                    className="w-5 h-5 text-[#0D9488] focus:ring-[#0D9488] border-gray-300"
                                                />
                                                <span className="font-medium text-gray-900">Apprenticeship / Trained Under a Mentor</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SUBSTEP 4: Address Details */}
                            {subStep === 4 && (
                                <div className="space-y-4">
                                    {/* Current Location Button */}
                                    <button
                                        type="button"
                                        disabled={geoLoading}
                                        onClick={() => {
                                            requestLocation();
                                            setLocationCaptured(false);
                                        }}
                                        className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-800 disabled:opacity-60"
                                    >
                                        {geoLoading ? (
                                            <>
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Getting location...
                                            </>
                                        ) : (locationCaptured || geoLocation) ? (
                                            <>
                                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                                Location captured
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <circle cx="12" cy="12" r="3" />
                                                    <path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.3-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4 1.4 1.4m10.6 10.6 1.4 1.4" />
                                                </svg>
                                                Current location
                                            </>
                                        )}
                                    </button>
                                    {geoError && (
                                        <p className="text-xs text-red-500 text-center">{geoError}</p>
                                    )}

                                    {/* Flat/Building */}
                                    <InputField
                                        label="Flat, House no., Building, Company, Apartment"
                                        placeholder="Eg. 14/13"
                                        value={formData.address.flatNo}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, flatNo: v } })}
                                    />

                                    {/* Street */}
                                    <InputField
                                        label="Area, Street, Sector, Village"
                                        placeholder="Eg. Anna Nagar"
                                        value={formData.address.street}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, street: v } })}
                                        required
                                    />

                                    {/* Landmark */}
                                    <InputField
                                        label="Landmark"
                                        placeholder="Eg. HDFC bank opposite"
                                        value={formData.address.landmark}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, landmark: v } })}
                                    />

                                    {/* Pincode and City */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="Pincode"
                                            placeholder="Eg. 600024"
                                            value={formData.address.pincode}
                                            onChange={(v) => updateFormData({ address: { ...formData.address, pincode: v } })}
                                            required
                                        />
                                        <InputField
                                            label="Town/City"
                                            placeholder="Eg. Chennai"
                                            value={formData.address.city}
                                            onChange={(v) => updateFormData({ address: { ...formData.address, city: v } })}
                                            required
                                        />
                                    </div>

                                    {/* State */}
                                    <InputField
                                        label="State"
                                        placeholder="Eg. Tamil Nadu"
                                        value={formData.address.state}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, state: v } })}
                                        required
                                    />
                                </div>
                            )}

                            {/* Error display */}
                            {error && (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side - Profile Preview (30%) */}
            <div className="w-[30%] border-l border-gray-200 hidden lg:block">
                {/* Top gradient section */}
                <div className="h-10 bg-linear-to-b from-pink-100 to-white"></div>
                {/* Content */}
                <div className="p-6">
                    <ArtistProfilePreview
                        name={formData.fullName}
                        profilePicUrl={formData.profilePicUrl}
                        bio={formData.bio}
                        kycVerified={formData.kycStatus === 'verified'}
                        certificateUrl={formData.certificateUrl}
                        city={formData.address.city}
                        state={formData.address.state}
                        street={formData.address.street}
                        skills={skills}
                    />
                </div>
            </div>
        </div>
    );

    // Main render
    if (formStep === 'portfolio') {
        return (
            <>
                {renderPortfolioForm()}
                <SuccessAnimation
                    isVisible={showSuccess}
                    message="Portfolio Saved!"
                    subMessage="Returning to setup..."
                    onComplete={() => {
                        setShowSuccess(false);
                        setFormStep('method-select');
                    }}
                />
            </>
        );
    }

    if (formStep === 'bank-details') {
        return (
            <>
                {renderBankDetailsForm()}
                <SuccessAnimation
                    isVisible={showSuccess}
                    message="Profile Completed!"
                    subMessage="Redirecting to home..."
                    onComplete={() => {
                        navigate('/artist/home');
                    }}
                />
            </>
        );
    }

    if (formStep === 'booking-modes') {
        return (
            <>
                {renderBookingModesForm()}
                <SuccessAnimation
                    isVisible={showSuccess}
                    message="Booking Mode Saved!"
                    subMessage="Returning to setup..."
                    onComplete={() => {
                        setShowSuccess(false);
                        setFormStep('method-select');
                    }}
                />
            </>
        );
    }

    if (formStep === 'method-select') {
        return (
            <>
                {renderMethodSelection()}
                <div id="recaptcha-container"></div>
            </>
        );
    }

    return (
        <>
            {renderDetailsForm()}
            <div id="recaptcha-container"></div>
            <SuccessAnimation
                isVisible={showSuccess}
                message="Personal Details Saved!"
                subMessage="Returning to setup..."
                onComplete={() => {
                    setShowSuccess(false);
                    // Return to the setup hub with Step 1 marked complete
                    setFormStep('method-select');
                }}
            />
        </>
    );
};

export default ArtistSignupView;


