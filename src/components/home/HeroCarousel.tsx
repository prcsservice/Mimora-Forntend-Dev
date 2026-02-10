import React, { useState, useEffect, useCallback, useRef } from 'react';

interface CarouselImage {
    id: number;
    src: string;
    alt: string;
}

const IMAGES: CarouselImage[] = [
    { id: 0, src: '/info/home/3daa4b9a59122c9b89963e9547aaaf5082f7cb3f.png', alt: 'Saree Draping' },
    { id: 1, src: '/info/home/dc70ace0b4a13e50170f19ceedc5b3c94e064c6f.png', alt: 'Hairstyling' },
    { id: 2, src: '/info/home/3d1bd4a1cacd7547f4bd8c65406c0d9830008248.png', alt: 'Bridal Makeup' },
    { id: 3, src: '/info/home/52e1909c9f0bc6c19f1d19860f5d1110a4d82585.png', alt: 'Nail Art' },
    { id: 4, src: '/info/home/298d5512b1038ab125d881aa9937929c4a74d009.png', alt: 'Mehendi' },
];

const TOTAL = IMAGES.length;
const AUTO_PLAY_INTERVAL = 4000;
const TRANSITION_DURATION = 700;
const GAP = 16; // px between cards

// Build a triple-buffered array for infinite scrolling: [...images, ...images, ...images]
const TRACK_IMAGES = [...IMAGES, ...IMAGES, ...IMAGES];

/**
 * Full-width infinite carousel with conveyor-belt sliding animation.
 * Images slide physically left one at a time. Center image is tallest (pyramid style).
 * Edge images are clipped by the viewport for the infinite feel.
 */
const HeroCarousel: React.FC = () => {
    // cardWidth is measured dynamically
    const [cardWidth, setCardWidth] = useState(280);
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // The "logical" center of the middle copy starts at index TOTAL (the first image of the second copy)
    // We track position as the index within TRACK_IMAGES that is currently in the center
    const [centerPos, setCenterPos] = useState(TOTAL); // start at middle copy's first image
    const [isAnimating, setIsAnimating] = useState(false);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPausedRef = useRef(false);

    // Calculate card width based on container
    useEffect(() => {
        const updateCardWidth = () => {
            const vw = window.innerWidth;
            // Mobile: One prominent card (~80% width) with side previews
            // Desktop: ~5 visible cards (pyramid style)
            if (vw < 768) {
                // Mobile: prominent center card
                setCardWidth(Math.floor(vw * 0.8));
            } else {
                // Desktop: multiple cards
                const visibleCards = vw < 1024 ? 4 : 5;
                const totalGaps = visibleCards;
                const cw = Math.floor((vw - totalGaps * GAP) / visibleCards);
                setCardWidth(Math.min(cw, 340));
            }
        };
        updateCardWidth();
        window.addEventListener('resize', updateCardWidth);
        return () => window.removeEventListener('resize', updateCardWidth);
    }, []);

    // Calculate the translateX so that `centerPos` is centered on screen
    const getTranslateX = useCallback((pos: number) => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const step = cardWidth + GAP;
        // Center of screen offset
        const centerOffset = vw / 2 - cardWidth / 2;
        return centerOffset - pos * step;
    }, [cardWidth]);

    // Slide to next
    const goNext = useCallback(() => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTransitionEnabled(true);
        setCenterPos(prev => prev + 1);
    }, [isAnimating]);

    // After transition ends, check if we need to silently jump back to the canonical (middle copy) range
    const handleTransitionEnd = useCallback(() => {
        setIsAnimating(false);

        setCenterPos(prev => {
            // If we've gone past the middle copy, jump back silently
            if (prev >= TOTAL * 2) {
                setTransitionEnabled(false);
                // Use requestAnimationFrame to batch the no-transition reset
                requestAnimationFrame(() => {
                    // The state will already be updated, re-enable transition on next frame
                    requestAnimationFrame(() => {
                        setTransitionEnabled(true);
                    });
                });
                return prev - TOTAL;
            }
            if (prev < TOTAL) {
                setTransitionEnabled(false);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTransitionEnabled(true);
                    });
                });
                return prev + TOTAL;
            }
            return prev;
        });
    }, []);

    // Auto-play
    useEffect(() => {
        const startTimer = () => {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                if (!isPausedRef.current) {
                    goNext();
                }
            }, AUTO_PLAY_INTERVAL);
        };
        startTimer();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [goNext]);

    const handleMouseEnter = () => {
        isPausedRef.current = true;
    };

    const handleMouseLeave = () => {
        isPausedRef.current = false;
    };

    // Determine height for each card based on distance from center
    const getCardHeight = (index: number): number => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const distance = Math.abs(index - centerPos);

        if (isMobile) {
            // Mobile: Center image is taller, sides are shorter
            if (distance === 0) return 420; // center - taller
            if (distance === 1) return 340; // immediate sides
            return 320; // far sides
        } else {
            // Desktop: Pyramid effect
            if (distance === 0) return 420; // center
            if (distance === 1) return 360; // immediate sides
            return 310; // far sides and beyond
        }
    };

    const translateX = getTranslateX(centerPos);

    return (
        <div
            ref={containerRef}
            className="relative w-screen overflow-hidden"
            style={{ marginLeft: 'calc(-50vw + 50%)' }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Sliding track */}
            <div
                ref={trackRef}
                className="flex items-center"
                style={{
                    gap: `${GAP}px`,
                    transform: `translateX(${translateX}px)`,
                    transition: transitionEnabled
                        ? `transform ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
                        : 'none',
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {TRACK_IMAGES.map((image, index) => {
                    const height = getCardHeight(index);
                    const isCenterCard = index === centerPos;

                    return (
                        <div
                            key={`${image.id}-${index}`}
                            className="shrink-0 overflow-hidden"
                            style={{
                                width: `${cardWidth}px`,
                                height: `${height}px`,
                                transition: transitionEnabled
                                    ? `height ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
                                    : 'none',
                                boxShadow: isCenterCard
                                    ? '0 20px 50px rgba(0, 0, 0, 0.12)'
                                    : '0 8px 24px rgba(0, 0, 0, 0.06)',
                            }}
                        >
                            <img
                                src={image.src}
                                alt={image.alt}
                                className="w-full h-full object-cover"
                                loading="eager"
                                draggable={false}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HeroCarousel;

