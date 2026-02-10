import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Heart, Bell, Menu, MapPin, ChevronDown } from 'lucide-react';

interface CustomerHomeNavbarProps {
    locationName?: string;
}

type TabId = 'instant' | 'flexi' | 'workshops';

const TABS: { id: TabId; label: string; icon: string; comingSoon?: boolean }[] = [
    { id: 'instant', label: 'Instant Up', icon: '/info/home/nav1.png' },
    { id: 'flexi', label: 'Flexi Up', icon: '/info/home/nav3.png' },
    { id: 'workshops', label: 'Workshops', icon: '/info/home/nav2.png', comingSoon: true },
];

const CustomerHomeNavbar: React.FC<CustomerHomeNavbarProps> = ({ locationName = 'Current location' }) => {
    const [activeTab, setActiveTab] = useState<TabId>('instant');

    // Refs for the tab container and each tab button (for sliding underline)
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

    // Underline position state
    const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

    const setTabRef = useCallback((id: TabId) => (el: HTMLButtonElement | null) => {
        if (el) {
            tabRefs.current.set(id, el);
        } else {
            tabRefs.current.delete(id);
        }
    }, []);

    // Measure and position the underline whenever activeTab changes
    useLayoutEffect(() => {
        const container = tabContainerRef.current;
        const activeButton = tabRefs.current.get(activeTab);
        if (!container || !activeButton) return;

        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();

        // Underline width is 60% of the button width, centered
        const ulWidth = buttonRect.width * 0.6;
        const ulLeft = buttonRect.left - containerRect.left + (buttonRect.width - ulWidth) / 2;

        setUnderlineStyle({ left: ulLeft, width: ulWidth });
    }, [activeTab]);

    return (
        <nav className="sticky top-0 w-full z-50 bg-white/95 backdrop-blur-sm">
            {/* Desktop Navbar */}
            <div className="hidden md:flex max-w-[1440px] mx-auto h-[72px] items-center justify-between px-4 md:px-10">
                {/* Left: Logo + Location */}
                <div className="flex items-center gap-3 shrink-0">
                    <a href="/home" className="flex items-center">
                        <img
                            src="/info/common/logo.png"
                            alt="Mimora"
                            style={{ height: '28px', width: 'auto' }}
                            className="object-contain"
                        />
                    </a>

                    {/* Location Display */}
                    <button className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B] hover:text-[#1E1E1E] transition-colors group">
                        <MapPin className="w-3.5 h-3.5 text-[#E84A7F]" />
                        <span className="font-medium">{locationName}</span>
                        <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                {/* Center: Navigation Tabs */}
                <div ref={tabContainerRef} className="flex items-center gap-1 relative">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            ref={setTabRef(tab.id)}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative flex items-center gap-2.5 px-5 py-2 text-[14px] font-medium
                                transition-colors duration-200 group
                                ${activeTab === tab.id
                                    ? 'text-[#1E1E1E]'
                                    : 'text-[#6B6B6B] hover:text-[#1E1E1E]'
                                }
                            `}
                        >
                            <img
                                src={tab.icon}
                                alt={tab.label}
                                className={`w-7 h-7 object-contain transition-transform duration-200 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-105'
                                    }`}
                            />
                            <span>{tab.label}</span>

                            {/* Coming Soon Badge */}
                            {tab.comingSoon && (
                                <span className="absolute -top-1 right-0 px-1.5 py-0.5 bg-[#E84A7F] text-white text-[7px] font-bold rounded-sm uppercase tracking-wider">
                                    Coming Soon
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Shared sliding underline */}
                    <span
                        className="absolute bottom-0 h-[2.5px] bg-[#E84A7F] rounded-full transition-all duration-300 ease-in-out"
                        style={{ left: underlineStyle.left, width: underlineStyle.width }}
                    />
                </div>

                {/* Right: Action Icons */}
                <div className="flex items-center gap-1.5">
                    <button className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                        <Heart className="w-[20px] h-[20px] text-[#6B6B6B] hover:text-[#1E1E1E] transition-colors" strokeWidth={1.5} />
                    </button>

                    <button className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors relative">
                        <Bell className="w-[20px] h-[20px] text-[#6B6B6B] hover:text-[#1E1E1E] transition-colors" strokeWidth={1.5} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-[#E84A7F] rounded-full" />
                    </button>

                    <button className="flex w-10 h-10 items-center justify-center rounded-full hover:bg-black/5 transition-colors">
                        <Menu className="w-5 h-5 text-[#1E1E1E]" strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Mobile Topbar */}
            <div className="md:hidden flex items-center justify-between h-14 px-4">
                {/* Left: Location */}
                <button className="flex items-center gap-1.5 text-[13px] text-[#1E1E1E]">
                    <MapPin className="w-4 h-4 text-[#6B6B6B]" />
                    <span className="font-medium">Home</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#6B6B6B]" />
                </button>

                {/* Right: Notification Bell */}
                <button className="flex w-9 h-9 items-center justify-center rounded-full hover:bg-black/5 transition-colors relative">
                    <Bell className="w-5 h-5 text-[#1E1E1E]" strokeWidth={1.5} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E84A7F] rounded-full" />
                </button>
            </div>

            {/* Bottom border */}
            <div className="w-full h-px bg-black/5" />
        </nav>
    );
};

export default CustomerHomeNavbar;

