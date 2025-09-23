require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // ✅ Added CORS

const User = require('./model/User');
const Chapter = require('./model/Chapter');  // ✅ correct path

const Book = require('./model/Book');
const QuizItem = require('./model/QuizItem');  // new

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' })); // ✅ Allow all origins


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

// ----- User routes -----

// Register user
app.post('/register', async (req, res) => {
  const { username, password, role, status } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, role, status });
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
    console.error('🔴 Server error (register):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
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
    console.error('🔴 Server error (login):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get users with pagination
app.get('/users', async (req, res) => {
  const { page = 1, pageSize = 10, search = "" } = req.query;

  try {
    // ✅ Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { username: new RegExp(search, "i") }, // case-insensitive username search
        { role: new RegExp(search, "i") },     // allow searching role too
        { status: new RegExp(search, "i") }    // allow searching status
      ];
    }

    // ✅ Query DB
    const users = await User.find(filter)
      .skip((page - 1) * pageSize)
      .limit(Number(pageSize));

    const total = await User.countDocuments(filter);

    res.json({
      users: users.map(u => ({
        id: u._id,
        username: u.username,
        status: u.status.toString(),
        role: u.role
      })),
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      search
    });

  } catch (err) {
    console.error('🔴 Server error (get users):', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Update user status
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
      message: `User status updated to ${user.status ? 'active' : 'inactive'}`
    });
  } catch (err) {
    console.error('🔴 Server error (patch user status):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
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
    console.error('🔴 Server error (delete user):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- Book routes -----

// Create book
// app.post('/books', async (req, res) => {
//   const { title, subject, class: bookClass } = req.body;
//   try {
//     const newBook = new Book({ title, subject, class: bookClass });
//     await newBook.save();
//     res.status(201).json({
//       id: newBook._id,
//       title: newBook.title,
//       subject: newBook.subject,
//       class: newBook.class,
//       createdAt: newBook.createdAt.toISOString(),
//       message: 'Book created successfully'
//     });
//   } catch (err) {
//     console.error('🔴 Server error (create book):', err);
//     res.status(500).json({ message: 'Server error' });
//   }
// });



// GET /books?class=3&subject=English
app.get('/books', async (req, res) => {
  try {
    console.log("🔍 Incoming filters:", req.query);

    const { subject, class: bookClass } = req.query;

    // Build filter dynamically
    const filter = {};
    if (subject) filter.subject = new RegExp(subject, "i"); // case-insensitive match
    if (bookClass) filter.class = String(bookClass);        // ensure it's string since schema has String

    console.log("🛠 Applying filter:", filter);

    // Fetch only books that match subject + class
    const books = await Book.find(filter, "book") // 👈 only return `book` field
      .lean();

    res.json({
      count: books.length,
      books: books.map(b => b.book) // 👈 return array of book names only
    });

  } catch (err) {
    console.error("❌ Error fetching books:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});


// GET /search-books?book=English&subject=English&class=3&page=1&pageSize=10
app.get('/chapter', async (req, res) => {
  try {
    let { book, subject, class: bookClass, page = 1, pageSize = 10 } = req.query;
    page = Number(page);
    pageSize = Number(pageSize);

    // Build filter dynamically
    const filter = {};
    if (book) filter.book = new RegExp(book, 'i'); // search by book name
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (bookClass) filter.class = bookClass;

    // Fetch books with pagination
    const books = await Chapter.find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const total = await Chapter.countDocuments(filter);

    res.json({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      results: books
    });
  } catch (err) {
    console.error('❌ Error searching books:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});


// GET /chapter?book=English&subject=English&class=3
app.get('/chapter', async (req, res) => {
  try {
    const { book, subject, class: bookClass } = req.query;

    // Build dynamic filter
    const filter = {};
    if (book) filter.book = new RegExp(book, 'i'); // search by book name
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (bookClass) filter.class = bookClass;

    const chapters = await Chapter.find(filter);

    if (chapters.length === 0) {
      return res.status(404).json({ message: 'No books found matching the criteria' });
    }

    res.json({ count: chapters.length, chapters });
  } catch (err) {
    console.error('❌ Error fetching chapters:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});


// Create Book with Chapters
app.post('/chapter', async (req, res) => {
  try {
    const { book, code, subject, class: bookClass, chapters } = req.body;

    // Validate required fields
    if (!book || !subject || !bookClass || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ message: 'Missing required fields or chapters' });
    }

    // Create new chapter document
    const newChapterDoc = new Chapter({ book, code, subject, class: bookClass, chapters });

    // Save to database
    const savedDoc = await newChapterDoc.save();

    res.status(201).json({ message: 'Book with chapters saved successfully', book: savedDoc });

  } catch (err) {
    console.error('❌ Error while creating book with chapters:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});






app.post('/books', async (req, res) => {
  console.log("📩 Incoming /books request body:", req.body);

  const { book, subject, Subject, class: bookClass, code } = req.body;
  const finalSubject = subject || Subject;

  if (!book || !finalSubject || bookClass === undefined || !code) {
    console.warn("⚠️ Validation failed:", { book, finalSubject, bookClass, code });
    return res.status(400).json({
      message: "Missing required fields: book, subject, class, code"
    });
  }

  try {
    console.log("🛠 Creating new Book with data:", { book, subject: finalSubject, class: bookClass, code });

    const newBook = new Book({ book, subject: finalSubject, class: bookClass, code });

    const savedBook = await newBook.save();
    console.log("✅ Book saved successfully:", savedBook);

    res.status(201).json({
      id: savedBook._id,
      book: savedBook.book,
      subject: savedBook.subject,
      class: savedBook.class,
      code: savedBook.code,
      createdAt: savedBook.createdAt.toISOString(),
      message: "Book created successfully"
    });

  } catch (err) {
    console.error("❌ Error while creating book:", err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation Error",
        details: err.errors
      });
    }

    res.status(500).json({ message: "Server Error", error: err.message });
  }
});



// ✅ Search Books
app.get('/allbooks', async (req, res) => {
  try {
    console.log("🔍 Incoming search query:", req.query);

    let { book, subject, class: bookClass, page = 1, pageSize = 10 } = req.query;

    page = Number(page);
    pageSize = Number(pageSize);

    // ✅ Build filter dynamically
    const filter = {};
    if (book) filter.book = new RegExp(book, "i"); // case-insensitive search
    if (subject) filter.subject = new RegExp(subject, "i");
    if (bookClass) filter.class = Number(bookClass); // ensure numeric match

    console.log("🛠 Applying filter:", filter);

    // ✅ Fetch books with pagination
    const books = await Book.find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const total = await Book.countDocuments(filter);

    res.json({
      total,                        // total matched books
      page,                         // current page
      pageSize,                     // page size requested
      totalPages: Math.ceil(total / pageSize),
      results: books                // current page books
    });

  } catch (err) {
    console.error("❌ Error while searching books:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});






// Get all books
app.get('/allbooks', async (req, res) => {
  try {
    const books = await Book.find();
    res.json({
      books: books.map(b => ({
        id: b._id,
        title: b.title,
        subject: b.subject,
        class: b.class
      }))
    });
  } catch (err) {
    console.error('🔴 Server error (get books):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get book by ID
app.get('/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json({
      id: book._id,
      title: book.title,
      subject: book.subject,
      class: book.class
    });
  } catch (err) {
    console.error('🔴 Server error (get book by id):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update book
app.put('/books/:id', async (req, res) => {
  const { id } = req.params;
  const { title, subject, class: bookClass } = req.body;
  try {
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { title, subject, class: bookClass },
      { new: true, timestamps: true }  // note: timestamps in schema handle updatedAt
    );
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
    console.error('🔴 Server error (update book):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete book
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
    console.error('🔴 Server error (delete book):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- New QuizItem route -----

// Create QuizItem
app.post('/quizItems', async (req, res) => {
  try {
    const { className, subject, title, chapter, status, questions } = req.body;

    if (!className || !subject || !title || !chapter) {
      return res.status(400).json({ message: 'Missing required fields: className, subject, title, chapter' });
    }
    if (!Array.isArray(questions)) {
      return res.status(400).json({ message: 'questions must be an array' });
    }

    const newQuiz = new QuizItem({
      className,
      subject,
      title,
      chapter,
      status: status === undefined ? true : status,
      questions
    });

    await newQuiz.save();

    res.status(201).json({
      id: newQuiz._id,
      className: newQuiz.className,
      subject: newQuiz.subject,
      title: newQuiz.title,
      chapter: newQuiz.chapter,
      status: newQuiz.status,
      questions: newQuiz.questions,
      createdAt: newQuiz.createdAt.toISOString(),
      message: 'Question created successfully'
    });
  } catch (err) {
    console.error('🔴 Server error (create question):', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
