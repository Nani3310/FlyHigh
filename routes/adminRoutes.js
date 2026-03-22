const Booking = require('../models/Booking');
const User = require('../models/User');

const express = require('express');
const { isAdmin } = require('../middlewares/authMiddleware');
const Chopper = require('../models/Chopper');
const Route = require('../models/Route');
const Drone = require('../models/Drone');
const DroneBooking = require('../models/DroneBooking');
const Notification = require('../models/Notification');

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get('/admin/dashboard', isAdmin, async (req, res) => {

  const totalUsers = await User.countDocuments();
  const totalChoppers = await Chopper.countDocuments();
  const totalDrones = await Drone.countDocuments();
  
  const allRoutes = await Route.find();
  const totalRoutes = allRoutes.length;
  
  const uniqueCities = new Set();
  allRoutes.forEach(r => {
    uniqueCities.add(r.from.trim().toUpperCase());
    uniqueCities.add(r.to.trim().toUpperCase());
  });
  const totalCities = uniqueCities.size;

  const bookings = await Booking.find();
  const droneBookings = await DroneBooking.find();
  
  const dronePilots = await User.find({ role: 'drone_pilot' }).sort({ _id: -1 });

  let totalRevenue = 0;
  const monthlyRevenue = Array(12).fill(0);

  bookings.forEach(b => {
    totalRevenue += (b.totalFare || 0);
    if (b.date) {
      const month = new Date(b.date).getMonth();
      monthlyRevenue[month] += (b.totalFare || 0);
    }
  });

  droneBookings.forEach(b => {
    totalRevenue += (b.totalAmount || 0);
    if (b.dateBooked) {
      const month = new Date(b.dateBooked).getMonth();
      monthlyRevenue[month] += (b.totalAmount || 0);
    }
  });

  const totalBookingsCount = bookings.length + droneBookings.length;

  res.render('adminDashboard', {
    totalUsers,
    totalBookings: totalBookingsCount,
    totalChoppers,
    totalDrones,
    totalRoutes,
    totalCities,
    totalRevenue,
    monthlyRevenue: JSON.stringify(monthlyRevenue),
    dronePilots
  });

});

// ---------- PILOT APPROVAL ROUTES ----------

router.post('/admin/approve-pilot/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'Approved' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
});

router.post('/admin/reject-pilot/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { approvalStatus: 'Rejected' });
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard');
  }
});

// ---------- CHOPPER ROUTES ----------

// Show add chopper form
router.get('/admin/add-chopper', isAdmin, (req, res) => {
  res.render('addChopper');
});

// Handle add chopper
router.post('/admin/add-chopper', isAdmin, upload.single('photo'), async (req, res) => {
  const { model, seats, speed, pricePerKm } = req.body;
  
  let photo = null;
  if (req.file) {
    const base64Image = req.file.buffer.toString('base64');
    photo = `data:${req.file.mimetype};base64,${base64Image}`;
  }

  await Chopper.create({ model, photo, seats, speed, pricePerKm });
  res.redirect('/admin/choppers');
});

// View all choppers
router.get('/admin/choppers', isAdmin, async (req, res) => {
  const choppers = await Chopper.find();
  res.render('viewChoppers', { choppers });
});


// ---------- ROUTE ROUTES ----------

// Show add route form
router.get('/admin/add-route', isAdmin, (req, res) => {
  res.render('addRoute');
});

// Handle add route
router.post('/admin/add-route', isAdmin, async (req, res) => {
  const { from, to, distanceKm, estimatedTime } = req.body;

  await Route.create({ from, to, distanceKm, estimatedTime });
  res.redirect('/admin/routes');
});

// View all routes
router.get('/admin/routes', isAdmin, async (req, res) => {
  const routes = await Route.find();
  res.render('viewRoutes', { routes });
});

//Admin booking route
router.get('/admin/bookings', isAdmin, async (req, res) => {
  const bookings = await Booking.find().populate('userId').populate('chopperId').populate('routeId').sort({ flightDate: 1, createdAt: 1 });

  res.render('adminBookings', { bookings });

});

// Approve booking
router.get('/admin/approve-booking/:id', isAdmin, async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, {
    status: "Approved"
  });
  if (booking) {
    await Notification.create({
      userId: booking.userId,
      message: "Your booking has been confirmed by the admin"
    });
  }
  res.redirect('/admin/bookings');
});

// Reject booking
router.get('/admin/reject-booking/:id', isAdmin, async (req, res) => {
  const booking = await Booking.findByIdAndUpdate(req.params.id, {
    status: "Rejected"
  });
  if (booking) {
    await Notification.create({
      userId: booking.userId,
      message: "Your booking was rejected by the admin"
    });
  }
  res.redirect('/admin/bookings');
});

// ---------- DRONE ROUTES ----------

// Show add drone form
router.get('/admin/add-drone', isAdmin, (req, res) => {
  res.render('addDrone');
});

// Handle add drone
router.post('/admin/add-drone', isAdmin, async (req, res) => {
  const { name, model, cameraType, range, pricePerHour } = req.body;
  await Drone.create({ name, model, cameraType, range, pricePerHour });
  res.redirect('/admin/drones');
});

// View all drones
router.get('/admin/drones', isAdmin, async (req, res) => {
  const drones = await Drone.find();
  res.render('viewDrones', { drones });
});

// Admin drone bookings
router.get('/admin/drone-bookings', isAdmin, async (req, res) => {
  const bookings = await DroneBooking.find()
    .populate('userId')
    .populate('droneId')
    .populate('assignedPilot')
    .sort({ startDate: 1, dateBooked: 1 });
    
  const approvedPilots = await User.find({ role: 'drone_pilot', approvalStatus: 'Approved' });
  
  res.render('adminDroneBookings', { bookings, approvedPilots });
});

// Approve drone booking
router.post('/admin/approve-drone-booking/:id', isAdmin, async (req, res) => {
  const { pilotId } = req.body;
  
  const bookingParams = { status: "Approved" };
  if (pilotId) {
    bookingParams.assignedPilot = pilotId;
  }
  
  const booking = await DroneBooking.findByIdAndUpdate(req.params.id, bookingParams);
  
  if (booking) {
    await Notification.create({
      userId: booking.userId,
      message: "Your drone booking has been confirmed by the admin!"
    });
  }
  res.redirect('/admin/drone-bookings');
});

// Reject drone booking
router.get('/admin/reject-drone-booking/:id', isAdmin, async (req, res) => {
  const booking = await DroneBooking.findByIdAndUpdate(req.params.id, { status: "Rejected" });
  if (booking) {
    await Notification.create({
      userId: booking.userId,
      message: "Your drone booking was rejected by the admin"
    });
  }
  res.redirect('/admin/drone-bookings');
});

module.exports = router;
