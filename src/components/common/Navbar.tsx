import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginBottomSheet from './LoginBottomSheet';

function Navbar() {
    const [showBottomSheet, setShowBottomSheet] = useState(false);
    const navigate = useNavigate();
    const { isAuthenticated, userType } = useAuth();

    // Handle navigation to auth page with smooth transition
    const handleLoginClick = () => {
        // If already logged in, redirect to appropriate home page
        if (isAuthenticated) {
            const destination = userType === 'artist' ? '/artist/home' : '/home';
            navigate(destination);
            return;
        }

        // Check if mobile view (less than 768px)
        if (window.innerWidth < 768) {
            setShowBottomSheet(true);
            return;
        }

        // Desktop: navigate directly — AnimatePresence handles the transition
        navigate('/auth');
    };

    return (
        <>
            <nav className="sticky top-0 left-0 right-0 z-50 bg-white" style={{ height: '64px' }}>
                <div className="max-w-[1440px] mx-auto h-full flex items-center justify-between px-6 md:px-10">
                    {/* Logo */}
                    <a href="/" className="flex items-center">
                        <img
                            src="/info/common/logo.png"
                            alt="Mimora"
                            style={{ height: '28px', width: 'auto' }}
                            className="object-contain"
                        />
                    </a>

                    {/* Right side: Nav Links + Login */}
                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Desktop Nav Links */}
                        <div className="hidden md:flex items-center gap-6">
                            <a
                                href="#services"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-[14px] font-medium text-[#2B2B2B] hover:text-[#1E1E1E] transition-colors"
                            >
                                Services
                            </a>
                            <a
                                href="#contact"
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}
                                className="text-[14px] font-medium text-[#2B2B2B] hover:text-[#1E1E1E] transition-colors"
                            >
                                Contact us
                            </a>
                        </div>

                        {/* Login Button - Always Visible */}
                        <button
                            onClick={handleLoginClick}
                            className="flex items-center justify-center bg-[#111111] text-white text-[13px] font-medium rounded-full transition-all duration-200 hover:scale-[1.02]"
                            style={{
                                height: '36px',
                                paddingLeft: '14px',
                                paddingRight: '14px',
                                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                            }}
                        >
                            Login
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Login Bottom Sheet */}
            <LoginBottomSheet
                isOpen={showBottomSheet}
                onClose={() => setShowBottomSheet(false)}
            />
        </>
    );
}

export default Navbar;

