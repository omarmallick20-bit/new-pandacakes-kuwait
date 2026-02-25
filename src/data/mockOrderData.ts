export interface MockOrder {
  id: string;
  orderNumber: string;
  platform: 'Website' | 'In-house' | 'Talabat' | 'Snoonu' | 'Rafeeq' | 'Bleems';
  customerName: string;
  phoneNumber: string;
  deliveryDateTime: string;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Delivered';
  paymentMethod: 'COD' | 'Card' | 'Online';
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    customizations?: string;
    image?: string;
  }>;
  address: {
    street: string;
    area: string;
    building?: string;
    floor?: string;
    apartment?: string;
    latitude?: number;
    longitude?: number;
  };
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  driver?: string;
}

export const mockOrders: MockOrder[] = [
  {
    id: "1",
    orderNumber: "25JAN-0001",
    platform: "Website",
    customerName: "Sarah Al-Mahmoud",
    phoneNumber: "+974 3355 4466",
    deliveryDateTime: "2025-01-26T14:00:00",
    status: "Pending",
    paymentMethod: "COD",
    totalAmount: 180,
    items: [
      {
        name: "Chocolate Birthday Cake",
        quantity: 1,
        customizations: "8 inch, 2 layers, Happy Birthday Sarah",
        image: "/images/categories/Classic Cakes.jpg"
      }
    ],
    address: {
      street: "Al Sadd Street",
      area: "Al Sadd",
      building: "Building 15",
      floor: "3rd Floor",
      apartment: "Apt 12",
      latitude: 25.2854,
      longitude: 51.5310
    },
    notes: "Ring doorbell twice",
    createdAt: "2025-01-25T09:30:00"
  },
  {
    id: "2",
    orderNumber: "TAL-2025-0045",
    platform: "Talabat",
    customerName: "Ahmed Hassan",
    phoneNumber: "+974 5566 7788",
    deliveryDateTime: "2025-01-25T16:30:00",
    status: "Preparing",
    paymentMethod: "Card",
    totalAmount: 95,
    items: [
      {
        name: "Red Velvet Cupcakes",
        quantity: 6,
        customizations: "Extra cream cheese frosting",
        image: "/images/categories/Cupcakes.jpg"
      }
    ],
    address: {
      street: "C Ring Road",
      area: "Al Rayyan",
      building: "Villa 23"
    },
    createdAt: "2025-01-25T08:15:00",
    acceptedAt: "2025-01-25T08:20:00"
  },
  {
    id: "3",
    orderNumber: "SNO-456789",
    platform: "Snoonu",
    customerName: "Fatima Al-Rashid",
    phoneNumber: "+974 4477 8899",
    deliveryDateTime: "2025-01-25T18:00:00",
    status: "Ready",
    paymentMethod: "Online",
    totalAmount: 220,
    items: [
      {
        name: "Wedding Corner Cake",
        quantity: 1,
        customizations: "12 inch, 3 layers, vanilla with strawberry filling",
        image: "/images/categories/Wedding Corner.jpg"
      }
    ],
    address: {
      street: "Salwa Road",
      area: "Al Waab",
      building: "Tower B",
      floor: "15th Floor",
      apartment: "1502"
    },
    createdAt: "2025-01-24T14:22:00",
    acceptedAt: "2025-01-24T14:25:00",
    driver: "Mohammad Ali"
  },
  {
    id: "4",
    orderNumber: "RAF-78901",
    platform: "Rafeeq",
    customerName: "Omar Khalil",
    phoneNumber: "+974 6688 9900",
    deliveryDateTime: "2025-01-26T12:00:00",
    status: "Pending",
    paymentMethod: "COD",
    totalAmount: 150,
    items: [
      {
        name: "Sports Corner Cake",
        quantity: 1,
        customizations: "Football theme, 10 inch",
        image: "/images/categories/Sports Corner.jpg"
      }
    ],
    address: {
      street: "Doha Corniche",
      area: "West Bay",
      building: "Marina Tower"
    },
    createdAt: "2025-01-25T10:45:00"
  },
  {
    id: "5",
    orderNumber: "BLM-2025-012",
    platform: "Bleems",
    customerName: "Layla Mohamed",
    phoneNumber: "+974 7799 0011",
    deliveryDateTime: "2025-01-25T20:00:00",
    status: "Out for Delivery",
    paymentMethod: "Card",
    totalAmount: 85,
    items: [
      {
        name: "Chocolate Brownies",
        quantity: 12,
        customizations: "Mixed variety pack",
        image: "/images/categories/Chocolates & Brownies.jpg"
      }
    ],
    address: {
      street: "Al Wakalat Street",
      area: "Old Airport",
      building: "Building 8",
      apartment: "Ground Floor"
    },
    createdAt: "2025-01-25T07:30:00",
    acceptedAt: "2025-01-25T07:35:00",
    driver: "Ali Rahman"
  },
  {
    id: "6",
    orderNumber: "25JAN-0002",
    platform: "In-house",
    customerName: "Maryam Al-Thani",
    phoneNumber: "+974 3344 5566",
    deliveryDateTime: "2025-01-27T10:00:00",
    status: "Pending",
    paymentMethod: "COD",
    totalAmount: 320,
    items: [
      {
        name: "Customized Birthday Cake",
        quantity: 1,
        customizations: "Photo cake with family picture, 14 inch, chocolate",
        image: "/images/categories/Photo Cakes.jpg"
      }
    ],
    address: {
      street: "Al Muntazah Street",
      area: "Al Muntazah",
      building: "Villa 45"
    },
    notes: "Birthday celebration for grandmother - please handle with extra care",
    createdAt: "2025-01-25T11:20:00"
  }
];

export const platformIcons: Record<MockOrder['platform'], string> = {
  'Website': '🌐',
  'In-house': '🏪',
  'Talabat': '🛵',
  'Snoonu': '🚗',
  'Rafeeq': '🚚',
  'Bleems': '📱'
};

export const statusColors: Record<MockOrder['status'], string> = {
  'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Preparing': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Ready': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Out for Delivery': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Delivered': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
};

export const mockDrivers = [
  "Mohammad Ali",
  "Ali Rahman",
  "Hassan Ahmed",
  "Omar Khalil",
  "Ahmed Hassan"
];