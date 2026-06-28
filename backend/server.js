const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Import models
const User = require('./src/models/User');

// Import middleware
const errorHandler = require('./src/middleware/error.middleware');

// Import routes
const apiRoutes = require('./src/routes/index');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobocate';
mongoose.connect(MONGODB_URI)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Passport Google Strategy
// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  console.log('🟡 [Passport Strategy] Google profile received');
  console.log('🟡 [Passport Strategy] Profile ID:', profile.id);
  console.log('🟡 [Passport Strategy] Profile email:', profile.emails?.[0]?.value);
  console.log('🟡 [Passport Strategy] Profile name:', profile.displayName);
  
  try {
    let user = await User.findOne({ googleId: profile.id });
    console.log('🟡 [Passport Strategy] Existing user found by googleId:', !!user);
    
    if (!user) {
      user = await User.findOne({ email: profile.emails[0].value });
      console.log('🟡 [Passport Strategy] Existing user found by email:', !!user);
      
      if (user) {
        user.googleId = profile.id;
        user.picture = profile.photos[0]?.value || user.picture;
        user.provider = 'google';
        user.lastLogin = new Date();
        await user.save();
        console.log('🟡 [Passport Strategy] Updated existing user');
      } else {
        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          name: profile.displayName,
          picture: profile.photos[0]?.value,
          provider: 'google',
          role: 'ROLE_CANDIDATE',
          lastLogin: new Date(),
        });
        console.log('🟡 [Passport Strategy] Created new user:', user._id);
      }
    } else {
      user.lastLogin = new Date();
      user.picture = profile.photos[0]?.value || user.picture;
      await user.save();
      console.log('🟡 [Passport Strategy] Updated existing user login time');
    }
    
    console.log('🟡 [Passport Strategy] Returning user:', user._id);
    return done(null, user);
  } catch (error) {
    console.error('❌ [Passport Strategy] Error:', error);
    console.error('❌ [Passport Strategy] Error stack:', error.stack);
    return done(error, null);
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Mount API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      mongodb: 'disconnected',
      aiProvider: process.env.AI_PROVIDER || 'openai',
    };

    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      health.mongodb = 'connected';
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 AI Provider: ${process.env.AI_PROVIDER || 'openai'}`);
  console.log(`🔍 Job Scraping: ${process.env.JOB_SCRAPING_ENABLED !== 'false' ? 'Enabled' : 'Disabled'}`);
  console.log(`🤖 Auto-Apply: ${process.env.AUTO_APPLICATION_ENABLED === 'true' ? 'Enabled' : 'Disabled'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
