# 🚗 Vehicle Center - Full-Stack Car Rental Application

Vehicle Center is a premium, full-featured car rental booking web application. It is designed to provide customers with a seamless, responsive interface to browse, search, and book a wide selection of vehicles, while giving administrators a powerful management suite to control the fleet, handle reservations, manage users, and view visual analytical reports.

The project is structured as a **Monorepo** with a **React JS** frontend and a **Node.js / Express / MongoDB** backend.

---

## 🌟 Key Features

### 👤 Customer Portal
*   **Intuitive Search & Filters**: Easily browse cars by category, brand, availability, and specific location.
*   **Smooth Booking Engine**: Select pickup and dropoff dates with an interactive datepicker, automatically calculating total rental costs.
*   **User Authentication**: Robust registration, secure login, profile modification, and password updating.
*   **My Bookings Dashboard**: View booking history, check current status (Pending, Approved, Completed, Cancelled), and cancel active reservations.

### 👑 Administration Suite
*   **Analytical Dashboard**: High-level statistical cards displaying total revenue, active bookings, total cars, and user registration stats.
*   **Fleet Management (CRUD)**: Easily add new cars, upload vehicle images, modify technical specifications, set daily rental rates, and update availability status.
*   **Booking Control Room**: View all reservations across the system, update booking statuses (Approved, Completed, Cancelled), and add custom notes.
*   **User Management**: Monitor registered users, inspect their details, and manage active/suspended account statuses.

### 🛡️ Security & Performance
*   **JWT Authentication**: Secure stateless authentication using JSON Web Tokens.
*   **Password Encryption**: Safe password storage using industry-standard `bcryptjs` hashing.
*   **CORS Protection**: Access control restrictions to only allow verified origins.
*   **Rate Limiting**: Protection against DDoS and brute-force attacks via `express-rate-limit`.
*   **Security Headers**: Enhanced application security using `helmet` middleware.

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React.js (v18) | Component-based modern UI library |
| | React Router DOM (v6) | Declarative routing for single-page application navigation |
| | Sass / Scss | Advanced styling for premium custom aesthetics |
| | React Datepicker | Modern booking calendar integration |
| **Backend** | Node.js & Express.js | Fast, unopinionated web framework for backend APIs |
| **Database** | MongoDB | NoSQL Document-based database |
| | Mongoose ODM | Object Modeling tool for schemas and validation |
| **Utilities** | BcryptJS | Hashing and verification of credentials |
| | JsonWebToken (JWT) | Secure bearer token transmission |
| | Multer | Handle `multipart/form-data` for file uploads (car images) |
| | Nodemailer | E-mail configuration support |

---

## 📂 Project Directory Structure

```text
VehicleCenter/
├── backend/                  # Express API Server
│   ├── backups/              # System backups
│   ├── config/               # Database and environment configurations
│   ├── maintenance/          # Server maintenance scripts
│   ├── middleware/           # Authentication, error handling, & safety middleware
│   ├── models/               # Mongoose schemas (User, Car, Booking)
│   ├── routes/               # API endpoints (auth, cars, bookings, admin)
│   ├── scripts/              # Seeders & utility creation scripts
│   ├── seeders/              # Database mock seed data files
│   ├── uploads/              # Uploaded vehicle images
│   ├── utils/                # Helper files and custom utilities
│   ├── .env                  # Backend environment variables (ignored by Git)
│   ├── .env.example          # Sample environment variables
│   ├── server.js             # Main server entrypoint
│   └── package.json          # Backend dependencies and scripts
│
├── frontend/                 # React SPA Client
│   ├── public/               # Public assets (HTML, Favicon)
│   ├── src/                  # React Source Code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page templates (Home, Cars, Admin Dashboard, etc.)
│   │   ├── styles/           # Sass/Scss stylesheets
│   │   ├── App.js            # Main React routes definition
│   │   └── index.js          # React ReactDom entrypoint
│   ├── .env                  # Frontend environment variables (ignored by Git)
│   ├── .env.example          # Sample environment variables
│   └── package.json          # Frontend dependencies and scripts
│
├── package.json              # Monorepo Workspace configuration (npm workspaces)
├── package-lock.json         # Dependency lockfile
└── .gitignore                # Global git ignored files configuration
```

