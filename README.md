# 🚁 FlyHigh – Drone & Chopper Booking System

## 📌 Overview

**FlyHigh** is a full-stack web application that allows users to book **drones and choppers** for various purposes such as delivery, event coverage, agriculture monitoring, and travel.

The system supports **role-based access** including:

* 👤 Users (customers)
* 👨‍✈️ Drone Pilots
* 👑 Admin

It includes features like **authentication, booking management, payment integration, and notifications**.

---

## 🚀 Features

### 👤 User Features

* Register and login securely
* Search and view available drones/choppers
* Book drones based on purpose
* Dynamic pricing calculation
* Online payment (Razorpay)
* View and cancel bookings

### 👨‍✈️ Drone Pilot Features

* Register as a pilot with license upload
* Get approval from admin
* View assigned bookings

### 👑 Admin Features

* Dashboard with analytics (users, bookings, revenue)
* Add/manage drones, choppers, and routes
* Approve/reject bookings
* Assign pilots
* Manage notifications

---

## 🧠 Tech Stack

| Layer          | Technology          |
| -------------- | ------------------- |
| Backend        | Node.js, Express.js |
| Database       | MongoDB (Mongoose)  |
| Frontend       | HTML, EJS           |
| Authentication | Sessions, bcrypt    |
| File Upload    | Multer              |
| Payment        | Razorpay            |

---

## 📁 Project Structure

```
FlyHigh/
│
├── config/                # Database configuration
├── middlewares/          # Auth middleware (isLoggedIn, isAdmin)
├── models/               # MongoDB schemas
│   ├── User.js
│   ├── DroneBooking.js
│   ├── Booking.js
│   ├── Route.js
│   ├── Chopper.js
│   └── Notification.js
│
├── routes/               # Application routes
│   ├── authRoutes.js
│   ├── adminRoutes.js
│
├── public/               # Static files & uploads
│   └── uploads/licenses/ # Pilot license documents
│
├── views/                # Frontend pages (EJS/HTML)
│   ├── login.html
│   ├── register.html
│   ├── drones.html
│   ├── bookDrone.html
│   ├── adminDashboard.html
│   ├── pilotBookings.html
│   └── ...
│
├── server.js             # Entry point of the application
├── package.json          # Dependencies
├── netlify.toml          # Deployment config
└── README.md             # Project documentation
```

---

## 🔐 Authentication & Middleware

* **isLoggedIn** → Ensures user is logged in before accessing routes
* **isAdmin** → Restricts access to admin-only features
* Sessions are used to maintain login state

---

## 🚁 Drone Booking Flow

1. User selects drone purpose
2. Views available drones
3. Enters booking details
4. System calculates price dynamically
5. Payment is processed via Razorpay
6. Booking is stored in database
7. Admin approves and assigns pilot
8. User receives notification

---

## 💰 Pricing Logic

* **Standard Drone** → pricePerHour × hours
* **Delivery/Event** → Flat rate
* **Agriculture** → Cost per acre
* **Swarm Drones** → Number of drones × hours

---

## 💳 Payment Integration

* Razorpay is used for secure payment
* Payment verification via signature validation
* Booking marked as **Paid** after successful verification

---

## 📄 Pilot Verification

* Pilots upload **license documents**
* Stored in `/public/uploads/licenses/`
* Admin reviews and approves/rejects pilots

---

## ⚙️ Installation & Setup

```bash
# Clone the repository
git clone https://github.com/your-username/FlyHigh.git

# Navigate to project folder
cd FlyHigh

# Install dependencies
npm install

# Run the server
node server.js
```

---

## 🌐 Environment Variables

Create a `.env` file and add:

```
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
```

---

## Future Enhancements

* Live drone tracking (GPS integration)
* AI-based route optimization
* Real-time notifications
* Mobile app integration

---

##  Contributors

* Karthikrv7
* Harshinee31

---

##  License

This project is developed for academic purposes.

---

##  Acknowledgement

Thanks to all contributors and mentors who supported this project.
