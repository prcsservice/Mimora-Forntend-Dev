/**
 * Error message mapper for user-friendly error handling
 */

export const getErrorMessage = (error: any): string => {
    const message = error.response?.data?.detail || error.message || String(error);

    // Map backend errors to user-friendly messages
    const errorMap: Record<string, string> = {
        // OTP Errors
        'OTP expired': 'Your verification code has expired. Please request a new one.',
        'OTP has expired': 'Your verification code has expired. Please request a new one.',
        'Invalid OTP': 'Incorrect verification code. Please check and try again.',
        'No OTP found': 'Verification code not found. Please request a new one.',

        // Account Errors
        'Account already exists': 'An account with this email/phone already exists. Please login instead.',
        'Email already taken': 'This email is already registered. Please use a different email or login.',
        'Phone already registered': 'This phone number is already registered. Please use a different number or login.',

        // Cross-role Errors
        'This phone number is registered as a customer': 'This number is linked to a customer account. Please use a different number or contact support.',
        'This email is registered as a customer': 'This email is linked to a customer account. Please use a different email or contact support.',
        'Phone registered as customer': 'This number is linked to a customer account. Please use a different number.',
        'Email registered as customer': 'This email is linked to a customer account. Please use a different email.',

        // Rate Limiting
        'Too many requests': 'Too many attempts. Please wait a few minutes and try again.',
        'Too many attempts': 'Too many attempts. Please wait a few minutes and try again.',
        'Rate limit exceeded': 'Too many requests. Please slow down and try again later.',

        // Upload Errors
        'File too large': 'File is too large. Please choose a smaller file.',
        'Invalid file type': 'Invalid file type. Please upload a valid image or PDF.',
        'Upload failed': 'Failed to upload file. Please try again.',
        'Failed to upload': 'Failed to upload file. Please check your connection and try again.',

        // Network Errors
        'Network Error': 'Connection failed. Please check your internet and try again.',
        'Failed to fetch': 'Connection failed. Please check your internet and try again.',
        'timeout': 'Request timed out. Please try again.',

        // Firebase Errors
        'auth/invalid-phone-number': 'Invalid phone number format. Please check and try again.',
        'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
        'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
        'auth/code-expired': 'Verification code expired. Please request a new one.',

        // Validation Errors
        'Invalid email': 'Please enter a valid email address.',
        'Invalid phone': 'Please enter a valid phone number.',
        'Required field': 'This field is required.',
    };

    // Check if message contains any key
    for (const [key, value] of Object.entries(errorMap)) {
        if (message.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    // Default error message
    return 'Something went wrong. Please try again.';
};

/**
 * Get retry time from error response
 */
export const getRetryAfter = (error: any): number | null => {
    const retryAfter = error.response?.data?.retry_after;
    if (retryAfter && typeof retryAfter === 'number') {
        return retryAfter;
    }
    return null;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Validate file before upload
 */
export const validateFile = (
    file: File,
    maxSizeMB: number,
    allowedTypes: string[]
): { valid: boolean; error?: string } => {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${maxSizeMB}MB (uploaded: ${formatFileSize(file.size)})`
        };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        const allowedExtensions = allowedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ');
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedExtensions}`
        };
    }

    return { valid: true };
};
