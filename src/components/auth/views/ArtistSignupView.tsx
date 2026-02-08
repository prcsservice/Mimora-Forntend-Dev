import React, { useState, useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import SuccessAnimation from '@/components/common/SuccessAnimation';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Types
type SignupMethod = 'phone' | 'email' | 'google' | null;
type FormStep = 'method-select' | 'otp-verify' | 'details-form';

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
}

const StepCard: React.FC<StepCardProps> = ({
    stepNumber,
    title,
    description,
    icon,
    isActive,
    isCompleted,
}) => (
    <div
        className={`rounded-xl transition-all duration-300 ${isActive
            ? 'bg-white border border-gray-200 shadow-sm p-4'
            : 'bg-white/50 border border-gray-100 p-3'
            }`}
    >
        <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted
                        ? 'bg-[#E91E63] text-white'
                        : isActive
                            ? 'bg-[#1E1E1E] text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                >
                    {isCompleted ? '✓' : isActive ? stepNumber : <LockIcon />}
                </div>
                <div>
                    <p className={`text-xs ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                        Step {stepNumber}
                    </p>
                    <h3 className={`text-sm font-semibold ${isActive ? 'text-[#1E1E1E]' : 'text-gray-500'}`}>
                        {title}
                    </h3>
                    {!isActive && (
                        <p className="text-xs text-gray-400">{description}</p>
                    )}
                </div>
            </div>
            <div className={`shrink-0 ${!isActive && 'opacity-40'}`}>{icon}</div>
        </div>
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
    const { loginWithGoogle, sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, verifyEmailOTP, isLoading, error } = useAuth();

    // State
    const [signupMethod, setSignupMethod] = useState<SignupMethod>(null);
    const [formStep, setFormStep] = useState<FormStep>('method-select');
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
    }, []);

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
            await loginWithGoogle();
            // After successful Google auth, go to details form
            // Email would be auto-filled from Google account
            setEmailVerified(true);
            setFormStep('details-form');
        } catch {
            // Error handled by AuthContext
        }
    };

    const handleSendPhoneOTP = async () => {
        setOtpSending(true);
        setOtpError('');
        setOtpSuccess('');
        try {
            const fullPhone = `${formData.countryCode}${formData.phone}`;
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
            await verifyEmailOTP(formData.email, formData.otp);
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
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Save to localStorage
            const progress = {
                formData,
                subStep: subStep < 4 ? subStep + 1 : subStep,
                formStep,
                signupMethod,
                phoneVerified,
                emailVerified
            };
            localStorage.setItem('artist_signup_data', JSON.stringify(progress));

            // Move to next substep or show success
            if (subStep < 4) {
                setSubStep(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // Final step completed
                setShowSuccess(true);
            }
        } catch (error) {
            console.error('Error saving progress:', error);
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

    // Handle profile picture upload to Firebase Storage
    const handleProfilePicUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            console.error('Please select an image file');
            return;
        }

        // Validate file size (max 1MB)
        if (file.size > 1024 * 1024) {
            console.error('Image size should be under 1MB');
            return;
        }

        setIsUploadingImage(true);
        try {
            // Create a unique file name
            const fileName = `profile-pics/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, fileName);

            // Upload the file
            await uploadBytes(storageRef, file);

            // Get the download URL
            const downloadUrl = await getDownloadURL(storageRef);

            // Update form data with the URL
            updateFormData({ profilePicUrl: downloadUrl });
            console.log('Profile picture uploaded successfully:', downloadUrl);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
        } finally {
            setIsUploadingImage(false);
        }
    };

    // Handle profile picture removal
    const handleRemoveProfilePic = () => {
        updateFormData({ profilePicUrl: '' });
        if (profilePicInputRef.current) {
            profilePicInputRef.current.value = '';
        }
    };

    // Render method selection (initial view)
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
                        {/* Step 1 with method buttons */}
                        <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-4">
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

                        <StepCard stepNumber={2} title="Booking Modes" description="Pick your categories and specialization" icon={<BookingModesIcon />} isActive={false} isCompleted={false} />
                        <StepCard stepNumber={3} title="Portfolio" description="Showcase your best work" icon={<PortfolioIcon />} isActive={false} isCompleted={false} />
                        <StepCard stepNumber={4} title="Bank details" description="Set up your account details for payouts" icon={<BankDetailsIcon />} isActive={false} isCompleted={false} />
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
                                    {/* Get Current Location */}
                                    <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                                        <button
                                            className="flex items-center gap-2 text-[#E91E63] font-medium"
                                            onClick={() => {
                                                if (navigator.geolocation) {
                                                    navigator.geolocation.getCurrentPosition(
                                                        (position) => {
                                                            updateFormData({
                                                                address: {
                                                                    ...formData.address,
                                                                    location: {
                                                                        lat: position.coords.latitude,
                                                                        lng: position.coords.longitude
                                                                    }
                                                                }
                                                            });
                                                        },
                                                        (error) => console.error('Geolocation error:', error)
                                                    );
                                                }
                                            }}
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Get Current Location
                                        </button>
                                        {formData.address.location && (
                                            <p className="text-xs text-gray-500 mt-2">Location captured ✓</p>
                                        )}
                                    </div>

                                    {/* Flat/Building */}
                                    <InputField
                                        label="Flat / Building No."
                                        placeholder="Eg. 12A, Crystal Tower"
                                        value={formData.address.flatNo}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, flatNo: v } })}
                                    />

                                    {/* Street */}
                                    <InputField
                                        label="Street / Area"
                                        placeholder="Eg. MG Road"
                                        value={formData.address.street}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, street: v } })}
                                        required
                                    />

                                    {/* Landmark */}
                                    <InputField
                                        label="Landmark"
                                        placeholder="Eg. Near City Mall"
                                        value={formData.address.landmark}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, landmark: v } })}
                                    />

                                    {/* Pincode and City */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="Pincode"
                                            placeholder="Eg. 560001"
                                            value={formData.address.pincode}
                                            onChange={(v) => updateFormData({ address: { ...formData.address, pincode: v } })}
                                            required
                                        />
                                        <InputField
                                            label="City"
                                            placeholder="Eg. Bangalore"
                                            value={formData.address.city}
                                            onChange={(v) => updateFormData({ address: { ...formData.address, city: v } })}
                                            required
                                        />
                                    </div>

                                    {/* State */}
                                    <InputField
                                        label="State"
                                        placeholder="Eg. Karnataka"
                                        value={formData.address.state}
                                        onChange={(v) => updateFormData({ address: { ...formData.address, state: v } })}
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
                    <h2 className="text-xl font-semibold text-[#964152] mb-6">Profile Preview</h2>
                    <div className="text-gray-500 text-sm">
                        {formData.fullName && <p className="font-medium text-gray-900">{formData.fullName}</p>}
                        {formData.email && <p>{formData.email}</p>}
                        {formData.phone && <p>{formData.countryCode} {formData.phone}</p>}
                        {formData.bio && <p className="mt-4 italic">"{formData.bio}"</p>}
                    </div>
                </div>
            </div>
        </div>
    );

    // Main render
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
                subMessage="Moving to next step..."
                onComplete={() => {
                    setShowSuccess(false);
                    // Navigate to next major step (Step 2: Booking Modes)
                    navigate('/auth/artist/signup/booking-modes');
                }}
            />
        </>
    );
};

export default ArtistSignupView;


