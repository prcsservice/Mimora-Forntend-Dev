import React, { useState } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeolocation } from '../../hooks/useGeolocation';

interface LocationDialogProps {
    isOpen: boolean;
    onClose: (location: { latitude: number; longitude: number } | null) => void;
}

const LocationDialog: React.FC<LocationDialogProps> = ({ isOpen, onClose }) => {
    const { location, loading, error, requestLocation } = useGeolocation();
    const [manualDismissed, setManualDismissed] = useState(false);

    // Once location is obtained, auto-close
    React.useEffect(() => {
        if (location && !manualDismissed) {
            // Small delay to show success state
            const timer = setTimeout(() => {
                onClose(location);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [location, onClose, manualDismissed]);

    const handleAllow = () => {
        requestLocation();
    };

    const handleSkip = () => {
        setManualDismissed(true);
        onClose(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-[90%] max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleSkip}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>

                        {/* Decorative top gradient */}
                        <div className="h-2 bg-gradient-to-r from-[#E84A7F] via-[#FF8DA1] to-[#FFB6C1]" />

                        <div className="p-8 flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className="w-20 h-20 rounded-full bg-[#FFF0F5] flex items-center justify-center mb-6">
                                {location ? (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                    >
                                        <MapPin className="w-10 h-10 text-[#E84A7F]" fill="#E84A7F" />
                                    </motion.div>
                                ) : (
                                    <Navigation className="w-10 h-10 text-[#E84A7F]" />
                                )}
                            </div>

                            {/* Title */}
                            <h2 className="text-[22px] font-bold text-[#1E1E1E] mb-2">
                                {location ? 'Location Found!' : 'Enable Your Location'}
                            </h2>

                            {/* Description */}
                            <p className="text-[14px] text-[#6B6B6B] mb-8 leading-relaxed max-w-[320px]">
                                {location
                                    ? 'We\'ve found your location. Finding the best artists near you...'
                                    : 'We need your location to find the best beauty artists near you. This helps us show you the closest and most relevant services.'}
                            </p>

                            {/* Error message */}
                            {error && (
                                <div className="w-full mb-4 p-3 bg-red-50 rounded-xl text-[13px] text-red-600">
                                    {error}. Please enable location in your browser settings.
                                </div>
                            )}

                            {/* Buttons */}
                            {!location && (
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={handleAllow}
                                        disabled={loading}
                                        className="w-full h-12 bg-[#1E1E1E] text-white rounded-xl flex items-center justify-center gap-2 font-medium text-[14px] hover:bg-[#2a2a2a] transition-colors active:scale-[0.98] disabled:opacity-60"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Detecting location...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Navigation className="w-4 h-4" />
                                                <span>Allow Location Access</span>
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={handleSkip}
                                        className="w-full h-10 text-[14px] font-medium text-[#6B6B6B] hover:text-[#1E1E1E] transition-colors"
                                    >
                                        Skip for now
                                    </button>
                                </div>
                            )}

                            {/* Success animation */}
                            {location && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-[#22C55E] text-[14px] font-medium"
                                >
                                    <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center">
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span>Location detected successfully</span>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default LocationDialog;
