import React from 'react';
import { motion } from 'framer-motion';

interface Category {
    id: string;
    name: string;
    image: string;
}

const CategoriesSection: React.FC = () => {
    const categories: Category[] = [
        { id: 'makeup', name: 'Makeup', image: '/info/home/catagory section/mackup.png' },
        { id: 'nail', name: 'Nail', image: '/info/home/catagory section/nail.png' },
        { id: 'hairstylist', name: 'Hairstylist', image: '/info/home/catagory section/hairstylist.png' },
        { id: 'saree-draping', name: 'Saree Draping', image: '/info/home/catagory section/saree daping.png' },
        { id: 'saree-pleating', name: 'Saree Pleating', image: '/info/home/catagory section/saree plating.png' },
        { id: 'mehendi', name: 'Mehendi', image: '/info/home/catagory section/mahendi.png' },
    ];

    return (
        <section className="py-10 px-4 md:px-10">
            <div className="max-w-[1440px] mx-auto">
                {/* Section Title */}
                <h2 className="text-[18px] md:text-[20px] font-semibold text-[#1E1E1E] mb-6">
                    Categories
                </h2>

                {/* Categories Grid - 6 equal columns filling full width */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-5">
                    {categories.map((category, index) => (
                        <motion.button
                            key={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08, duration: 0.4 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex flex-col items-center gap-2.5 group cursor-pointer"
                        >
                            {/* Card with image */}
                            <div
                                className="w-full aspect-square rounded-2xl overflow-hidden border border-pink-100 group-hover:border-pink-300 transition-all duration-300"
                                style={{
                                    backgroundColor: '#F0F0F0',
                                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
                                }}
                            >
                                <img
                                    src={category.image}
                                    alt={category.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>

                            {/* Category Label */}
                            <span className="text-[13px] md:text-[14px] font-medium text-[#1E1E1E] group-hover:text-[#E84A7F] transition-colors">
                                {category.name}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoriesSection;
