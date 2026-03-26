require('dotenv').config();
console.log("MONGO URI:", process.env.MONGO_URI);

const express = require('express');
const path = require('path');
const session = require('express-session');
const ejs = require('ejs'); // Explicitly required for Netlify esbuild to bundle it
const connectDB = require('./config/db');

const app = express();

// Mongoose Serverless Middleware: Guarantees TCP connection finishes before lambda freeze!
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).send(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #ef4444;">Database Integration Failed</h1>
        <p style="font-size: 18px;">Netlify's Lambda function was unable to parse your MongoDB variables.</p>
        <div style="background: #1f2937; color: #10b981; padding: 20px; border-radius: 8px; margin-top: 20px; text-align: left; overflow: auto;">
          <code>ERROR TRACE: ${error.message}</code>
        </div>
      </div>
    `);
  }
});

const Route = require('./models/Route');
const Notification = require('./models/Notification');

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: 'chopper_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(async (req, res, next) => {
  res.locals.user = req.session.user;
  res.locals.notifications = [];

  if (req.session.user) {
    try {
      if (req.session.user.role === 'admin') {
        res.locals.notifications = await Notification.find({ isAdminNotification: true }).sort({ createdAt: -1 }).limit(10);
      } else {
        res.locals.notifications = await Notification.find({ userId: req.session.user._id }).sort({ createdAt: -1 }).limit(10);
      }
    } catch (err) {
      console.log('Error fetching notifications:', err);
    }
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
// Use process.cwd() to resolve correctly on both local machine and Netlify Serverless Cloud
app.set('views', path.join(process.cwd(), 'views'));

// Home route
app.get('/', async (req, res) => {
  try {
    const routes = await Route.find();
    const fromLocations = [...new Set(routes.map(r => r.from))];
    const toLocations = [...new Set(routes.map(r => r.to))];
    res.render('home', { fromLocations, toLocations });
  } catch (err) {
    console.error(err);
    res.render('home', { fromLocations: [], toLocations: [] });
  }
});

// ✅ Routes MUST come before listen
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use(authRoutes);
app.use(adminRoutes);

// ✅ Listen locally only if run directly, otherwise export for serverless
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚁 Server running on http://localhost:${PORT}`);
  });
}

// Export the Express API
module.exports = app;
