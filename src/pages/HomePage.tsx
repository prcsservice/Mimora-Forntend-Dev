import React, { useState, useEffect } from 'react';
import CustomerHomeNavbar from '../components/home/CustomerHomeNavbar';
import ServiceCategoryIcons from '../components/home/ServiceCategoryIcons';
import HeroCarousel from '../components/home/HeroCarousel';
import SearchOverlay from '../components/home/SearchOverlay';
import CategoriesSection from '../components/home/CategoriesSection';
import ArtistSection from '../components/home/ArtistSection';
import CustomerHomeFooter from '../components/home/CustomerHomeFooter';
import BottomNavbar from '../components/home/BottomNavbar';
import LocationDialog from '../components/home/LocationDialog';
import { getCachedLocation } from '../hooks/useGeolocation';
import { authService } from '../services/authService';
import { getAuth } from 'firebase/auth';
import type { ArtistData } from '../components/home/ArtistCard';
import type { UserLocationUpdate } from '../types/auth.types';

// Sample data for Frequently Booked artists
const frequentlyBookedArtists: ArtistData[] = [
    {
        id: '1',
        name: 'Kavya Ramesh',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
        specialty: 'Hairstylist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'self-learned', label: 'Self Learned' },
        ],
        distance: '4.5 km away',
        experience: '5+ years',
        rating: '4.4(1.8K)',
        portfolioImages: [
            '/info/home/dc70ace0b4a13e50170f19ceedc5b3c94e064c6f.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
            '/info/home/catagory section/hairstylist.png',
            '/info/home/3daa4b9a59122c9b89963e9547aaaf5082f7cb3f.png',
        ],
    },
    {
        id: '2',
        name: 'Shruti',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        specialty: 'Makeup Artist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'certified', label: 'Certified' },
        ],
        distance: '2.1 km away',
        experience: '3+ years',
        rating: '4.7(2.3K)',
        portfolioImages: [
            '/info/home/catagory section/mackup.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
            '/info/home/dc70ace0b4a13e50170f19ceedc5b3c94e064c6f.png',
            '/info/home/catagory section/nail.png',
        ],
    },
    {
        id: '3',
        name: 'Nisha Prabhu',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        specialty: 'Saree Draping · Saree Pleating',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'apprenticeship', label: 'Apprenticeship' },
        ],
        distance: '1.9 km away',
        experience: '1+ years',
        rating: '4.2(3.5K)',
        portfolioImages: [
            '/info/home/3daa4b9a59122c9b89963e9547aaaf5082f7cb3f.png',
            '/info/home/catagory section/saree daping.png',
            '/info/home/catagory section/saree plating.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
        ],
    },
    {
        id: '4',
        name: 'Aarti',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        specialty: 'Mehendi Artist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'certified', label: 'Certified' },
        ],
        distance: '3.8 km away',
        experience: '10+ years',
        rating: '4.8(0.2K)',
        portfolioImages: [
            '/info/home/298d5512b1038ab125d881aa9937929c4a74d009.png',
            '/info/home/catagory section/mahendi.png',
            '/info/home/52e1909c9f0bc6c19f1d19860f5d1110a4d82585.png',
            '/info/home/catagory section/nail.png',
        ],
    },
];

