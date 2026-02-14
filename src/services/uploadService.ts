/**
 * File upload helper for Firebase Storage (Direct Frontend Upload)
 * Files are uploaded directly to Firebase Storage from the browser,
 * then the URLs are sent to the backend.
 */

import { getErrorMessage, validateFile } from '@/utils/errorHandling';
import { storage } from '@/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface UploadOptions {
    onProgress?: (progress: number) => void;
    onSuccess?: (url: string) => void;
    onError?: (error: string) => void;
}

/**
 * Upload file directly to Firebase Storage
 */
const uploadToFirebase = async (
    file: File,
    folder: string,
    options?: UploadOptions
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Create unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 9);
        const extension = file.name.split('.').pop();
        const filename = `${folder}/${timestamp}_${randomString}.${extension}`;

        // Create storage reference
        const storageRef = ref(storage, filename);

        // Upload file
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                // Progress tracking
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                options?.onProgress?.(progress);
            },
            (error) => {
                // Error handling
                const friendlyError = getErrorMessage(error);
                options?.onError?.(friendlyError);
                reject(new Error(friendlyError));
            },
            async () => {
                // Success - get download URL
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    options?.onSuccess?.(downloadURL);
                    resolve(downloadURL);
                } catch (error: any) {
                    const friendlyError = getErrorMessage(error);
                    options?.onError?.(friendlyError);
                    reject(new Error(friendlyError));
                }
            }
        );
    });
};

/**
 * Upload profile picture
 */
export const uploadProfilePicture = async (
    file: File,
    options?: UploadOptions
): Promise<string> => {
    // Validate file
    const validation = validateFile(file, 5, ['image/jpeg', 'image/png', 'image/jpg']);
    if (!validation.valid) {
        const error = validation.error || 'Invalid file';
        options?.onError?.(error);
        throw new Error(error);
    }

    try {
        return await uploadToFirebase(file, 'artists/profiles', options);
    } catch (error: any) {
        const friendlyError = getErrorMessage(error);
        options?.onError?.(friendlyError);
        throw new Error(friendlyError);
    }
};

/**
 * Upload certificate (image or PDF)
 */
export const uploadCertificate = async (
    file: File,
    options?: UploadOptions
): Promise<string> => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    const validation = validateFile(file, 10, allowedTypes);
    if (!validation.valid) {
        const error = validation.error || 'Invalid file';
        options?.onError?.(error);
        throw new Error(error);
    }

    try {
        return await uploadToFirebase(file, 'artists/certificates', options);
    } catch (error: any) {
        const friendlyError = getErrorMessage(error);
        options?.onError?.(friendlyError);
        throw new Error(friendlyError);
    }
};

/**
 * Upload portfolio image
 */
export const uploadPortfolioImage = async (
    file: File,
    options?: UploadOptions
): Promise<string> => {
    // Validate file
    const validation = validateFile(file, 8, ['image/jpeg', 'image/png', 'image/jpg']);
    if (!validation.valid) {
        const error = validation.error || 'Invalid file';
        options?.onError?.(error);
        throw new Error(error);
    }

    try {
        return await uploadToFirebase(file, 'artists/portfolio', options);
    } catch (error: any) {
        const friendlyError = getErrorMessage(error);
        options?.onError?.(friendlyError);
        throw new Error(friendlyError);
    }
};