---

## 🗄️ Database Schemas (Mongoose Models)

The backend incorporates the following key schemas structured using Mongoose ODM:

### 1. User Schema ([User.js](file:///d:/all%20my/project-%20sem5/VehicleCenter/backend/models/User.js))
*   **Fields**:
    *   `firstName` / `lastName` (String, required, max 50 characters)
    *   `email` (String, required, unique, validated email format)
    *   `phone` (String, required, validated 10-digit format)
    *   `password` (String, required, minimum 6 characters, hidden from queries by default)
    *   `role` (String, enum: `['user', 'admin']`, default: `'user'`)
    *   `isActive` (Boolean, default: `true`)
    *   `profileImage` (String)
    *   `address` (Nested Object: street, city, state, zipCode, country)
    *   `preferences` (Nested Object: newsletter subscription, notification flags)
*   **Virtuals**: `fullName` (combines firstName and lastName)
*   **Hooks**: Pre-save password hashing using `bcryptjs` with salt rounds = 12.

### 2. Car Schema ([Car.js](file:///d:/all%20my/project-%20sem5/VehicleCenter/backend/models/Car.js))
*   **Fields**:
    *   `name` / `model` / `brand` (String, required)
    *   `year` (Number, min: 2000)
    *   `pricePerHour` / `pricePerDay` (Number, required, non-negative)
    *   `fuelType` (String, enum: `['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid']`)
    *   `transmission` (String, enum: `['Manual', 'Automatic', 'CVT']`)
    *   `seatingCapacity` (Number, min: 2, max: 8)
    *   `category` (String, enum: `['Economy', 'Compact', 'Mid-size', 'Full-size', 'Premium', 'Luxury', 'SUV']`)
    *   `features` (Array of Strings, AC, GPS, Bluetooth, Sunroof, etc.)
    *   `images` (Array of Objects containing image URL and alt description)
    *   `description` (String, max 1000 characters)
    *   `specifications` (engine, mileage, topSpeed, acceleration details)
    *   `availability`:
        *   `isAvailable` (Boolean, default: `true`)
        *   `availableLocations` (Array of Strings: Delhi, Mumbai, Kolkata, Bengaluru, Goa)
        *   `maintenanceSchedule` (lastService, nextService, isUnderMaintenance flags)
    *   `rating` (average, rating count)
*   **Virtuals**: `availabilityStatus` (resolves status into: 'Inactive', 'Under Maintenance', 'Booked', or 'Available')

### 3. Booking Schema ([Booking.js](file:///d:/all%20my/project-%20sem5/VehicleCenter/backend/models/Booking.js))
*   **Fields**:
    *   `user` (ObjectId ref to User schema)
    *   `car` (ObjectId ref to Car schema)
    *   `customerInfo` (Nested profile copy: name, lastName, email, phone, age, address, city, zipcode)
    *   `pickupLocation` / `dropoffLocation` (String, enum: Delhi, Mumbai, Kolkata, Bengaluru, Goa)
    *   `pickupDate` / `dropoffDate` (Date, required)
    *   `pickupTime` / `dropoffTime` (String, required)
    *   `pricePerHour` (Number, required)
    *   `totalHours` / `totalDays` (Number, automatically computed)
    *   `totalAmount` (Number, automatically calculated using duration & pricePerHour)
    *   `status` (String, enum: `['Pending', 'Confirmed', 'Completed', 'Cancelled']`)
    *   `paymentStatus` (String, enum: `['Pending', 'Paid', 'Failed', 'Refunded']`)
    *   `paymentMethod` (String, enum: `['Cash', 'Card', 'UPI', 'Net Banking']`)
    *   `adminNotes` (String)
*   **Virtuals**: `durationHours` and `durationDays`
*   **Hooks**: Pre-validation middleware to calculate total duration and total cost automatically based on date ranges.

---

## 🚀 Getting Started & Installation

Follow these steps to set up and run the application locally.

