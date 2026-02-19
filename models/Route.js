const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  from: String,
  to: String,
  distanceKm: Number,
  estimatedTime: String
});

module.exports = mongoose.model('Route', routeSchema);
