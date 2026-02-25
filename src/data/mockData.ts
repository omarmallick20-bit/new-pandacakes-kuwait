import { Category, Cake } from '@/types';

// Mock data for existing cake images
import heroCake from '@/assets/hero-cake.jpg';
import redVelvetCupcake from '@/assets/red-velvet-cupcake.jpg';
import birthdayCake from '@/assets/birthday-cake.jpg';
import chocolateBrownies from '@/assets/chocolate-brownies.jpg';
import strawberryShortcake from '@/assets/strawberry-shortcake.jpg';
import lemonCheesecake from '@/assets/lemon-cheesecake.jpg';

// Category images are now served from public folder

export const categories: Category[] = [
  { id: 'boys-cakes', name: 'Boys Cakes', image: '/images/categories/boy.jpg' },
  { id: 'chocolates-brownies', name: 'Chocolates & Brownies', image: '/images/categories/chocolatebrownie.jpg' },
  { id: 'classic-cakes', name: 'Classic Cakes', image: '/images/categories/classic.jpg' },
  { id: 'comic-cakes', name: 'Comic Cakes', image: '/images/categories/comic.jpg' },
  { id: 'cupcakes', name: 'Cupcakes', image: '/images/categories/Cupcakes.jpg' },
  { id: 'customized-cakes', name: 'Customized Cakes', image: '/images/categories/customized-cakes.jpg' },
  { id: 'european-cakes', name: 'European Cakes', image: '/images/categories/european.jpg' },
  { id: 'family-cakes', name: 'Family Cakes', image: '/images/categories/family.jpg' },
  { id: 'flower-balloon-cakes', name: 'Flower & Balloon Cakes', image: '/images/categories/flower.jpg' },
  { id: 'for-girls', name: 'For Girls', image: '/images/categories/girls.jpg' },
  { id: 'graduation-corner', name: 'Graduation Corner', image: '/images/categories/graduation.jpg' },
  { id: 'islamic-cakes', name: 'Islamic Cakes', image: '/images/categories/islamic.jpg' },
  { id: 'marble-cakes', name: 'Marble Cakes', image: '/images/categories/marble.jpg' },
  { id: 'movies-tv', name: 'Movies & TV', image: '/images/categories/movies.jpg' },
  { id: 'photo-cakes', name: 'Photo Cakes', image: '/images/categories/photo.jpg' },
  { id: 'retro-cakes', name: 'Retro Cakes', image: '/images/categories/retro.jpg' },
  { id: 'small-cakes', name: 'Small Cakes', image: '/images/categories/small.jpg' },
  { id: 'special-items', name: 'Special Items', image: '/images/categories/special.jpg' },
  { id: 'sports-corner', name: 'Sports Corner', image: '/images/categories/sports.jpg' },
  { id: 'valentine-corner', name: 'Valentine Corner', image: '/images/categories/valentine.jpg' },
  { id: 'wedding-corner', name: 'Wedding Corner', image: '/images/categories/wedding-corner.jpg' },
  { id: 'zodiac-sign-cakes', name: 'Zodiac Sign Cakes', image: '/images/categories/zodiac.jpg' },
  { id: 'candles-toppers', name: 'Candles & Toppers', image: '/images/categories/candles-toppers.jpg' },
];

export const cakes: Cake[] = [
  {
    id: 'chocolate-layer-cake',
    name: 'Chocolate Layer Cake',
    categoryId: 'classic-cakes',
    image: heroCake,
    description: 'Rich chocolate cake with smooth cream frosting',
    inches: ['6', '8', '10'],
    layers: 3,
    servingSize: '8-12 people',
    preparationTime: '24 hours',
    basePrice: 45
  },
  {
    id: 'red-velvet-cupcake',
    name: 'Red Velvet Cupcake',
    categoryId: 'cupcakes',
    image: redVelvetCupcake,
    description: 'Classic red velvet with cream cheese frosting',
    inches: ['Standard'],
    layers: 1,
    servingSize: '1 person',
    preparationTime: '12 hours',
    basePrice: 8
  },
  {
    id: 'birthday-celebration-cake',
    name: 'Birthday Celebration Cake',
    categoryId: 'family-cakes',
    image: birthdayCake,
    description: 'Vanilla cake with colorful sprinkles and candles',
    inches: ['6', '8', '10'],
    layers: 2,
    servingSize: '6-10 people',
    preparationTime: '24 hours',
    basePrice: 35
  },
  {
    id: 'chocolate-fudge-brownies',
    name: 'Chocolate Fudge Brownies',
    categoryId: 'chocolates-brownies',
    image: chocolateBrownies,
    description: 'Decadent brownies with rich fudge topping',
    inches: ['9x9 pan'],
    layers: 1,
    servingSize: '12 pieces',
    preparationTime: '6 hours',
    basePrice: 25
  },
  {
    id: 'strawberry-shortcake',
    name: 'Strawberry Shortcake',
    categoryId: 'classic-cakes',
    image: strawberryShortcake,
    description: 'Fresh strawberries with fluffy whipped cream',
    inches: ['6', '8', '10'],
    layers: 2,
    servingSize: '6-10 people',
    preparationTime: '24 hours',
    basePrice: 30
  },
  {
    id: 'lemon-cheesecake',
    name: 'Lemon Cheesecake',
    categoryId: 'european-cakes',
    image: lemonCheesecake,
    description: 'Creamy cheesecake with graham cracker crust',
    inches: ['8', '10'],
    layers: 1,
    servingSize: '8-12 people',
    preparationTime: '48 hours',
    basePrice: 28
  },
  // Add more sample cakes for different categories
  {
    id: 'superhero-cake',
    name: 'Superhero Adventure Cake',
    categoryId: 'boys-cakes',
    image: heroCake,
    description: 'Action-packed superhero themed cake',
    inches: ['6', '8', '10'],
    layers: 2,
    servingSize: '8-12 people',
    preparationTime: '48 hours',
    basePrice: 55
  },
  {
    id: 'princess-castle-cake',
    name: 'Princess Castle Cake',
    categoryId: 'for-girls',
    image: strawberryShortcake,
    description: 'Magical princess castle with pink decorations',
    inches: ['8', '10'],
    layers: 3,
    servingSize: '10-15 people',
    preparationTime: '48 hours',
    basePrice: 65
  }
];

export const flavors = [
  'Mix',
  'Vanilla & Red Velvet',
  'Vanilla & Chocolate',
  'Pure Vanilla',
  'Rich Chocolate',
  'Strawberry'
];

export const variants = [
  { size: '6 inch', price: 0 },
  { size: '8 inch', price: 15 },
  { size: '10 inch', price: 30 }
];
