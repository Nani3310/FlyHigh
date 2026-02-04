const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return; // Fast return for Serverless invocations using cached pool
  }
  try {
    const db = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds max before declaring DB is unreachable
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('✅ MongoDB Serverless Pool Connected');
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    throw err; // Throw explicitly so the frontend can catch the exact string
  }
};

module.exports = connectDB;
