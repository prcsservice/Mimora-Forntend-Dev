import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star } from 'lucide-react';

export interface ArtistBadge {
    type: 'kyc' | 'certified' | 'self-learned' | 'apprenticeship';
    label: string;
}

export interface ArtistData {
    id: string;
    name: string;
    avatarUrl: string;
    specialty: string;
    badges: ArtistBadge[];
    distance: string;
    experience: string;
    rating: string;
    portfolioImages: string[];
}

interface ArtistCardProps {
    artist: ArtistData;
    buttonText: 'View Package' | 'Book Again';
    index?: number;
}

const getBadgeStyles = (type: ArtistBadge['type']) => {
    switch (type) {
        case 'kyc':
            return 'bg-[#1E1E1E] text-white';
        case 'certified':
            return 'bg-[#22C55E] text-white';
        case 'self-learned':
            return 'bg-[#3B82F6] text-white';
        case 'apprenticeship':
            return 'bg-[#F59E0B] text-white';
        default:
            return 'bg-gray-500 text-white';
    }
};

const ArtistCard: React.FC<ArtistCardProps> = ({ artist, buttonText, index = 0 }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ y: -4 }}
            className="shrink-0 w-[300px] h-[300px] bg-white rounded-2xl border border-pink-100 group-hover:border-pink-300 transition-all duration-300 p-5 cursor-pointer hover:shadow-lg flex flex-col"
        >
            {/* Header: Avatar + Info */}
            <div className="flex items-start gap-3 mb-3">
                {/* Avatar */}
                <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    className="w-14 h-14 rounded-full shrink-0 object-cover bg-gray-100"
                />

                {/* Name and Badges */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-[16px] font-semibold text-[#1E1E1E]">
                            {artist.name}
                        </h3>
                        {/* Inline badges (KYC etc.) */}
                        {artist.badges.filter(b => b.type === 'kyc').map((badge, idx) => (
                            <span
                                key={`inline-${idx}`}
                                className={`px-1.5 py-0.5 text-[8px] font-bold uppercase rounded ${getBadgeStyles(badge.type)}`}
                            >
                                {badge.label}
                            </span>
                        ))}
                    </div>
                    {/* Skill badges row */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {artist.badges.filter(b => b.type !== 'kyc').map((badge, idx) => (
                            <span
                                key={`skill-${idx}`}
                                className={`px-2 py-0.5 text-[8px] font-bold uppercase rounded ${getBadgeStyles(badge.type)}`}
                            >
                                {badge.label}
                            </span>
                        ))}
                    </div>
                    <p className="text-[13px] text-[#6B6B6B] mt-1">{artist.specialty}</p>
                </div>
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-4 text-[12px] text-[#6B6B6B] mb-4">
                <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{artist.distance}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{artist.experience}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    <span>{artist.rating}</span>
                </div>
            </div>

            {/* Action Button */}
            <button className="w-full h-11 bg-white border border-gray-200 rounded-full text-[14px] font-medium text-[#1E1E1E] hover:bg-gray-50 transition-colors mb-4">
                {buttonText}
            </button>

            {/* Portfolio Thumbnails - pushed to bottom */}
            <div className="flex gap-2.5 mt-auto">
                {artist.portfolioImages.slice(0, 4).map((imgUrl, idx) => (
                    <div
                        key={idx}
                        className="flex-1 aspect-square rounded-xl overflow-hidden bg-gray-100"
                    >
                        <img
                            src={imgUrl}
                            alt={`${artist.name} work ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

export default ArtistCard;