### 📋 Prerequisites
Ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16.0.0 or higher)
*   [MongoDB](https://www.mongodb.com/try/download/community) (Running locally on default port `27017` or a MongoDB Atlas cloud URI)
*   [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
Clone the project directory to your local workstation:
```bash
git clone <your-repository-url>
cd VehicleCenter
```

### Step 2: Configure Environment Variables
Copy the `.env.example` templates to `.env` in both folders and fill in the values:

1.  **Backend Environment Configuration**
    ```bash
    cp backend/.env.example backend/.env
    ```
    Open `backend/.env` and update details (e.g., `MONGO_URI`, `JWT_SECRET`).

2.  **Frontend Environment Configuration**
    ```bash
    cp frontend/.env.example frontend/.env
    ```
    Verify `REACT_APP_API_URL` matches your backend address.

---

### Step 3: Install All Dependencies
We utilize npm workspaces. You can install all root, frontend, and backend packages with a single command run from the **root directory**:
```bash
npm run setup
```
*(Alternatively, you can run `npm install` followed by `npm run install:all`)*.

---

### Step 4: Seed Database and Create Admin
Before starting the servers, initialize the database:

1.  **Seed Car Data**: Inserts sample vehicles into MongoDB.
    ```bash
    npm run seed
    ```
2.  **Create Admin User**: Registers a default administrator profile.
    ```bash
    npm run create-admin
    ```
    *Default admin credentials will be:*
    *   **Email**: `admin@carrental.com`
    *   **Password**: `admin123`

---

### Step 5: Start Development Servers
Run the following command in the **root directory** to launch both backend and frontend servers concurrently:
```bash
npm run dev
```

*   **Frontend Client**: Launches on `http://localhost:3000`
*   **Backend Server API**: Launches on `http://localhost:5000`



## 📖 API Endpoints Reference

### 🔐 Authentication Routes (`/api/auth`)
*   `POST /api/auth/register` - Create a new customer account
*   `POST /api/auth/login` - Authenticate customer & generate JWT
*   `POST /api/auth/admin/login` - Authenticate administrator
*   `GET /api/auth/me` - Fetch authenticated user details (Token required)
*   `PUT /api/auth/profile` - Update customer profile details
*   `PUT /api/auth/change-password` - Update profile password

### 🚗 Vehicle Routes (`/api/cars`)
*   `GET /api/cars` - Retrieve all cars (supports pagination & category filters)
*   `GET /api/cars/:id` - Retrieve specific vehicle by ID
*   `GET /api/cars/available/:location` - Get available cars in a location
*   `GET /api/cars/categories/list` - Fetch all unique vehicle categories
*   `POST /api/cars` - Add a new vehicle to the fleet (Admin only)
*   `PUT /api/cars/:id` - Update vehicle specifications or price (Admin only)
*   `DELETE /api/cars/:id` - Remove vehicle from the system (Admin only)

### 📅 Booking Routes (`/api/bookings`)
*   `POST /api/bookings` - Submit a new reservation request
*   `GET /api/bookings` - Retrieve current logged-in customer's booking logs
*   `GET /api/bookings/:id` - Retrieve individual booking receipt details
*   `PUT /api/bookings/:id` - Modify an existing reservation
*   `DELETE /api/bookings/:id` - Cancel an active booking

### 👑 Administrator Control Routes (`/api/admin`)
*   `GET /api/admin/dashboard` - Retrieve analytics & system statistics
*   `GET /api/admin/bookings` - Retrieve all bookings in the system
*   `PUT /api/admin/bookings/:id/status` - Approve, reject, or complete a booking
*   `GET /api/admin/users` - Retrieve directory of registered users
*   `PUT /api/admin/users/:id/status` - Block or unblock a user profile
*   `PUT /api/admin/cars/:id/availability` - Manually switch vehicle availability

---

## 📝 Available Scripts Guide

Run these commands from the root folder:

*   `npm run setup`: Run clean installations for all packages.
*   `npm run dev`: Boot up frontend and backend in concurrent watch modes.
*   `npm run build`: Build production assets for the frontend.
*   `npm run seed`: Populate the database with default fleet data.
*   `npm run create-admin`: Create default admin user account.
*   `npm run clean`: Deletes all `node_modules` folders for fresh installs.

---

## 🛡️ License

This project is licensed under the MIT License - see the LICENSE file for details.
