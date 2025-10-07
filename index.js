require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors'); // ✅ Added CORS

const User = require('./model/User');
const Chapter = require('./model/Chapter');  // ✅ correct path
const multer = require('multer');
const cloudinary = require('./cloudinary');


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
app.get('/chaptersr', async (req, res) => {
  try {
    const { subject, class: bookClass, book } = req.query;

    if (!subject || !bookClass || !book) {
      return res.status(400).json({
        message: "subject, class, and book are required"
      });
    }

    // Find chapters by Book ObjectId, subject, and class
    const chapterDocs = await Chapter.find({
      book,              // Book ID from query
      subject,
      class: bookClass
    }).populate('book', 'book code subject class').lean();

    if (!chapterDocs || chapterDocs.length === 0) {
      return res.status(404).json({ message: "No chapters found" });
    }

    // Flatten all chapters from all documents into individual objects
    const chapters = chapterDocs.flatMap(chapterDoc =>
      chapterDoc.chapters.map(ch => ({
        chapterName: ch.chapterName,
        number: ch.number,
        book: chapterDoc.book.book,
        _id: ch._id
      }))
    );

    res.json(chapters);

  } catch (err) {
    console.error(err);
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





app.get('/qustion', async (req, res) => {
  try {
    const { subject, className, chapter, book, questionType, q, page = 1, limit = 10 } = req.query;

    // Build dynamic filter
    let filter = {};
    if (subject) filter.subject = new RegExp(subject, "i");
    if (className) filter.className = String(className);
    if (chapter) filter.chapter = new RegExp(chapter, "i");
    if (book) filter.book = new RegExp(book, "i");
    if (questionType) filter["questions.questionType"] = questionType;

    console.log("🔍 Filter:", filter);

    // Fetch quizzes sorted by createdAt descending
    const quizzes = await QuizItem.find(filter)
      .sort({ createdAt: -1 })
      .select("className subject chapter book title questions createdAt")
      .lean();

    console.log("📊 Found quizzes:", quizzes.length);
    
    // Debug: Log first quiz to check structure
    if (quizzes.length > 0) {
      console.log("🔍 Sample quiz structure:", JSON.stringify(quizzes[0], null, 2));
    }

    // Flatten into individual questions with question IDs
    let results = quizzes.flatMap(quiz => {
      if (!quiz.questions || !Array.isArray(quiz.questions)) {
        console.warn("⚠️ Quiz has no questions array:", quiz._id);
        return [];
      }
      
      return quiz.questions.map((ques, questionIndex) => {
        console.log("🔍 Processing question:", {
          question: ques.question?.substring(0, 50),
          questionType: ques.questionType,
          imageUrl: ques.imageUrl,
          hasImageUrl: !!ques.imageUrl
        });
        
        return {
          questionId: ques._id ? ques._id.toString() : `${quiz._id.toString()}_${questionIndex}`, // Question ID
          quizId: quiz._id.toString(), // Quiz ID
          questionIndex: questionIndex, // Question position in quiz
          question: ques.question,
          questionType: ques.questionType,
          imageUrl: ques.imageUrl || null,
          marks: ques.marks || null,
          options: ques.options || [],
          subject: quiz.subject,
          className: quiz.className,
          chapter: quiz.chapter,
          book: quiz.book,
          quizTitle: quiz.title,
          createdAt: quiz.createdAt,
          // Navigation URLs
          quizUrl: `/quizItems/${quiz._id.toString()}`,
          specificQuestionUrl: `/quizItems/${quiz._id.toString()}/questions/${questionIndex}`
        };
      });
    });

    console.log("📊 Total questions found:", results.length);
    console.log("📊 Questions with images:", results.filter(r => r.imageUrl).length);

    // Extra text search
    if (q) {
      const regex = new RegExp(q, "i");
      results = results.filter(item =>
        regex.test(item.question) ||
        regex.test(item.chapter) ||
        regex.test(item.subject) ||
        regex.test(item.book)
      );
    }

    // Pagination
    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginated = results.slice(start, end);

    res.json({
      total: results.length,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(results.length / limit),
      data: paginated
    });

  } catch (err) {
    console.error("❌ Error fetching questions:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
});



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

app.get('/chapterd', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, book, subject, class: className, search } = req.query;
    const skip = (page - 1) * pageSize;

    let filter = {};

    // Apply filters with partial match
    if (subject) filter.subject = new RegExp(subject, "i");
    if (className) filter.class = new RegExp(className, "i");
    if (search) {
      filter.$or = [
        { subject: new RegExp(search, "i") },
        { class: new RegExp(search, "i") }
      ];
    }

    // Fetch chapters with populate + book filter and sort by createdAt descending
    const chapters = await Chapter.find(filter)
      .populate({
        path: "book",
        select: "book -_id",
        match: book ? { book: new RegExp(book, "i") } : {}
      })
      .sort({ createdAt: -1 }) // Added sorting - newest first
      .skip(skip)
      .limit(Number(pageSize))
      .lean();

    // Remove items where book didn't match
    const filteredChapters = chapters.filter(ch => ch.book !== null);

    const total = filteredChapters.length;

    const results = filteredChapters.map(ch => ({
      ...ch,
      book: ch.book?.book || null,
      createdAt: ch.createdAt?.toISOString(), // Include createdAt in response
      updatedAt: ch.updatedAt?.toISOString()  // Include updatedAt in response
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

const fs = require('fs');
const path = require('path');

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Test Cloudinary configuration endpoint
app.get('/test-cloudinary', async (req, res) => {
  try {
    console.log("🔍 Testing Cloudinary configuration...");
    console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("API Key:", process.env.CLOUDINARY_API_KEY);
    console.log("API Secret length:", process.env.CLOUDINARY_API_SECRET?.length);
    
    // Test a simple API call
    const result = await cloudinary.api.ping();
    res.json({
      status: "✅ Cloudinary connection successful",
      result: result
    });
  } catch (error) {
    console.error("❌ Cloudinary test failed:", error);
    res.status(500).json({ 
      error: error.message,
      details: error.error?.message || "Unknown error"
    });
  }
});

// Add better error handling for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: error.message });
  }
  next(error);
});

// Enhanced upload route with better error handling
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log("🔍 Upload request received");
    
    // Check environment variables
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error("Missing Cloudinary environment variables");
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("📁 File details:", {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Check if file exists on disk
    if (!fs.existsSync(req.file.path)) {
      throw new Error("Uploaded file not found on disk");
    }

    console.log("🚀 Starting Cloudinary upload...");
    
    // Test Cloudinary connection first
    try {
      await cloudinary.api.ping();
      console.log("✅ Cloudinary connection verified");
    } catch (pingError) {
      console.error("❌ Cloudinary ping failed:", pingError);
      throw new Error(`Cloudinary connection failed: ${pingError.message}`);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "quiz-images",
      resource_type: "auto",
      transformation: [
        { width: 1000, height: 1000, crop: "limit" }, // Resize large images
        { quality: "auto" } // Optimize quality
      ]
    });

    console.log("✅ Cloudinary upload successful:", result.secure_url);

    // Clean up temp file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting temp file:", err);
      else console.log("🗑️ Temporary file deleted");
    });

    res.json({
      message: "Uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes
    });

  } catch (err) {
    console.error("❌ Upload error:", {
      message: err.message,
      name: err.name,
      http_code: err.http_code,
      error: err.error
    });
    
    // Clean up temp file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error("Error deleting temp file:", unlinkErr);
      });
    }
    
    res.status(500).json({ 
      error: err.message || "Upload failed",
      details: err.error?.message || err.http_code || "Unknown error"
    });
  }
});

