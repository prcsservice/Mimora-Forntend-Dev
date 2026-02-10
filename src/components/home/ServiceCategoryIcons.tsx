import React from 'react';

interface ServiceCategory {
    id: string;
    label: string;
    icon: string;
}

const SERVICES: ServiceCategory[] = [
    { id: 'instant', label: 'Instant Up', icon: '/info/home/nav1.png' },
    { id: 'flexi', label: 'Flexi Up', icon: '/info/home/nav3.png' },
    { id: 'workshop', label: 'Workshop', icon: '/info/home/nav2.png' },
];

const ServiceCategoryIcons: React.FC = () => {
    return (
        <div className="md:hidden w-full bg-white px-4 py-3">
            <div className="flex items-center justify-around gap-2">
                {SERVICES.map((service) => (
                    <button
                        key={service.id}
                        className="flex flex-col items-center gap-1.5 min-w-0 flex-1"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:border-[#E84A7F] transition-colors">
                            <img
                                src={service.icon}
                                alt={service.label}
                                className="w-8 h-8 object-contain"
                            />
                        </div>
                        <span className="text-[11px] font-medium text-[#1E1E1E] text-center">
                            {service.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ServiceCategoryIcons;
