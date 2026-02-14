import React, { useState, useEffect } from 'react';
import { MapPin, LogOut, User, Calendar, Palette, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LocationDialog from '../components/home/LocationDialog';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { getAuth } from 'firebase/auth';
import type { UserLocationUpdate } from '../types/auth.types';

const ArtistHomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [locationName, setLocationName] = useState('Set your location');

    // Check if location already cached; if not, prompt
    useEffect(() => {
        const cached = localStorage.getItem('userAddress');
        if (cached) {
            try {
                const addr = JSON.parse(cached);
                setLocationName(addr.city || 'Location saved');
            } catch { /* ignore */ }
        } else {
            const timer = setTimeout(() => setShowLocationDialog(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleLocationClose = async (locationData: UserLocationUpdate | null) => {
        setShowLocationDialog(false);
        if (locationData) {
            setLocationName(locationData.city || 'Location saved');
            try {
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();
                if (token) {
                    await authService.updateLocation(token, locationData, 'artist');
                }
            } catch (err) {
                console.error('Failed to update artist location:', err);
            }
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    const artistName = user?.name || 'Artist';

    const cards = [
        { title: 'Bookings', desc: 'View and manage upcoming appointments', icon: Calendar, count: '0', color: '#E84A7F' },
        { title: 'Portfolio', desc: 'Showcase your best work', icon: Palette, count: '0 photos', color: '#7C3AED' },
        { title: 'Earnings', desc: 'Track your income & payouts', icon: Wallet, count: '₹0', color: '#059669' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Location Dialog */}
            <LocationDialog
                isOpen={showLocationDialog}
                onClose={handleLocationClose}
            />

            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-6">
                    <a href="/artist/home" className="flex items-center gap-2">
                        <img
                            src="/info/common/logo.png"
                            alt="Mimora"
                            style={{ height: '24px', width: 'auto' }}
                            className="object-contain"
                        />
                        <span className="text-xs font-semibold tracking-wider uppercase text-[#E84A7F] bg-pink-50 px-2 py-0.5 rounded-full">
                            Artist
                        </span>
                    </a>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowLocationDialog(true)}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <MapPin className="w-4 h-4 text-[#E84A7F]" />
                            <span className="font-medium hidden sm:inline">{locationName}</span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-10">
                {/* Welcome Section */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E84A7F] to-[#7C3AED] flex items-center justify-center text-white shadow-lg">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Welcome, {artistName}!
                        </h1>
                        <p className="text-sm text-gray-500">
                            {user?.email || user?.phone_number || 'Your artist dashboard'}
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
                    {cards.map((card) => (
                        <div
                            key={card.title}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${card.color}15` }}
                                >
                                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                                </div>
                                <span className="text-xl font-bold text-gray-900">{card.count}</span>
                            </div>
                            <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Coming Soon Banner */}
                <div className="bg-gradient-to-r from-[#E84A7F]/10 to-[#7C3AED]/10 rounded-2xl p-8 text-center border border-[#E84A7F]/20">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard Coming Soon</h2>
                    <p className="text-gray-600 max-w-md mx-auto">
                        We're building your complete artist dashboard with booking management, portfolio showcase, earnings tracking, and more.
                    </p>
                </div>

                {/* Debug Info */}
                <details className="mt-8 text-xs text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-600">Debug: User Info</summary>
                    <pre className="mt-2 bg-gray-100 rounded-lg p-4 overflow-auto text-gray-600">
                        {JSON.stringify(user, null, 2)}
                    </pre>
                </details>
            </main>
        </div>
    );
};

export default ArtistHomePage;
