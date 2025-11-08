// 🌿 Load dependencies
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// 🌍 Initialize app
const app = express();
app.use(express.json());
app.use(cors());

// 🧭 Define paths
const __dirnamePath = path.resolve();

// 🌐 MongoDB connection
const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/flourdb';
mongoose.connect(MONGO)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB connect error', err);
    process.exit(1);
  });

// 🧩 Schema & Model
const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  product: String,
  quantity: Number,
  totalPrice: Number,
  customer: {
    name: String,
    phone: String,
    address: String,
    pincode: String,
    notes: String
  },
  payment: {
    method: { type: String, default: 'UPI' },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    paidAt: Date
  },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Helper: Generate unique order ID
function generateOrderId() {
  return 'FL' + Date.now().toString().slice(-8);
}

// 🚀 ROUTES

// Serve static HTML files (from same folder)
app.use(express.static(__dirnamePath));

// Default route → open FirstPage.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirnamePath, 'FirstPage.html'));
});

// 🧾 API Routes
app.post('/api/orders', async (req, res) => {
  try {
    const { product, quantity, totalPrice, customer } = req.body;
    if (!product || !quantity || !totalPrice || !customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = new Order({
      orderId: generateOrderId(),
      product, quantity, totalPrice, customer,
      payment: { status: 'pending', method: 'UPI' }
    });

    await order.save();
    res.status(201).json({ message: 'Order saved', id: order._id, orderId: order.orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['paid', 'failed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const update = { 'payment.status': status };
    if (status === 'paid') update['payment.paidAt'] = new Date();

    const order = await Order.findByIdAndUpdate(id, update, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({ message: 'Payment updated', order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
  res.json(orders);
});

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(3000, '0.0.0.0', () => console.log('🚀 Server running on http://localhost:3000'));

