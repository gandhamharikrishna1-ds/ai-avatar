const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mock data
const hotels = [
  { id: 1, name: "The Taj Mahal Palace", location: "Mumbai", price: 15000, rating: 4.9, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 2, name: "ITC Maurya", location: "Delhi", price: 12000, rating: 4.8, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 3, name: "Rambagh Palace", location: "Jaipur", price: 20000, rating: 4.9, image: "https://images.unsplash.com/photo-1542314831-c6a4d14d8835?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 4, name: "Budget Inn", location: "Delhi", price: 1500, rating: 3.5, image: "https://images.unsplash.com/photo-1551882547-ff40c0d129fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 5, name: "Hyatt Regency", location: "Delhi", price: 10000, rating: 4.5, image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 6, name: "Novotel", location: "Hyderabad", price: 8000, rating: 4.6, image: "https://images.unsplash.com/photo-1522798514-97ceb8c4f1c8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 7, name: "Trident", location: "Hyderabad", price: 9500, rating: 4.7, image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 8, name: "Lemon Tree", location: "Hyderabad", price: 4000, rating: 4.0, image: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" },
  { id: 9, name: "Cheap Stay", location: "Mumbai", price: 1800, rating: 3.2, image: "https://images.unsplash.com/photo-1505691938895-1758d7def511?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }
];

let bookings = [];
let users = []; // In-memory user store

// API to get hotels
app.get('/hotels', (req, res) => {
  res.json(hotels);
});

// API for user signup
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password required." });
  }
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ success: false, message: "Username already exists." });
  }
  users.push({ username, password });
  res.json({ success: true, message: "Signup successful!" });
});

// API for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    res.json({ success: true, message: "Login successful!", username: user.username });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials." });
  }
});

// API for AI agent intent processing
app.post('/ask', (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: "No command provided." });
  }

  const text = command.toLowerCase();
  let action = "unknown";
  let location = "";
  let priceFilter = "";
  let responseText = "I didn't quite catch that. Could you please repeat?";
  let filterData = {};

  // Simple Intent Recognition
  if (text.includes("book")) {
    action = "book";
    responseText = "Please click the 'Book Now' button on the hotel you wish to reserve.";
  } else if (text.includes("find") || text.includes("search") || text.includes("show")) {
    action = "search";
    
    // Extract location
    if (text.includes("delhi")) location = "Delhi";
    else if (text.includes("mumbai")) location = "Mumbai";
    else if (text.includes("jaipur")) location = "Jaipur";
    else if (text.includes("hyderabad")) location = "Hyderabad";

    // Extract price intent
    if (text.includes("cheap") || text.includes("budget") || text.includes("low price") || text.includes("under 2000")) {
      priceFilter = "cheap";
    }

    if (location && priceFilter) {
      responseText = `Showing budget hotels in ${location}.`;
      filterData = { location, price: "cheap" };
    } else if (location) {
      responseText = `Showing hotels in ${location}.`;
      filterData = { location };
    } else if (priceFilter) {
      responseText = "Showing cheap hotels.";
      filterData = { price: "cheap" };
    } else {
      responseText = "Showing all available hotels.";
      filterData = {};
    }
  } else if (text.includes("hello") || text.includes("hi")) {
    action = "greet";
    responseText = "Hello! I am your AI assistant. How can I help you find a hotel today?";
  }

  res.json({ action, responseText, filterData });
});

// API to book hotel
app.post('/book', (req, res) => {
  const { hotelId, user } = req.body;
  const hotel = hotels.find(h => h.id === hotelId);
  
  if (hotel) {
    bookings.push({ hotelId, user: user || "Guest", date: new Date() });
    res.json({ success: true, message: `Successfully booked ${hotel.name}!` });
  } else {
    res.status(404).json({ success: false, message: "Hotel not found." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
