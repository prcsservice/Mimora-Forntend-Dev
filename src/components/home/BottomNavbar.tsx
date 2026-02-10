import React from 'react';
import { Home, Heart, Calendar, MessageCircle, User } from 'lucide-react';

const BottomNavbar: React.FC = () => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
            <div className="flex items-center justify-around h-16 px-2">
                {/* Home */}
                <button className="flex flex-col items-center justify-center gap-1 flex-1 py-2">
                    <Home className="w-5 h-5 text-[#1E1E1E]" strokeWidth={2} />
                    <span className="text-[10px] font-medium text-[#1E1E1E]">Home</span>
                    <div className="w-12 h-0.5 bg-[#1E1E1E] rounded-full mt-0.5" />
                </button>

                {/* Wishlist */}
                <button className="flex flex-col items-center justify-center gap-1 flex-1 py-2">
                    <Heart className="w-5 h-5 text-[#6B6B6B]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#6B6B6B]">Wishlist</span>
                </button>

                {/* My Bookings */}
                <button className="flex flex-col items-center justify-center gap-1 flex-1 py-2">
                    <Calendar className="w-5 h-5 text-[#6B6B6B]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#6B6B6B]">My Bookings</span>
                </button>

                {/* Chat */}
                <button className="flex flex-col items-center justify-center gap-1 flex-1 py-2">
                    <MessageCircle className="w-5 h-5 text-[#6B6B6B]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#6B6B6B]">Chat</span>
                </button>

                {/* Profile */}
                <button className="flex flex-col items-center justify-center gap-1 flex-1 py-2">
                    <User className="w-5 h-5 text-[#6B6B6B]" strokeWidth={1.5} />
                    <span className="text-[10px] font-medium text-[#6B6B6B]">Profile</span>
                </button>
            </div>
        </nav>
    );
};

export default BottomNavbar;