// Alternative: Direct upload to Cloudinary without saving locally
const uploadMemory = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post("/upload-direct", uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("📁 File received in memory:", req.file.originalname);

    // Upload buffer directly to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "quiz-images", resource_type: "auto" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    console.log("✅ Direct upload successful:", result.secure_url);

    res.json({
      message: "Uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id
    });

  } catch (err) {
    console.error("❌ Direct upload error:", err);
    res.status(500).json({ 
      error: err.message || "Upload failed"
    });
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


app.put('/chapter/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedChapter = await Chapter.findByIdAndUpdate(
      id,
      { 
        $set: updateData
      },
      { 
        new: true,        // Return updated document
        runValidators: true,  // Run schema validations
        timestamps: true      // Ensure timestamps are updated
      }
    ).populate('book', 'book code subject class');

    if (!updatedChapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    res.json({
      id: updatedChapter._id.toString(),
      subject: updatedChapter.subject,
      class: updatedChapter.class,
      book: {
        id: updatedChapter.book._id.toString(),
        name: updatedChapter.book.book,
        code: updatedChapter.book.code,
        subject: updatedChapter.book.subject,
        class: updatedChapter.book.class
      },
      chapters: updatedChapter.chapters.map(ch => ({
        id: ch._id.toString(),
        chapterName: ch.chapterName,
        number: ch.number
      })),
      createdAt: updatedChapter.createdAt.toISOString(),
      updatedAt: updatedChapter.updatedAt.toISOString()  // Include updatedAt in response
    });

  } catch (err) {
    console.error('❌ Error updating chapter:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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
    console.log("📩 Incoming quiz data:", JSON.stringify(req.body, null, 2));
    
    const { className, subject, book, title, chapter, questions } = req.body;

    // ✅ Validation - removed status validation
    if (!className || !subject || !book || !chapter) {
      return res.status(400).json({ 
        message: 'Missing required fields: className, subject, book, chapter',
        received: { className, subject, book, chapter }
      });
    }
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        message: 'questions must be a non-empty array',
        received: questions
      });
    }

    // ✅ Validate each question - REMOVED correctAnswer validation completely
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.questionType || !q.question || !q.marks) {
        return res.status(400).json({
          message: `Question ${i + 1}: Missing required fields (questionType, question, marks)`,
          question: q
        });
      }

      // Check if MCQ has options
      if (q.questionType === "mcq" && (!q.options || !Array.isArray(q.options) || q.options.length === 0)) {
        return res.status(400).json({
          message: `Question ${i + 1}: MCQ must have options array`,
          question: q
        });
      }
    }

    console.log("✅ Validation passed, creating quiz...");

    // ✅ Create new Quiz - status defaults to true
    const newQuiz = new QuizItem({
      className,
      subject,
      book,
      title: title || `Quiz for ${chapter}`,
      chapter,
      questions
    });

    await newQuiz.save();
    console.log("✅ Quiz saved successfully:", newQuiz._id);

    // ✅ Custom Response - removed correctAnswer from response
    res.status(201).json({
      id: newQuiz._id.toString(),
      className: newQuiz.className,
      subject: newQuiz.subject,
      book: newQuiz.book,
      title: newQuiz.title,
      chapter: newQuiz.chapter,
      questions: newQuiz.questions.map(q => ({
        questionType: q.questionType,
        question: q.question,
        marks: q.marks,
        options: q.options ? q.options.map(opt => ({ 
          text: opt.text, 
          isCorrect: opt.isCorrect 
        })) : [],
        imageUrl: q.imageUrl || null
      })),
      createdAt: newQuiz.createdAt.toISOString(),
      message: 'Quiz created successfully'
    });

  } catch (err) {
    console.error('❌ Server error (create quiz):', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation Error',
        details: Object.keys(err.errors).map(key => ({
          field: key,
          message: err.errors[key].message
        }))
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
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
      title: quiz.title,
      chapter: quiz.chapter,
      status: quiz.status,
      questions: quiz.questions.map((q, index) => ({
        questionIndex: index,
        questionType: q.questionType,
        question: q.question,
        marks: q.marks,
        options: q.options || [],
        correctAnswer: q.correctAnswer || null,
        imageUrl: q.imageUrl || null
      })),
      questionCount: quiz.questions.length,
      totalMarks: quiz.questions.reduce((sum, q) => sum + (q.marks || 0), 0),
      hasImages: quiz.questions.some(q => q.imageUrl),
      createdAt: quiz.createdAt.toISOString(),
      updatedAt: quiz.updatedAt.toISOString()
    });

  } catch (err) {
    console.error('❌ Error fetching full quiz data:', err);
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

// Add this route after your POST /quizItems route

// GET all QuizItems with filtering and pagination
app.get('/quizItems', async (req, res) => {
  try {
    const { 
      className, 
      subject, 
      book, 
      chapter, 
      status,
      page = 1, 
      limit = 10,
      search 
    } = req.query;

    // Build filter object
    const filter = {};
    if (className) filter.className = className;
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (book) filter.book = new RegExp(book, 'i');
    if (chapter) filter.chapter = new RegExp(chapter, 'i');
    if (status !== undefined) filter.status = status === 'true';

    // Add text search across multiple fields
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { book: new RegExp(search, 'i') },
        { chapter: new RegExp(search, 'i') },
        { 'questions.question': new RegExp(search, 'i') }
      ];
    }

    console.log('🔍 QuizItems filter:', filter);

    // Get total count for pagination
    const total = await QuizItem.countDocuments(filter);

    // Get quizzes with pagination
    const quizzes = await QuizItem.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      quizzes: quizzes.map(quiz => ({
        id: quiz._id.toString(),
        className: quiz.className,
        subject: quiz.subject,
        book: quiz.book,
        title: quiz.title,
        chapter: quiz.chapter,
        status: quiz.status,
        questionCount: quiz.questions.length,
        hasImages: quiz.questions.some(q => q.imageUrl),
        createdAt: quiz.createdAt.toISOString(),
        updatedAt: quiz.updatedAt.toISOString()
      }))
    });

  } catch (err) {
    console.error('❌ Error fetching QuizItems:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Add this route after your existing routes
app.get('/test-upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-upload.html'));
});

