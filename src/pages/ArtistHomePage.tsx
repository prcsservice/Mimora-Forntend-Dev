import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import LocationDialog from '../components/home/LocationDialog';
import { authService } from '../services/authService';
import { getAuth } from 'firebase/auth';
import type { UserLocationUpdate } from '../types/auth.types';

const ArtistHomePage: React.FC = () => {
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
            // No cached address — show dialog after a short delay
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Location Dialog */}
            <LocationDialog
                isOpen={showLocationDialog}
                onClose={handleLocationClose}
            />

            {/* Simple Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
                <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-6">
                    <a href="/artist" className="flex items-center">
                        <img
                            src="/info/common/logo.png"
                            alt="Mimora"
                            style={{ height: '24px', width: 'auto' }}
                            className="object-contain"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-500">Artist</span>
                    </a>

                    <button
                        onClick={() => setShowLocationDialog(true)}
                        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <MapPin className="w-4 h-4 text-[#E84A7F]" />
                        <span className="font-medium">{locationName}</span>
                    </button>
                </div>
            </nav>

            {/* Placeholder Dashboard Content */}
            <main className="max-w-5xl mx-auto px-6 py-12">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Artist!</h1>
                <p className="text-gray-500 mb-8">Your dashboard is coming soon. Manage your bookings, portfolio, and more.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: 'Bookings', desc: 'View and manage your bookings', icon: '📅' },
                        { title: 'Portfolio', desc: 'Showcase your work', icon: '🎨' },
                        { title: 'Earnings', desc: 'Track your income', icon: '💰' },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <span className="text-3xl mb-3 block">{card.icon}</span>
                            <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ArtistHomePage;
