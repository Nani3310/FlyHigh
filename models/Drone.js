const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  name: String,
  model: String,
  cameraType: String,
  range: String,
  pricePerHour: Number,
  status: { type: String, default: 'available' }
});

module.exports = mongoose.model('Drone', droneSchema);
