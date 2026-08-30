const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE SETUP ====================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// ==================== DATABASE MODELS IMPORT ====================
const User = require('./models/User');
const Enrollment = require('./models/Enrollment');
const Contact = require('./models/Contact');

// ==================== ROUTES IMPORT ====================
const enrollmentRoutes = require('./routes/enrollments');
const studentRoutes = require('./routes/students');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const trainerRoutes = require('./routes/trainers');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');

// ==================== AUTHENTICATION CONFIGURATION ====================
const JWT_SECRET = process.env.JWT_SECRET || 'kaushalhub-super-secret-key-2024';

// ==================== API ROUTES MOUNTING ====================
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/trainers', trainerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);

// ==================== API ROUTES DEFINITION ====================

// ROOT ROUTE
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 KaushalHub Backend Server is Running with Firebase!',
    endpoints: {
      health: 'GET /api/health',
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      forgot_password: 'POST /api/auth/forgot-password',
      reset_password: 'POST /api/auth/reset-password',
      enrollments: 'POST /api/enrollments',
      enrollments_check: 'GET /api/enrollments/check?courseId=...&email=...',
      enrollments_list: 'GET /api/enrollments',
      enrollments_stats: 'GET /api/enrollments/stats',
      courses_enroll: 'POST /api/courses/enroll',
      courses_my_courses: 'GET /api/courses/my-courses',
      courses_update_progress: 'PUT /api/courses/update-progress',
      courses_public: 'GET /api/courses/public',
      trainers_public: 'GET /api/trainers/public',
      users: 'GET /api/users',
      contact: 'POST /api/contact',
      contact_submit: 'POST /api/contact/submit',
      contact_list: 'GET /api/contact',
      student_dashboard: 'GET /api/students/dashboard/:userId'
    },
    database: 'Firebase Firestore',
    timestamp: new Date().toISOString()
  });
});

// HEALTH CHECK ROUTE
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running with Firebase!',
    timestamp: new Date().toISOString(),
    database: 'Firebase Firestore',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ========== CONTACT FORM ROUTES ==========

app.post('/api/contact/submit', async (req, res) => {
  try {
    const { name, email, phone, message, inquiryType, currentCompany, experience, currentSalary, expectedSalary, technicalIssue, placementSupport, course } = req.body;

    console.log('📧 New contact form:', { name, email, inquiryType });

    if (!name || !email || !phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing: name, email, phone, message'
      });
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const contact = await Contact.create({
      name, email, phone,
      subject: `${inquiryType || 'general'} Inquiry - ${course || 'General'}`,
      message, inquiryType: inquiryType || 'general',
      course: course || '', currentCompany: currentCompany || '',
      experience: experience || '', currentSalary: currentSalary || '',
      expectedSalary: expectedSalary || '', technicalIssue: technicalIssue || '',
      placementSupport: placementSupport || '', status: 'new'
    });

    console.log('✅ Contact saved:', contact.id);

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you within 24 hours.',
      data: {
        id: contact.id, name: contact.name, email: contact.email,
        inquiryType: contact.inquiryType, course: contact.course,
        status: contact.status, createdAt: contact.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error saving contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    console.log('📧 Legacy contact form:', { name, email });

    if (!name || !email || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const contact = await Contact.create({
      name, email, phone, subject, message,
      inquiryType: 'general', status: 'new'
    });

    console.log('✅ Contact saved (legacy):', contact.id);

    res.status(201).json({
      success: true,
      message: 'Thank you for contacting us!',
      data: {
        id: contact.id, name: contact.name, email: contact.email,
        subject: contact.subject, status: contact.status
      }
    });

  } catch (error) {
    console.error('❌ Error saving contact (legacy):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/contact', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const contacts = await Contact.find(filter);
    const total = await Contact.countDocuments(filter);

    // Manual pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedContacts = contacts.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedContacts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalContacts: total,
        hasNext: endIndex < total,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/contact/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('❌ Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.put('/api/contact/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['new', 'read', 'replied', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required: new, read, replied, resolved'
      });
    }

    const contact = await Contact.findByIdAndUpdate(req.params.id, { status });

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact status updated',
      data: contact
    });
  } catch (error) {
    console.error('❌ Error updating contact:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// COURSE ENROLLMENT ROUTE
app.post('/api/courses/enroll', async (req, res) => {
  try {
    console.log('🎓 Enrollment request:', req.body);
    
    const { courseId, courseTitle, coursePrice, email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const alreadyEnrolled = user.enrolledCourses?.some(
      course => course.courseId === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    await User.findByIdAndUpdate(user.id, {
      $push: {
        enrolledCourses: {
          courseId,
          courseTitle,
          coursePrice,
          enrolledAt: new Date().toISOString(),
          progress: 0,
          status: 'active'
        }
      }
    });

    console.log('✅ Course enrolled:', user.email, '->', courseTitle);

    res.json({
      success: true,
      message: 'Successfully enrolled in course'
    });

  } catch (error) {
    console.error('❌ Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment'
    });
  }
});

// USER MANAGEMENT ROUTES
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      success: true,
      count: users.length,
      users: users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      })
    });
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

// ERROR HANDLING
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

app.use((err, req, res, next) => {
  console.error('🚨 Unhandled Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// SERVER STARTUP
const PORT = process.env.PORT || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Root URL: http://localhost:${PORT}/`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth APIs: http://localhost:${PORT}/api/auth/signup & /login`);
  console.log(`🔑 Forgot Password: http://localhost:${PORT}/api/auth/forgot-password`);
  console.log(`🔄 Reset Password: http://localhost:${PORT}/api/auth/reset-password`);
  console.log(`🎓 Course API: http://localhost:${PORT}/api/courses/enroll`);
  console.log(`📚 Courses API: http://localhost:${PORT}/api/courses/my-courses`);
  console.log(`📈 Progress API: http://localhost:${PORT}/api/courses/update-progress`);
  console.log(`📝 Enrollment API: http://localhost:${PORT}/api/enrollments`);
  console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
  console.log(`📧 Contact API: http://localhost:${PORT}/api/contact`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Database: Firebase Firestore`);
});