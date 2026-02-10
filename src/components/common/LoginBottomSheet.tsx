import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type ProfileType = 'customer' | 'artist';

interface LoginBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoginBottomSheet: React.FC<LoginBottomSheetProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    const profiles: { type: ProfileType; label: string; activeImage: string; inactiveImage: string }[] = [
        {
            type: 'customer',
            label: 'Customer',
            activeImage: '/info/signup/1f5211b49139736759d9861eb66596ae13cd21fe.png', // Woman waving
            inactiveImage: '/info/signup/9c82cb2051e1fad67f144c57a6dffb7b41623026.png', // Woman holding phone
        },
        {
            type: 'artist',
            label: 'Artist',
            activeImage: '/info/signup/e705b35b34994bae6f7d848967bd7d99b164fd30.png', // Woman waving
            inactiveImage: '/info/signup/2ffa1250f7dec8acea993abfbe38ce323bbb5e4f.png', // Woman with makeup kit
        },
    ];

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
            setSelectedProfile(null);
        }, 300);
    };

    const handleGetStarted = () => {
        if (selectedProfile) {
            handleClose();
            // Navigate after bottom sheet close animation completes
            setTimeout(() => {
                navigate(`/auth/${selectedProfile}/login`);
            }, 350);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black transition-opacity duration-300 ${isAnimating ? 'opacity-50' : 'opacity-0'
                    }`}
                onClick={handleClose}
            />

            {/* Bottom Sheet */}
            <div
                className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full'
                    }`}
                style={{ maxHeight: '60vh' }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                {/* Content */}
                <div className="px-6 pb-8">
                    <h2 className="text-[24px] font-semibold text-[#1E1E1E] leading-tight mb-2">
                        Create or Join an Account
                    </h2>
                    <p className="text-sm text-[#6B6B6B] mb-6">
                        Select your profile to proceed nu mathiringala
                    </p>

                    {/* Profile Options */}
                    <div className="space-y-3">
                        {profiles.map(({ type, label, activeImage, inactiveImage }) => {
                            const isSelected = selectedProfile === type;
                            const currentImage = isSelected ? activeImage : inactiveImage;

                            return (
                                <button
                                    key={type}
                                    onClick={() => setSelectedProfile(type)}
                                    className={`
                                        relative w-full h-[90px]
                                        flex items-center
                                        px-4
                                        rounded-2xl
                                        border
                                        text-left
                                        overflow-hidden
                                        transition-all duration-200
                                        ${isSelected
                                            ? 'border-[#1E1E1E] bg-white'
                                            : 'bg-[#F5F5F5] border-transparent'
                                        }
                                    `}
                                >
                                    {/* Radio indicator */}
                                    <div className={`
                                        w-5 h-5 rounded-full border-2 mr-3
                                        flex items-center justify-center shrink-0
                                        transition-colors duration-200
                                        ${isSelected
                                            ? 'border-[#1E1E1E]'
                                            : 'border-gray-300'
                                        }
                                    `}>
                                        {isSelected && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#1E1E1E]" />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className="flex-1 text-base font-medium text-[#1E1E1E]">
                                        {label}
                                    </span>

                                    {/* Character illustration */}
                                    <div
                                        className="absolute right-0 top-0 h-full overflow-hidden"
                                        style={{ width: '120px' }}
                                    >
                                        <img
                                            src={currentImage}
                                            alt={label}
                                            className="h-auto object-cover object-top"
                                            style={{
                                                width: '120px',
                                                marginTop: '-8px',
                                                objectPosition: 'top center'
                                            }}
                                        />
                                    </div>

                                    {/* "Hi!" text for selected customer */}
                                    {type === 'customer' && isSelected && (
                                        <div
                                            className="absolute z-10"
                                            style={{
                                                right: '90px',
                                                top: '10px',
                                                fontFamily: 'cursive, sans-serif',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                color: '#1E1E1E',
                                                letterSpacing: '-0.5px'
                                            }}
                                        >
                                            HI!
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Get Started Button */}
                    <button
                        onClick={handleGetStarted}
                        disabled={!selectedProfile}
                        className={`
                            w-full mt-6 py-4
                            rounded-full
                            text-base font-medium
                            transition-all duration-200
                            ${selectedProfile
                                ? 'bg-[#1E1E1E] text-white hover:bg-[#333333]'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                        `}
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginBottomSheet;
