const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');

function createDashboard(client) {
  const app = express();
  const PORT = process.env.DASHBOARD_PORT || 3000;

  // View engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(session({
    secret: process.env.SESSION_SECRET || 'void-bot-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
  }));

  // Passport
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((obj, done) => done(null, obj));

  passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/auth/callback`,
    scope: ['identify', 'guilds'],
  }, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Make client available to views
  app.use((req, res, next) => {
    req.client = client;
    next();
  });

  // Routes
  app.use('/auth', require('./routes/auth'));
  app.use('/dashboard', require('./routes/dashboard'));
  app.use('/api', require('./routes/api'));

  // Home
  app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.render('login', { user: req.user });
  });

  app.get('/logout', (req, res) => {
    req.logout(() => res.redirect('/'));
  });

  // Start
  app.listen(PORT, () => {
    console.log(`[DASHBOARD] Running on port ${PORT}`);
  });

  return app;
}

module.exports = { createDashboard };
