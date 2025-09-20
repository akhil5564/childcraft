// index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./model/User');
const Book = require('./model/Book');

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('🔴 MongoDB connection error:', err.message);
    process.exit(1);
  });

// User registration route
app.post('/register', async (req, res) => {
  const { username, password, role, status } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      status
    });

    await newUser.save();

    res.status(201).json({
      id: newUser._id,
      username: newUser.username,
      role: newUser.role,
      status: newUser.status,
      createdAt: newUser.createdAt.toISOString(),
      message: 'User created successfully'
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      message: 'Login successful'
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users with pagination route
app.get('/users', async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;

  try {
    const users = await User.find()
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize));

    const total = await User.countDocuments();

    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        status: user.status.toString(),
        role: user.role
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status route
app.patch('/users/:id/status', async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = !user.status;
    await user.save();

    res.json({
      id: user._id,
      username: user.username,
      status: user.status.toString(),
      role: user.role,
      message: `User status updated to ${user.status ? 'active' : 'inactive'}`,
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user route
app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully',
      deletedId: deletedUser._id
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new book route
app.post('/books', async (req, res) => {
  const { title, subject, class: bookClass } = req.body;

  try {
    const newBook = new Book({
      title,
      subject,
      class: bookClass
    });

    await newBook.save();

    res.status(201).json({
      id: newBook._id,
      title: newBook.title,
      subject: newBook.subject,
      class: newBook.class,
      createdAt: newBook.createdAt.toISOString(),
      message: 'Book created successfully'
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all books route
app.get('/allbooks', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get book by ID route
app.get('/books/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book);
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update book details route
app.put('/book/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subject, class: bookClass } = req.body;

  try {
    const updatedBook = await Book.findByIdAndUpdate(id, {
      title,
      subject,
      class: bookClass,
      updatedAt: new Date()
    }, { new: true });

    if (!updatedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      id: updatedBook._id,
      title: updatedBook.title,
      subject: updatedBook.subject,
      class: updatedBook.class,
      updatedAt: updatedBook.updatedAt.toISOString(),
      message: 'Book updated successfully'
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete book route
app.delete('/books/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedBook = await Book.findByIdAndDelete(id);
    if (!deletedBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      message: 'Book deleted successfully',
      deletedId: deletedBook._id
    });
  } catch (err) {
    console.error('🔴 Server error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
