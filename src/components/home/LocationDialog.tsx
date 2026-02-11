import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { UserLocationUpdate } from '../../types/auth.types';

interface LocationDialogProps {
    isOpen: boolean;
    onClose: (locationData: UserLocationUpdate | null) => void;
}

interface AddressForm {
    flat_building: string;
    street_area: string;
    landmark: string;
    pincode: string;
    city: string;
    state: string;
}

const LocationDialog: React.FC<LocationDialogProps> = ({ isOpen, onClose }) => {
    const { location, loading, error, requestLocation } = useGeolocation();
    const [addressForm, setAddressForm] = useState<AddressForm>({
        flat_building: '',
        street_area: '',
        landmark: '',
        pincode: '',
        city: '',
        state: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});
    const [saving, setSaving] = useState(false);

    // Try to auto-fill from localStorage on mount
    useEffect(() => {
        const cached = localStorage.getItem('userAddress');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setAddressForm({
                    flat_building: parsed.flat_building || '',
                    street_area: parsed.street_area || '',
                    landmark: parsed.landmark || '',
                    pincode: parsed.pincode || '',
                    city: parsed.city || '',
                    state: parsed.state || '',
                });
            } catch {
                // ignore invalid cache
            }
        }
    }, []);

    // Reverse geocode when location is captured
    useEffect(() => {
        if (!location) return;
        // Only auto-fill if the form is currently empty (user hasn't typed yet)
        const isFormEmpty = !addressForm.street_area && !addressForm.city && !addressForm.pincode;
        if (!isFormEmpty) return;

        const reverseGeocode = async () => {
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (data?.address) {
                    const a = data.address;
                    setAddressForm(prev => ({
                        ...prev,
                        street_area: a.road || a.neighbourhood || a.suburb || prev.street_area || '',
                        landmark: a.suburb || a.neighbourhood || prev.landmark || '',
                        city: a.city || a.town || a.village || a.county || prev.city || '',
                        state: a.state || prev.state || '',
                        pincode: a.postcode || prev.pincode || '',
                    }));
                    // Clear any related errors
                    setFormErrors({});
                }
            } catch (err) {
                console.error('Reverse geocoding failed:', err);
            }
        };

        reverseGeocode();
    }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleGetLocation = () => {
        // Reset form so reverse geocoder will fill it
        setAddressForm({
            flat_building: '',
            street_area: '',
            landmark: '',
            pincode: '',
            city: '',
            state: '',
        });
        setFormErrors({});
        requestLocation();
    };

    const handleInputChange = (field: keyof AddressForm, value: string) => {
        setAddressForm(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (formErrors[field]) {
            setFormErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const errors: Partial<Record<keyof AddressForm, string>> = {};
        if (!addressForm.street_area.trim()) errors.street_area = 'Street/Area is required';
        if (!addressForm.pincode.trim()) errors.pincode = 'Pincode is required';
        if (!addressForm.city.trim()) errors.city = 'City is required';
        if (!addressForm.state.trim()) errors.state = 'State is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        if (!location) {
            // If no location coordinates, prompt user
            requestLocation();
            return;
        }

        setSaving(true);
        const payload: UserLocationUpdate = {
            latitude: location.latitude,
            longitude: location.longitude,
            flat_building: addressForm.flat_building.trim() || undefined,
            street_area: addressForm.street_area.trim(),
            landmark: addressForm.landmark.trim() || undefined,
            pincode: addressForm.pincode.trim(),
            city: addressForm.city.trim(),
            state: addressForm.state.trim(),
        };

        // Cache for future use
        localStorage.setItem('userAddress', JSON.stringify(payload));

        setSaving(false);
        onClose(payload);
    };

    const handleSkip = () => {
        onClose(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-100 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-[90%] max-w-[480px] bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleSkip}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Top gradient */}
                        <div className="h-2 bg-linear-to-r from-[#E84A7F] via-[#FF8DA1] to-[#FFB6C1] shrink-0" />

                        {/* Scrollable content */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-5">
                            {/* Get Current Location Button */}
                            <button
                                onClick={handleGetLocation}
                                disabled={loading}
                                className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#FFF0F5] hover:bg-[#FFE4ED] transition-colors"
                            >
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-[#E84A7F]/30 border-t-[#E84A7F] rounded-full animate-spin" />
                                    ) : (
                                        <MapPin className="w-5 h-5 text-[#E84A7F]" />
                                    )}
                                </div>
                                <div className="text-left flex-1">
                                    <span className="text-[15px] font-semibold text-[#E84A7F] block">
                                        {loading ? 'Detecting location...' : 'Get Current Location'}
                                    </span>
                                    {location && (
                                        <span className="text-[12px] text-green-600">
                                            Location captured ✓
                                        </span>
                                    )}
                                    {error && (
                                        <span className="text-[12px] text-red-500">
                                            {error}. Enable location in browser settings.
                                        </span>
                                    )}
                                </div>
                            </button>

                            {/* Address Form */}
                            <div className="space-y-4">
                                {/* Flat / Building No. */}
                                <div className="relative border border-gray-200 rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors">
                                    <label className="absolute top-2 left-4 text-[11px] text-gray-400 font-medium">
                                        Flat / Building No.
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Eg. 12A, Crystal Tower"
                                        value={addressForm.flat_building}
                                        onChange={(e) => handleInputChange('flat_building', e.target.value)}
                                        className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                    />
                                </div>

                                {/* Street / Area */}
                                <div className={`relative border rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors ${formErrors.street_area ? 'border-red-400' : 'border-gray-200'}`}>
                                    <label className="absolute top-2 left-4 text-[11px] font-medium">
                                        <span className="text-gray-400">Street / Area</span>
                                        <span className="text-[#E84A7F] ml-0.5">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Eg. MG Road"
                                        value={addressForm.street_area}
                                        onChange={(e) => handleInputChange('street_area', e.target.value)}
                                        className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                    />
                                    {formErrors.street_area && <p className="text-[11px] text-red-500 mt-1">{formErrors.street_area}</p>}
                                </div>

                                {/* Landmark */}
                                <div className="relative border border-gray-200 rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors">
                                    <label className="absolute top-2 left-4 text-[11px] text-gray-400 font-medium">
                                        Landmark
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Eg. Near City Mall"
                                        value={addressForm.landmark}
                                        onChange={(e) => handleInputChange('landmark', e.target.value)}
                                        className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                    />
                                </div>

                                {/* Pincode and City - Side by Side */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`relative border rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors ${formErrors.pincode ? 'border-red-400' : 'border-gray-200'}`}>
                                        <label className="absolute top-2 left-4 text-[11px] font-medium">
                                            <span className="text-gray-400">Pincode</span>
                                            <span className="text-[#E84A7F] ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Eg. 560001"
                                            value={addressForm.pincode}
                                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                                            className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                        />
                                        {formErrors.pincode && <p className="text-[11px] text-red-500 mt-1">{formErrors.pincode}</p>}
                                    </div>

                                    <div className={`relative border rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors ${formErrors.city ? 'border-red-400' : 'border-gray-200'}`}>
                                        <label className="absolute top-2 left-4 text-[11px] font-medium">
                                            <span className="text-gray-400">City</span>
                                            <span className="text-[#E84A7F] ml-0.5">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Eg. Bangalore"
                                            value={addressForm.city}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                        />
                                        {formErrors.city && <p className="text-[11px] text-red-500 mt-1">{formErrors.city}</p>}
                                    </div>
                                </div>

                                {/* State */}
                                <div className={`relative border rounded-xl px-4 pt-5 pb-3 focus-within:border-[#E84A7F] transition-colors ${formErrors.state ? 'border-red-400' : 'border-gray-200'}`}>
                                    <label className="absolute top-2 left-4 text-[11px] font-medium">
                                        <span className="text-gray-400">State</span>
                                        <span className="text-[#E84A7F] ml-0.5">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Eg. Karnataka"
                                        value={addressForm.state}
                                        onChange={(e) => handleInputChange('state', e.target.value)}
                                        className="w-full text-[14px] text-gray-800 placeholder-gray-300 outline-none bg-transparent"
                                    />
                                    {formErrors.state && <p className="text-[11px] text-red-500 mt-1">{formErrors.state}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Actions - Fixed */}
                        <div className="p-6 pt-3 border-t border-gray-100 shrink-0 space-y-3">
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="w-full h-12 bg-[#1E1E1E] text-white rounded-xl flex items-center justify-center gap-2 font-medium text-[14px] hover:bg-[#2a2a2a] transition-colors active:scale-[0.98] disabled:opacity-60"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Address</span>
                                )}
                            </button>

                            <button
                                onClick={handleSkip}
                                className="w-full h-10 text-[14px] font-medium text-[#6B6B6B] hover:text-[#1E1E1E] transition-colors"
                            >
                                Skip for now
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LocationDialog;