// Add this route to check environment variables
app.get('/check-env', (req, res) => {
  res.json({
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "Missing",
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "Missing", 
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? `Set (${process.env.CLOUDINARY_API_SECRET.length} chars)` : "Missing",
    NODE_ENV: process.env.NODE_ENV || "development"
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Delete QuizItem by ID
app.delete('/quizItems/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Attempting to delete QuizItem with ID: ${id}`);

    const deletedQuiz = await QuizItem.findByIdAndDelete(id);

    if (!deletedQuiz) {
      return res.status(404).json({ message: 'Quiz item not found' });
    }

    console.log(`✅ QuizItem deleted successfully: ${deletedQuiz._id}`);

    res.json({
      message: 'Quiz item deleted successfully',
      deletedId: deletedQuiz._id.toString(),
      deletedQuiz: {
        title: deletedQuiz.title,
        className: deletedQuiz.className,
        subject: deletedQuiz.subject,
        book: deletedQuiz.book,
        chapter: deletedQuiz.chapter,
        questionCount: deletedQuiz.questions.length
      }
    });

  } catch (err) {
    console.error('❌ Error deleting quiz item:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get chapter by ID with full details
app.get('/chapter/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find chapter and populate book details
    const chapterDoc = await Chapter.findById(id)
      .populate('book', 'book code subject class')
      .lean();

    if (!chapterDoc) {
      return res.status(404).json({ message: 'Chapter not found' });
    }

    // Return formatted response
    res.json({
      id: chapterDoc._id.toString(),
      subject: chapterDoc.subject,
      class: chapterDoc.class,
      book: {
        id: chapterDoc.book._id.toString(),
        name: chapterDoc.book.book,
        code: chapterDoc.book.code,
        subject: chapterDoc.book.subject,
        class: chapterDoc.book.class
      },
      chapters: chapterDoc.chapters.map(ch => ({
        id: ch._id.toString(),
        chapterName: ch.chapterName,
        number: ch.number
      })),
      chapterCount: chapterDoc.chapters.length,
      createdAt: chapterDoc.createdAt?.toISOString(),
      updatedAt: chapterDoc.updatedAt?.toISOString()
    });

  } catch (err) {
    console.error('❌ Error fetching chapter by ID:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
