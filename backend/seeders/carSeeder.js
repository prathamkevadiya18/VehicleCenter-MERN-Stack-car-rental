const mongoose = require('mongoose');
const Car = require('../models/Car');
require('dotenv').config();

const cars = [
  {
    name: 'Audi A1 S-Line',
    model: 'A1',
    brand: 'Audi',
    year: 2023,
    category: 'Compact',
    seatingCapacity: 4,
    description: 'Premium compact car with sporty design and advanced features',
    specifications: {
      engine: '1.4L TFSI',
      mileage: '15 km/l',
      topSpeed: '200 km/h',
      acceleration: '8.2s 0-100 km/h'
    },
    fuelType: 'Petrol',
    transmission: 'Automatic',
    pricePerHour: 45,
    pricePerDay: 350,
    images: [
      { url: '/uploads/cars/audia1.jpg', alt: 'Audi A1 S-Line' }
    ],
    features: ['GPS', 'AC', 'Bluetooth', 'USB Charging'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Delhi', 'Mumbai', 'Bengaluru']
    },
    rating: {
      average: 4.5,
      count: 25
    }
  },
  {
    name: 'Golf 6',
    model: 'Golf',
    brand: 'Volkswagen',
    year: 2022,
    category: 'Compact',
    seatingCapacity: 5,
    description: 'Reliable and efficient hatchback perfect for city driving',
    specifications: {
      engine: '1.6L TDI',
      mileage: '18 km/l',
      topSpeed: '190 km/h',
      acceleration: '10.2s 0-100 km/h'
    },
    fuelType: 'Diesel',
    transmission: 'Manual',
    pricePerHour: 37,
    pricePerDay: 280,
    images: [
      { url: '/uploads/cars/golf6.jpg', alt: 'Golf 6' }
    ],
    features: ['AC', 'Bluetooth'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Delhi', 'Kolkata', 'Goa']
    },
    rating: {
      average: 4.2,
      count: 18
    }
  },
  {
    name: 'Toyota Camry',
    model: 'Camry',
    brand: 'Toyota',
    year: 2023,
    category: 'Mid-size',
    seatingCapacity: 5,
    description: 'Spacious and comfortable sedan ideal for long trips',
    specifications: {
      engine: '2.5L Hybrid',
      mileage: '20 km/l',
      topSpeed: '180 km/h',
      acceleration: '8.5s 0-100 km/h'
    },
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    pricePerHour: 55,
    pricePerDay: 420,
    images: [
      { url: '/uploads/cars/toyotacamry.jpg', alt: 'Toyota Camry' }
    ],
    features: ['GPS', 'Leather Seats', 'Sunroof'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Mumbai', 'Bengaluru', 'Delhi']
    },
    rating: {
      average: 4.7,
      count: 32
    }
  },
  {
    name: 'BMW 320 ModernLine',
    model: '320i',
    brand: 'BMW',
    year: 2023,
    category: 'Luxury',
    seatingCapacity: 5,
    description: 'Luxury sedan with premium features and exceptional performance',
    specifications: {
      engine: '2.0L TwinPower Turbo',
      mileage: '12 km/l',
      topSpeed: '240 km/h',
      acceleration: '7.1s 0-100 km/h'
    },
    fuelType: 'Petrol',
    transmission: 'Automatic',
    pricePerHour: 80,
    pricePerDay: 600,
    images: [
      { url: '/uploads/cars/bmw320.jpg', alt: 'BMW 320 ModernLine' }
    ],
    features: ['Leather Seats', 'GPS', 'Backup Camera'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Mumbai', 'Delhi', 'Bengaluru']
    },
    rating: {
      average: 4.8,
      count: 15
    }
  },
  {
    name: 'Mercedes-Benz GLK',
    model: 'GLK-Class',
    brand: 'Mercedes-Benz',
    year: 2022,
    category: 'SUV',
    seatingCapacity: 5,
    description: 'Luxury SUV with superior comfort and off-road capabilities',
    specifications: {
      engine: '2.0L Turbo',
      mileage: '10 km/l',
      topSpeed: '220 km/h',
      acceleration: '6.8s 0-100 km/h'
    },
    fuelType: 'Petrol',
    transmission: 'Automatic',
    pricePerHour: 95,
    pricePerDay: 750,
    images: [
      { url: '/uploads/cars/benz.jpg', alt: 'Mercedes-Benz GLK' }
    ],
    features: ['Leather Seats', 'GPS', 'Sunroof'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Delhi', 'Mumbai', 'Goa']
    },
    rating: {
      average: 4.9,
      count: 8
    }
  },
  {
    name: 'VW Passat CC',
    model: 'Passat CC',
    brand: 'Volkswagen',
    year: 2022,
    category: 'Mid-size',
    seatingCapacity: 4,
    description: 'Elegant coupe-style sedan with sophisticated design',
    specifications: {
      engine: '2.0L TSI',
      mileage: '14 km/l',
      topSpeed: '230 km/h',
      acceleration: '7.5s 0-100 km/h'
    },
    fuelType: 'Petrol',
    transmission: 'Automatic',
    pricePerHour: 65,
    pricePerDay: 480,
    images: [
      { url: '/uploads/cars/passatcc.jpg', alt: 'VW Passat CC' }
    ],
    features: ['Leather Seats', 'GPS', 'Sunroof'],
    availability: {
      isAvailable: true,
      isUnderMaintenance: false,
      availableLocations: ['Kolkata', 'Bengaluru', 'Goa']
    },
    rating: {
      average: 4.4,
      count: 12
    }
  }
];

const seedCars = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing cars
    await Car.deleteMany({});
    console.log('Cleared existing car data');

    // Insert new cars
    await Car.insertMany(cars);
    console.log('Car data seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding car data:', error);
    process.exit(1);
  }
};

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedCars();
}

module.exports = { seedCars, cars };
