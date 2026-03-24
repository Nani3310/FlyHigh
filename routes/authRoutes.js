const Booking = require('../models/Booking');

const Chopper = require('../models/Chopper');
const Route = require('../models/Route');
const Drone = require('../models/Drone');
const DroneBooking = require('../models/DroneBooking');

const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/uploads/licenses');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Notification = require('../models/Notification');

const razorpay = (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
  : null;

const router = express.Router();

// Register page
router.get('/register', (req, res) => {
  res.render('register');
});

// Register user
router.post('/register', upload.single('licenseDocument'), async (req, res) => {
  const { name, email, password, countryCode, mobile, role, experienceYears } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send("<script>alert('User already exists!!'); window.history.back();</script>");
    }

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.send("<script>alert('Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character.'); window.history.back();</script>");
    }

    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res.send("<script>alert('Invalid mobile number format. Must be exactly 10 digits.'); window.history.back();</script>");
    }

    const fullMobileNumber = `${countryCode} ${mobile}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      mobile: fullMobileNumber,
      role: role || 'user',
      experienceYears: experienceYears ? parseInt(experienceYears) : null,
      licenseDocument: req.file ? `/uploads/licenses/${req.file.filename}` : null
    });

    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.send("<script>alert('An error occurred during registration.'); window.history.back();</script>");
  }
});

// Login page
router.get('/login', (req, res) => {
  res.render('login');
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) return res.send("<script>alert('User not found'); window.history.back();</script>");

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) return res.send("<script>alert('Wrong password'); window.history.back();</script>");

  req.session.user = user;
  res.redirect('/');
});

// Dashboard (protected)
const { isLoggedIn } = require('../middlewares/authMiddleware');

router.get('/', isLoggedIn, (req, res) => {
  res.send(`Welcome ${req.session.user.name}`);
});

router.post('/search', async (req, res) => {

  const { from, to, date, time } = req.body;

  const route = await Route.findOne({ from, to });

  if (!route) return res.render("noRoute", { from, to, date });

  const choppers = await Chopper.find({ status: "available" });

  res.render("searchResults", {
    choppers,
    route,
    date,
    time
  });

});

// Booking page
router.get('/book/:chopperId/:routeId', isLoggedIn, async (req, res) => {
  const { date, time } = req.query;
  const chopper = await Chopper.findById(req.params.chopperId);
  const route = await Route.findById(req.params.routeId);

  res.render('bookChopper', { chopper, route, date, time });
});


// Create booking
router.post('/book', isLoggedIn, async (req, res) => {

  const { chopperId, routeId, passengers, passengerDetails, date, time, purpose, purposeOther } = req.body;

  const chopper = await Chopper.findById(chopperId);
  const route = await Route.findById(routeId);

  const totalFare = chopper.pricePerKm * route.distanceKm * passengers;

  const finalPurpose = purpose === 'Other' && purposeOther ? `Other - ${purposeOther}` : purpose;

  const booking = await Booking.create({
    userId: req.session.user._id,
    chopperId,
    routeId,
    passengers,
    passengerDetails,
    totalFare,
    flightDate: date,
    flightTime: time,
    purpose: finalPurpose,
    paymentStatus: 'Pending'
  });

  if (razorpay) {
    try {
      const options = {
        amount: Math.round(totalFare * 100), // amount in paise
        currency: "INR",
        receipt: booking._id.toString()
      };
      const order = await razorpay.orders.create(options);

      booking.stripeSessionId = order.id; // Reusing DB field simply as razorpay order ID
      await booking.save();

      return res.render('checkout', {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: options.amount,
        orderId: order.id,
        bookingId: booking._id,
        bookingType: 'chopper',
        user: req.session.user
      });
    } catch (err) {
      console.log('Razorpay Error:', err);
      return res.send("Payment initiation failed. Please try again.");
    }
  } else {
    return res.send("Payment gateway not configured.");
  }

});



//CANCEL BOOKING
router.get('/cancel-booking/:id', isLoggedIn, async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { 
    status: "Cancelled", 
    cancelReason: req.query.reason || "No reason provided" 
  });
  res.redirect('/my-bookings');
});

//logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});
// ---------- DRONE USER ROUTES ----------

// View drone purposes selection
router.get('/drone-purposes', (req, res) => {
  res.render('dronePurposes');
});

// View available drones
router.get('/drones', async (req, res) => {
  const drones = await Drone.find({ status: "available" });
  res.render('drones', { drones, purpose: req.query.purpose || '' });
});

// Generic drone booking page
router.get('/book-drone', isLoggedIn, async (req, res) => {
  const drones = await Drone.find({ status: "available" });
  res.render('bookDrone', { drone: null, drones, purpose: req.query.purpose || '' });
});

// Drone booking page (pre-selected drone)
router.get('/book-drone/:id', isLoggedIn, async (req, res) => {
  const drone = await Drone.findById(req.params.id);
  res.render('bookDrone', { drone, drones: null, purpose: req.query.purpose || '' });
});

// Create drone booking
router.post('/book-drone', isLoggedIn, async (req, res) => {
  const { droneId, startDate, startTime, hours, purpose } = req.body;

  let purposeDetails = {};

  if (purpose === 'Delivery & Logistics') {
    purposeDetails = {
      senderName: req.body.senderName,
      senderAddress: req.body.senderAddress,
      receiverName: req.body.receiverName,
      receiverAddress: req.body.receiverAddress
    };
  } else if (purpose === 'Event Footage Coverage') {
    purposeDetails = {
      eventDetails: req.body.eventDetails,
      eventLocation: req.body.eventLocation
    };
  } else if (purpose === 'Agriculture Monitoring') {
    purposeDetails = {
      agriculturalArea: req.body.agriculturalArea,
      landLocation: req.body.landLocation
    };
  } else if (purpose === 'Swarm Drones') {
    purposeDetails = {
      swarmTheme: req.body.swarmTheme,
      swarmDronesRequired: req.body.swarmDronesRequired,
      showDuration: req.body.showDuration
    };
  }

  let drone = null;
  let totalAmount = 0;

  if (droneId) {
    drone = await Drone.findById(droneId);
    if (drone) {
      totalAmount = drone.pricePerHour * hours;
    }
  } else if (purpose === 'Delivery & Logistics' || purpose === 'Event Footage Coverage') {
    totalAmount = 150; // flat base rate
  } else if (purpose === 'Agriculture Monitoring') {
    const acres = parseFloat(req.body.agriculturalArea) || 0;
    totalAmount = acres * 100; // 100rs per acre
  } else if (purpose === 'Swarm Drones') {
    const noOfDrones = parseInt(req.body.swarmDronesRequired) || 0;
    totalAmount = noOfDrones * hours * 3; // 3rs per drone per hr
  }

  const booking = await DroneBooking.create({
    userId: req.session.user._id,
    droneId: droneId || null,
    startDate,
    startTime,
    hours,
    purpose,
    purposeDetails,
    totalAmount,
    paymentStatus: 'Pending'
  });

  if (razorpay) {
    try {
      const options = {
        amount: Math.round(totalAmount * 100), // amount in paise
        currency: "INR",
        receipt: booking._id.toString()
      };
      const order = await razorpay.orders.create(options);

      booking.stripeSessionId = order.id;
      await booking.save();

      return res.render('checkout', {
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: options.amount,
        orderId: order.id,
        bookingId: booking._id,
        bookingType: 'drone',
        user: req.session.user
      });
    } catch (err) {
      console.log('Razorpay Error:', err);
      return res.send("Payment initiation failed. Please try again.");
    }
  } else {
    return res.send("Payment gateway not configured.");
  }
});

// Update user bookings to include drones
router.get('/my-bookings', isLoggedIn, async (req, res) => {
  const chopperBookings = await Booking.find({ userId: req.session.user._id }).populate('chopperId').populate('routeId').sort({ date: -1 });
  const droneBookings = await DroneBooking.find({ userId: req.session.user._id }).populate('droneId').sort({ dateBooked: -1 });

  res.render('myBookings', { bookings: chopperBookings, droneBookings });
});

// Cancel drone booking
router.get('/cancel-drone-booking/:id', isLoggedIn, async (req, res) => {
  await DroneBooking.findByIdAndUpdate(req.params.id, { 
    status: "Cancelled", 
    cancelReason: req.query.reason || "No reason provided" 
  });
  res.redirect('/my-bookings');
});

// Success endpoint for Razorpay callback verification
router.post('/verify-payment', isLoggedIn, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId, bookingType } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id) {
    return res.redirect('/');
  }

  try {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto.createHmac('sha256', secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature) {
      if (bookingType === 'chopper') {
        const trackingBooking = await Booking.findById(bookingId).populate('chopperId').populate('routeId');
        if (trackingBooking) {
          trackingBooking.paymentStatus = "Paid";
          await trackingBooking.save();
          await Notification.create({ isAdminNotification: true, message: "You got a new chopper booking request" });
          return res.render("bookingSuccess", { totalFare: trackingBooking.totalFare, isDrone: false, booking: trackingBooking });
        }
      } else if (bookingType === 'drone') {
        const trackingBooking = await DroneBooking.findById(bookingId).populate('droneId');
        if (trackingBooking) {
          trackingBooking.paymentStatus = "Paid";
          await trackingBooking.save();
          await Notification.create({ isAdminNotification: true, message: "You got a new drone booking request" });
          return res.render("bookingSuccess", { totalFare: trackingBooking.totalAmount, isDrone: true, booking: trackingBooking });
        }
      }
    } else {
      return res.send("Payment verification failed! Invalid signature.");
    }

    res.redirect('/my-bookings');
  } catch (err) {
    console.log(err);
    res.send("An error occurred during payment verification.");
  }
});

// Mark notifications as read via AJAX
router.post('/api/notifications/mark-read', isLoggedIn, async (req, res) => {
  try {
    if (req.session.user.role === 'admin') {
      await Notification.updateMany({ isAdminNotification: true, read: false }, { read: true });
    } else {
      await Notification.updateMany({ userId: req.session.user._id, read: false }, { read: true });
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Error marking notifications read:', err);
    res.sendStatus(500);
  }
});

// Pilot Bookings route
router.get('/pilot-bookings', isLoggedIn, async (req, res) => {
  if (req.session.user.role !== 'drone_pilot' || req.session.user.approvalStatus !== 'Approved') {
    return res.redirect('/');
  }
  
  try {
    const assignedBookings = await DroneBooking.find({ assignedPilot: req.session.user._id })
      .populate('userId')
      .populate('droneId')
      .sort({ startDate: 1, dateBooked: 1 });

    res.render('pilotBookings', { bookings: assignedBookings });
  } catch (error) {
    console.error(error);
    res.redirect('/');
  }
});

module.exports = router;
