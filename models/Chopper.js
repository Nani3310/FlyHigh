const mongoose = require('mongoose');

const chopperSchema = new mongoose.Schema({
  model: String,
  photo: String,
  seats: Number,
  speed: Number,
  pricePerKm: Number,
  status: { type: String, default: 'available' }
});

module.exports = mongoose.model('Chopper', chopperSchema);
