import React from 'react';
import { Search, Calendar, Clock } from 'lucide-react';

const SearchOverlay: React.FC = () => {
    return (
        <div className="w-full px-4 pb-6 md:pb-0">
            <div
                className="mx-auto w-full"
                style={{ maxWidth: '380px' }}
            >
                <div
                    className="bg-white rounded-2xl p-5"
                    style={{
                        boxShadow: '0 8px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
                    }}
                >
                    {/* Location Input */}
                    <div className="relative mb-3">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                            <Search className="w-4 h-4 text-[#9B9B9B]" />
                        </div>
                        <input
                            type="text"
                            placeholder="Where should we come?"
                            className="w-full h-11 pl-10 pr-4 bg-gray-50 rounded-xl border border-black text-[13px] text-[#1E1E1E] placeholder-[#9B9B9B] focus:outline-none focus:border-[#E84A7F] focus:bg-white transition-all"
                        />
                    </div>

                    {/* Date and Time Row */}
                    <div className="flex gap-2.5 mb-3">
                        {/* Date Picker */}
                        <div className="flex-1 relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                <Calendar className="w-4 h-4 text-[#9B9B9B]" />
                            </div>
                            <input
                                type="text"
                                placeholder="When"
                                className="w-full h-11 pl-10 pr-4 bg-gray-50 rounded-xl border border-black text-[13px] text-[#1E1E1E] placeholder-[#9B9B9B] focus:outline-none focus:border-[#E84A7F] focus:bg-white transition-all"
                            />
                        </div>

                        {/* Time Picker */}
                        <div className="flex-1 relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                <Clock className="w-4 h-4 text-[#9B9B9B]" />
                            </div>
                            <input
                                type="text"
                                placeholder="What time?"
                                className="w-full h-11 pl-10 pr-4 bg-gray-50 rounded-xl border border-black text-[13px] text-[#1E1E1E] placeholder-[#9B9B9B] focus:outline-none focus:border-[#E84A7F] focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    {/* Find Artist Button */}
                    <button className="w-full h-11 bg-[#1E1E1E] text-white rounded-xl flex items-center justify-center gap-2 font-medium text-[13px] hover:bg-[#2a2a2a] transition-colors active:scale-[0.98]">
                        <Search className="w-3.5 h-3.5" />
                        <span>Find an artist</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;
