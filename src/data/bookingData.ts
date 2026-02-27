import type { Vehicle, ServicePackage, AddOn } from '@/types/booking';

export const vehicles: Vehicle[] = [
  {
    id: 'vehicle-sedan',
    type: 'sedan',
    name: 'Small (Sedan)',
    subtitle: 'From $149',
    price: 149,
    description: '2-door or 4-door compact cars, coupes, and small sedans.',
    image: '/vehicle-sedan.jpg',
  },
  {
    id: 'vehicle-crossover',
    type: 'crossover',
    name: 'Medium (Crossover)',
    subtitle: 'From $199',
    price: 199,
    description: 'Mid-size SUVs, small trucks, and five-passenger crossovers.',
    image: '/vehicle-crossover.jpg',
  },
  {
    id: 'vehicle-suv',
    type: 'suv',
    name: 'SUV (Full Size)',
    subtitle: 'From $249',
    price: 249,
    description: 'Large 3-row SUVs, full-size pickup trucks, and minivans.',
    image: '/vehicle-suv.jpg',
  },
  {
    id: 'vehicle-luxury',
    type: 'luxury',
    name: 'Luxury / Exotic',
    subtitle: 'Custom Quote',
    price: 0,
    description: 'Specialty paint, carbon fiber bodies, and classic restorations.',
    image: '/vehicle-luxury.jpg',
  },
];

export const servicePackages: ServicePackage[] = [
  {
    id: 'essential',
    name: 'Essential Detail',
    description: 'Complete exterior wash, interior vacuum, and glass cleaning',
    price: 149,
    features: [
      'Hand wash & dry',
      'Wheel cleaning',
      'Interior vacuum',
      'Glass cleaning',
      'Tire dressing',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Detail',
    description: 'Full clay bar treatment, paint decontamination, and ceramic spray',
    price: 299,
    features: [
      'Everything in Essential',
      'Clay bar treatment',
      'Paint decontamination',
      'Ceramic spray application',
      'Leather conditioning',
      'Dashboard protection',
    ],
    recommended: true,
  },
  {
    id: 'ultimate',
    name: 'Ultimate Detail',
    description: 'Full paint correction, 1-year ceramic coating, and engine bay detail',
    price: 499,
    features: [
      'Everything in Premium',
      'Full paint correction',
      '1-year ceramic coating',
      'Engine bay detail',
      'Headlight restoration',
      'Odor elimination',
    ],
  },
];

export const addOns: AddOn[] = [
  { id: 'ceramic-shield', name: 'Ceramic Shield XL', price: 89, selected: false },
  { id: 'paint-protection', name: 'Paint Protection Film', price: 199, selected: false },
  { id: 'leather-treatment', name: 'Interior Leather Treatment', price: 49, selected: false },
  { id: 'headlight-restoration', name: 'Headlight Restoration', price: 39, selected: false },
  { id: 'wheel-coating', name: 'Wheel Ceramic Coating', price: 79, selected: false },
];

export const timeSlots = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM',
  '1:30 PM',
  '2:00 PM',
  '2:30 PM',
  '3:00 PM',
  '3:30 PM',
  '4:00 PM',
  '4:30 PM',
  '5:00 PM',
  '5:30 PM',
];
