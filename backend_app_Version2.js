const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Stripe = require('stripe');
const stripe = Stripe('sk_test_YOUR_STRIPE_SECRET');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });

const upload = multer({ dest: 'uploads/' });

// Schemas
const UserSchema = new mongoose.Schema({
  username: String,
  passwordHash: String,
  email: String,
  isAdmin: { type: Boolean, default: false },
  stripeId: String,
  balance: { type: Number, default: 0 }
});
const OfferSchema = new mongoose.Schema({
  title: String,
  description: String,
  payout: Number,
  url: String,
  image: String,
  conversions: { type: Number, default: 0 }
});
const ActionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  offerId: mongoose.Schema.Types.ObjectId,
  completedAt: Date
});

const User = mongoose.model('User', UserSchema);
const Offer = mongoose.model('Offer', OfferSchema);
const Action = mongoose.model('Action', ActionSchema);

// Auth Middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register
app.post('/api/register', async (req, res) => {
  const { username, password, email } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash, email });
  await user.save();
  res.json({ success: true });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(401).json({ success: false });
  if (!(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false });
  const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET);
  res.json({ success: true, token });
});

// Get Offers
app.get('/api/offers', async (req, res) => {
  const offers = await Offer.find();
  res.json(offers);
});

// Add Offer (Admin, with image upload)
app.post('/api/admin/offer', auth, upload.single('image'), async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  const { title, description, payout, url } = req.body;
  const offer = new Offer({ title, description, payout, url, image: req.file?.filename });
  await offer.save();
  res.json({ success: true });
});

// Track Action
app.post('/api/action', auth, async (req, res) => {
  const { offerId } = req.body;
  const action = new Action({ userId: req.user.id, offerId, completedAt: new Date() });
  await action.save();
  await Offer.findByIdAndUpdate(offerId, { $inc: { conversions: 1 } });
  await User.findByIdAndUpdate(req.user.id, { $inc: { balance: 1 } }); // Demo balance
  res.json({ success: true });
});

// Analytics Dashboard (Admin)
app.get('/api/admin/analytics', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  const totalActions = await Action.countDocuments();
  const totalOffers = await Offer.countDocuments();
  const totalUsers = await User.countDocuments();
  const totalRevenue = await Offer.aggregate([{ $group: { _id: null, revenue: { $sum: '$payout' } } }]);
  res.json({ totalActions, totalOffers, totalUsers, totalRevenue: totalRevenue[0]?.revenue || 0 });
});

// Payment Integration (Stripe - payout)
app.post('/api/admin/payout', auth, async (req, res) => {
  if (!req.user.isAdmin) return res.sendStatus(403);
  const { userId, amount } = req.body;
  const user = await User.findById(userId);
  if (!user.stripeId) return res.status(400).json({ error: 'No Stripe account linked.' });
  const payment = await stripe.transfers.create({
    amount: amount * 100,
    currency: 'usd',
    destination: user.stripeId,
  });
  user.balance -= amount;
  await user.save();
  res.json({ success: true, payment });
});

// Photo gallery endpoint
app.get('/api/gallery', async (req, res) => {
  const images = await Offer.find({}, 'image');
  res.json(images.map(img => img.image));
});

app.listen(4000, () => console.log('API running on port 4000'));