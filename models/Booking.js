const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  chopperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chopper' },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  passengers: Number,
  passengerDetails: [{
    name: String,
    age: Number,
    gender: String
  }],
  totalFare: Number,
  flightDate: String,
  flightTime: String,
  purpose: String,
  date: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" },
  paymentStatus: { type: String, default: "Pending" },
  stripeSessionId: { type: String },
  cancelReason: { type: String }
});

module.exports = mongoose.model("Booking", bookingSchema);