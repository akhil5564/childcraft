require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // ✅ Added CORS

const User = require('./model/User');
const Chapter = require('./model/Chapter');  // ✅ correct path

const Book = require('./model/Book');
const QuizItem = require('./model/QuizItem');  // new
const Subject = require('./model/Subject');

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



// ✅ Get Chapters by subject, class, and book
app.get('/chapters', async (req, res) => {
  try {
    console.log("📩 Incoming chapters request:", req.query);

    const { subject, class: bookClass, book } = req.query;

    if (!subject || !bookClass || !book) {
      return res.status(400).json({
        message: "subject, class, and book are required"
      });
    }

    // ✅ Build filter
    const filter = {
      subject: new RegExp(subject, "i"), // case-insensitive match
      class: String(bookClass),          // ensure same type as schema
      book: new RegExp(book, "i")
    };

    console.log("🛠 Filter:", filter);

    // Fetch matching document
    const doc = await Chapter.findOne(filter).lean();

    if (!doc) {
      return res.status(404).json({ message: "No chapters found" });
    }

    // ✅ Return only the chapters array
    res.json({
      chapters: doc.chapters.map(ch => ({
        chapterName: ch.chapterName,
        _id: ch._id
      }))
    });

  } catch (err) {
    console.error("❌ Error while fetching chapters:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
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
// ✅ Get books with subject & class filter
app.get('/books', async (req, res) => {
  try {
    console.log("🔍 Incoming filters:", req.query);

    const { subject, class: bookClass } = req.query;

    // Build filter dynamically
    const filter = {};
    if (subject) filter.subject = new RegExp(subject, "i"); // case-insensitive match
    if (bookClass) filter.class = String(bookClass);        // ensure string match

    console.log("🛠 Applying filter:", filter);

    // Fetch matching books (id + book fields)
    const books = await Book.find(filter, "book").lean();

    res.json({
      books: books.map(b => ({
        id: b._id,   // ✅ MongoDB ObjectId
        book: b.book
      }))
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
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const total = await Chapter.countDocuments();

    const chapters = await Chapter.find()
      .populate("book", "book -_id") // only fetch `book` field from Book model
      .skip(skip)
      .limit(Number(pageSize))
      .lean();

    const results = chapters.map(ch => ({
      ...ch,
      book: ch.book?.book || null // replace ObjectId with actual book name
    }));

    res.json({
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize),
      results
    });

  } catch (err) {
    console.error("❌ Error fetching chapters:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// Create Book with Chapters
app.post('/chapter', async (req, res) => {
  try {
    const { bookid, subject, class: bookClass, chapters } = req.body;

    // ✅ Validate required fields
    if (!bookid || !subject || !bookClass || !Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ message: 'Missing required fields or chapters' });
    }

    // ✅ Create new chapter document
    const newChapterDoc = new Chapter({
      book: bookid,        // <-- bookid stored in "book"
      subject,
      class: bookClass,
      chapters
    });

    // ✅ Save to database
    const savedDoc = await newChapterDoc.save();

    // ✅ Response format
    res.status(201).json({
      message: "Book with chapters created successfully",
      _id: savedDoc._id.toString()
    });

  } catch (err) {
    console.error('❌ Error while creating book with chapters:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});



// Update chapters for a book by ID
app.put('/chapter/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { chapters } = req.body;

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return res.status(400).json({ message: 'Chapters must be a non-empty array' });
    }

    const updatedDoc = await Chapter.findByIdAndUpdate(
      id,
      { $set: { chapters } }, // replace old chapters with new
      { new: true }           // return updated document
    );

    if (!updatedDoc) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      class: updatedDoc.class,
      subject: updatedDoc.subject,
      bookid: updatedDoc._id.toString(),
      chapters: updatedDoc.chapters.map(ch => ({
        chapterName: ch.chapterName
      }))
    });

  } catch (err) {
    console.error('❌ Error while updating chapters:', err);
    res.status(500).json({ message: 'Server Error', error: err.message });
  }
});



// Delete a book with chapters by ID
app.delete('/chapter/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedDoc = await Chapter.findByIdAndDelete(id);

    if (!deletedDoc) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      message: 'Book with chapters deleted successfully',
      bookid: deletedDoc._id.toString()
    });

  } catch (err) {
    console.error('❌ Error while deleting book:', err);
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



// ----- Subject routes -----

// Create subject
app.post('/subject', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check duplicate
    const existing = await Subject.findOne({ name: new RegExp(`^${name}$`, "i") });
    if (existing) {
      return res.status(400).json({ message: "Subject already exists" });
    }

    const newSubject = new Subject({ name });
    await newSubject.save();

    res.status(201).json({
      id: newSubject._id,
      name: newSubject.name,
      message: "Subject created successfully"
    });
  } catch (err) {
    console.error("❌ Error creating subject:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all subjects
// ✅ Get subjects with pagination + search
app.get('/subject', async (req, res) => {
  try {
    let { page = 1, pageSize = 10, search = "" } = req.query;
    page = Number(page);
    pageSize = Number(pageSize);

    // Build filter
    const filter = {};
    if (search) {
      filter.name = new RegExp(search, "i"); // case-insensitive search
    }

    // Query DB
    const subjects = await Subject.find(filter)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const total = await Subject.countDocuments(filter);

    res.json({
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      subjects: subjects.map(s => ({
        id: s._id,
        name: s.name
      }))
    });
  } catch (err) {
    console.error("❌ Error fetching subjects:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete subject
app.delete('/subject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Subject not found" });
    }
    res.json({
      message: "Subject deleted successfully",
      deletedId: deleted._id
    });
  } catch (err) {
    console.error("❌ Error deleting subject:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update book by ID
app.put('/books/:id', async (req, res) => {
  const { id } = req.params;
  const { book, subject, class: bookClass, code } = req.body;

  try {
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { book, subject, class: bookClass, code },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.json({
      id: updatedBook._id, // always MongoDB ObjectId
      message: "Book updated successfully"
    });
  } catch (err) {
    console.error("❌ Server error (update book):", err);
    res.status(500).json({ message: "Server error" });
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
// ✅ Create Quiz Item
app.post('/quizItems', async (req, res) => {
  try {
    const { className, subject, book, title, chapter, status, questions } = req.body;

    // ✅ Validation
    if (!className || !subject || !book || !chapter) {
      return res.status(400).json({ message: 'Missing required fields: className, subject, book, chapter' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions must be a non-empty array' });
    }

    // ✅ Create new Quiz
    const newQuiz = new QuizItem({
      className,
      subject,
      book,      // ✅ store bookId
      title,     // optional quiz title
      chapter,   // chapterId
      status: status === undefined ? true : status,
      questions
    });

    await newQuiz.save();

    // ✅ Custom Response
    res.status(201).json({
      id: newQuiz._id.toString(),
      className: newQuiz.className,
      subject: newQuiz.subject,
      book: newQuiz.book,
      chapter: newQuiz.chapter,
      status: newQuiz.status,
      questions: newQuiz.questions.map(q => ({
        questionType: q.questionType,
        question: q.question,
        marks: q.marks,
        options: q.options.map(opt => ({ text: opt.text })),
        image: q.image
      })),
      createdAt: newQuiz.createdAt.toISOString(),
      message: 'Question created successfully'
    });

  } catch (err) {
    console.error('🔴 Server error (create question):', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get QuizItem by ID
app.get('/quizItems/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await QuizItem.findById(id).lean();

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz item not found' });
    }

    res.json({
      id: quiz._id.toString(),
      className: quiz.className,
      subject: quiz.subject,
      book: quiz.book,
      chapter: quiz.chapter,
      status: quiz.status,
      questions: quiz.questions.map(q => ({
        questionType: q.questionType,
        question: q.question,
        marks: q.marks,
        options: q.options.map(opt => ({ text: opt.text })),
        image: q.image
      })),
      createdAt: quiz.createdAt.toISOString()
    });

  } catch (err) {
    console.error('❌ Error fetching quiz item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
// Update QuizItem by ID
app.put('/quizItems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { className, subject, book, chapter, status, questions, title } = req.body;

    // ✅ Validation (optional: only required fields)
    if (!className || !subject || !book || !chapter) {
      return res.status(400).json({ message: 'Missing required fields: className, subject, book, chapter' });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'questions must be a non-empty array' });
    }

    const updatedQuiz = await QuizItem.findByIdAndUpdate(
      id,
      { className, subject, book, chapter, status, questions, title },
      { new: true }
    );

    if (!updatedQuiz) {
      return res.status(404).json({ message: 'Quiz item not found' });
    }

    res.json({
      id: updatedQuiz._id.toString(),
      className: updatedQuiz.className,
      subject: updatedQuiz.subject,
      book: updatedQuiz.book,
      chapter: updatedQuiz.chapter,
      status: updatedQuiz.status,
      questions: updatedQuiz.questions.map(q => ({
        questionType: q.questionType,
        question: q.question,
        marks: q.marks,
        options: q.options.map(opt => ({ text: opt.text })),
        image: q.image
      })),
      updatedAt: updatedQuiz.updatedAt.toISOString(),
      message: 'Quiz item updated successfully'
    });

  } catch (err) {
    console.error('❌ Error updating quiz item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
