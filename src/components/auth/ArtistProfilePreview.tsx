import React from 'react';

interface ArtistProfilePreviewProps {
    name?: string;
    profilePicUrl?: string;
    profession?: string[];
    bio?: string;
    kycVerified?: boolean;
    certificateUrl?: string;
    city?: string;
    state?: string;
    street?: string;
    skills?: string[];
    portfolioImages?: string[];
}

const ArtistProfilePreview: React.FC<ArtistProfilePreviewProps> = ({
    name,
    profilePicUrl,
    profession = [],
    bio,
    kycVerified = false,
    certificateUrl,
    city,
    state,
    street,
    skills = [],
    portfolioImages = [],
}) => {
    const hasLocation = city || state || street;
    const hasCertificate = !!certificateUrl;
    const locationStr = [street, city, state].filter(Boolean).join(', ');

    // Show empty state if no data
    const isEmpty = !name && !profilePicUrl && profession.length === 0 && !bio && !hasLocation;

    return (
        <div className="w-full">
            <h2 className="text-xl font-semibold text-[#964152] mb-5">Profile Preview</h2>

            {isEmpty ? (
                // Empty state - matches image 4
                <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        {/* Default avatar */}
                        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>

                        <div className="flex-1">
                            <h3 className="font-semibold text-[#1E1E1E] text-lg">Your Name</h3>
                            {hasLocation && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="10" r="3" />
                                        <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z" />
                                    </svg>
                                    <span className="truncate">{locationStr}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Full preview - matches image 3
                <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        {/* Profile picture */}
                        <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
                            {profilePicUrl ? (
                                <img
                                    src={profilePicUrl}
                                    alt={name || 'Artist'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Name + Badges */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h3 className="font-semibold text-[#1E1E1E] text-base">
                                    {name || 'Your Name'}
                                </h3>
                                {/* KYC Badge */}
                                {kycVerified && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white uppercase">
                                        KYC
                                    </span>
                                )}
                                {/* Certified Badge */}
                                {hasCertificate && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-[#1E1E1E] uppercase">
                                        CERTIFIED
                                    </span>
                                )}
                            </div>

                            {/* Profession - Red text */}
                            {profession.length > 0 && (
                                <p className="text-[13px] text-red-600 font-medium leading-tight">
                                    {profession.join(' · ')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    {bio && (
                        <p className="mt-3 text-xs text-gray-600 leading-relaxed line-clamp-2">
                            {bio}
                        </p>
                    )}

                    {/* Location */}
                    {hasLocation && (
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-500">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                                <circle cx="12" cy="10" r="3" />
                                <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z" />
                            </svg>
                            <span className="truncate">{locationStr}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Skills section - shown below profile card */}
            {skills.length > 0 && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {skills.map((skill) => (
                            <span
                                key={skill}
                                className="inline-flex items-center px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-[11px] font-medium rounded-full"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Works / Portfolio section */}
            {portfolioImages.length > 0 && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Works</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                        {portfolioImages.slice(0, 6).map((img, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                                <img
                                    src={img}
                                    alt={`Work ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArtistProfilePreview;
