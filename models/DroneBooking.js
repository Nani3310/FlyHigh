const mongoose = require('mongoose');

const droneBookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  droneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Drone' },
  assignedPilot: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startDate: String,
  startTime: String,
  hours: Number,
  purpose: String,
  purposeDetails: { type: mongoose.Schema.Types.Mixed },
  totalAmount: Number,
  dateBooked: { type: Date, default: Date.now },
  status: { type: String, default: "Pending" },
  paymentStatus: { type: String, default: "Pending" },
  stripeSessionId: { type: String },
  cancelReason: { type: String }
});

module.exports = mongoose.model("DroneBooking", droneBookingSchema);