// Sample data for Recently Booked artists
const recentlyBookedArtists: ArtistData[] = [
    {
        id: '5',
        name: 'Kavya Ramesh',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
        specialty: 'Hairstylist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'self-learned', label: 'Self Learned' },
        ],
        distance: '4.5 km away',
        experience: '5+ years',
        rating: '4.4(1.8K)',
        portfolioImages: [
            '/info/home/dc70ace0b4a13e50170f19ceedc5b3c94e064c6f.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
            '/info/home/catagory section/hairstylist.png',
            '/info/home/3daa4b9a59122c9b89963e9547aaaf5082f7cb3f.png',
        ],
    },
    {
        id: '6',
        name: 'Shruti',
        avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        specialty: 'Makeup Artist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'certified', label: 'Certified' },
        ],
        distance: '2.1 km away',
        experience: '3+ years',
        rating: '4.7(2.3K)',
        portfolioImages: [
            '/info/home/catagory section/mackup.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
            '/info/home/dc70ace0b4a13e50170f19ceedc5b3c94e064c6f.png',
            '/info/home/catagory section/nail.png',
        ],
    },
    {
        id: '7',
        name: 'Nisha Prabhu',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        specialty: 'Saree Draping · Saree Pleating',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'apprenticeship', label: 'Apprenticeship' },
        ],
        distance: '1.9 km away',
        experience: '1+ years',
        rating: '4.2(3.5K)',
        portfolioImages: [
            '/info/home/3daa4b9a59122c9b89963e9547aaaf5082f7cb3f.png',
            '/info/home/catagory section/saree daping.png',
            '/info/home/catagory section/saree plating.png',
            '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png',
        ],
    },
    {
        id: '8',
        name: 'Aarti',
        avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        specialty: 'Mehendi Artist',
        badges: [
            { type: 'kyc', label: 'KYC' },
            { type: 'certified', label: 'Certified' },
        ],
        distance: '3.8 km away',
        experience: '10+ years',
        rating: '4.8(0.2K)',
        portfolioImages: [
            '/info/home/298d5512b1038ab125d881aa9937929c4a74d009.png',
            '/info/home/catagory section/mahendi.png',
            '/info/home/52e1909c9f0bc6c19f1d19860f5d1110a4d82585.png',
            '/info/home/catagory section/nail.png',
        ],
    },
];

const HomePage: React.FC = () => {
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [locationName, setLocationName] = useState('Current location');

    // Check if location is already cached; if not, show dialog
    useEffect(() => {
        const cachedAddress = localStorage.getItem('userAddress');
        const cachedLocation = getCachedLocation();

        if (cachedAddress) {
            try {
                const parsed = JSON.parse(cachedAddress);
                setLocationName(parsed.city || 'Location saved');
            } catch {
                // ignore
            }
        } else if (!cachedLocation) {
            // No cached address or coordinates - show dialog
            const timer = setTimeout(() => {
                setShowLocationDialog(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleLocationClose = async (locationData: UserLocationUpdate | null) => {
        setShowLocationDialog(false);
        if (locationData) {
            setLocationName(locationData.city || 'Location saved');
            // Send to backend
            try {
                const auth = getAuth();
                const token = await auth.currentUser?.getIdToken();
                if (token) {
                    await authService.updateLocation(token, locationData);
                }
            } catch (err) {
                console.error('Failed to update location on backend:', err);
            }
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Location Dialog (mandatory on first visit) */}
            <LocationDialog
                isOpen={showLocationDialog}
                onClose={handleLocationClose}
            />

            {/* ===== HERO SECTION ===== */}
            <section
                className="relative flex flex-col overflow-hidden min-h-[85vh] md:min-h-screen"
                style={{
                    background: 'linear-gradient(180deg, #FFE9F0 0%, #FFF5F8 40%, #FFFFFF 100%)',
                }}
            >
                {/* Navbar */}
                <CustomerHomeNavbar locationName={locationName} onLocationClick={() => setShowLocationDialog(true)} />

                {/* Service Category Icons - Mobile Only */}
                <ServiceCategoryIcons />

                {/* Carousel fills remaining space */}
                <div className="flex-1 flex items-center relative">
                    <HeroCarousel />

                    {/* Search Overlay - Overlapping carousel on mobile, absolute on desktop */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full md:bottom-6 z-40">
                        <SearchOverlay />
                    </div>
                </div>
            </section>

            {/* ===== BELOW HERO CONTENT ===== */}
            <main>
                {/* Categories Section */}
                <CategoriesSection />

                {/* Frequently Booked Section */}
                <ArtistSection
                    title="Frequently Booked"
                    artists={frequentlyBookedArtists}
                    buttonText="View Package"
                />

                {/* Recently Booked Section */}
                <ArtistSection
                    title="Recently Booked"
                    artists={recentlyBookedArtists}
                    buttonText="Book Again"
                />
            </main>

            {/* Footer */}
            <CustomerHomeFooter />

            {/* Bottom Navigation Bar - Mobile Only */}
            <BottomNavbar />
        </div>
    );
};

export default HomePage;
