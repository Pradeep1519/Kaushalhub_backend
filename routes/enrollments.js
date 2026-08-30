const express = require('express');
const router = express.Router();
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @route   GET /api/enrollments/check
router.get('/check', async (req, res) => {
  try {
    const { courseId, email, phone } = req.query;

    console.log('🔍 Checking enrollment:', { courseId, email });

    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Course ID is required' 
      });
    }

    if (!email && !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email or phone is required' 
      });
    }

    // Check Users collection
    let isEnrolledInUsers = false;
    let userEnrollmentData = null;
    
    if (email) {
      const user = await User.findOne({ email });
      if (user && user.enrolledCourses) {
        const enrolledCourse = user.enrolledCourses.find(
          course => course.courseId === courseId
        );
        if (enrolledCourse) {
          isEnrolledInUsers = true;
          userEnrollmentData = {
            id: user.id,
            status: enrolledCourse.status || 'active',
            enrollmentDate: enrolledCourse.enrolledAt,
            courseId: courseId,
            source: 'users_collection'
          };
        }
      }
    }

    // Check Enrollments collection
    const query = { courseId };
    if (email) query.email = email.toLowerCase();
    if (phone) query.phone = phone;

    const existingEnrollment = await Enrollment.findOne(query);

    const isEnrolled = isEnrolledInUsers || !!existingEnrollment;

    if (isEnrolled) {
      const enrollmentData = existingEnrollment ? {
        id: existingEnrollment.id,
        status: existingEnrollment.status,
        enrollmentDate: existingEnrollment.enrollmentDate,
        courseId: existingEnrollment.courseId,
        source: 'enrollments_collection'
      } : userEnrollmentData;
      
      return res.json({
        success: true,
        isEnrolled: true,
        isPending: existingEnrollment ? existingEnrollment.status === 'pending_payment' : false,
        courseId,
        enrollment: enrollmentData,
        message: 'You are already enrolled in this course.'
      });
    }

    res.json({
      success: true,
      isEnrolled: false,
      isPending: false,
      courseId,
      message: 'No existing enrollment found.'
    });

  } catch (error) {
    console.error('❌ Error checking enrollment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// @route   POST /api/enrollments
router.post('/', async (req, res) => {
  try {
    const enrollmentData = req.body;
    
    console.log('📝 New enrollment:', {
      course: enrollmentData.courseTitle,
      student: enrollmentData.fullName,
      email: enrollmentData.email
    });

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'gender', 'address', 'city', 'state', 'pincode', 'courseId', 'courseTitle', 'originalPrice', 'finalPrice'];
    const missingFields = requiredFields.filter(field => !enrollmentData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields',
        missingFields 
      });
    }

    // Check duplicate in both collections
    const existingEnrollment = await Enrollment.findOne({ 
      email: enrollmentData.email.toLowerCase(), 
      courseId: enrollmentData.courseId
    });

    const user = await User.findOne({ email: enrollmentData.email });
    const existingInUser = user?.enrolledCourses?.some(c => c.courseId === enrollmentData.courseId);

    if (existingEnrollment || existingInUser) {
      return res.status(409).json({ 
        success: false, 
        error: 'You are already enrolled in this course'
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create(enrollmentData);
    
    console.log('✅ Enrollment saved:', enrollment.id);

    // Add to user's enrolled courses
    if (user) {
      await User.findByIdAndUpdate(user.id, {
        $push: {
          enrolledCourses: {
            courseId: enrollmentData.courseId,
            courseTitle: enrollmentData.courseTitle,
            coursePrice: enrollmentData.finalPrice,
            enrolledAt: new Date().toISOString(),
            progress: 0,
            status: 'active'
          }
        }
      });
      console.log('✅ Course added to user account');
    }

    res.status(201).json({ 
      success: true, 
      message: 'Enrollment saved successfully',
      enrollmentId: enrollment.id,
      data: {
        id: enrollment.id,
        studentName: enrollment.fullName,
        course: enrollment.courseTitle,
        finalPrice: enrollment.finalPrice,
        status: enrollment.status,
        enrollmentDate: enrollment.enrollmentDate
      }
    });

  } catch (error) {
    console.error('❌ Error saving enrollment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// @route   GET /api/enrollments
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, courseId } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (courseId) filter.courseId = courseId;

    const enrollments = await Enrollment.find(filter);
    const total = await Enrollment.countDocuments(filter);

    // Manual pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEnrollments = enrollments.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedEnrollments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalEnrollments: total,
        hasNext: endIndex < total,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching enrollments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @route   GET /api/enrollments/stats
router.get('/stats', async (req, res) => {
  try {
    const allEnrollments = await Enrollment.find();
    
    const totalEnrollments = allEnrollments.length;
    const pendingPayments = allEnrollments.filter(e => e.status === 'pending_payment').length;
    const completedPayments = allEnrollments.filter(e => e.status === 'payment_completed').length;
    const enrolledStudents = allEnrollments.filter(e => e.status === 'enrolled').length;

    // Course-wise stats
    const courseStats = {};
    allEnrollments.forEach(e => {
      if (!courseStats[e.courseId]) {
        courseStats[e.courseId] = {
          courseTitle: e.courseTitle,
          count: 0,
          totalRevenue: 0
        };
      }
      courseStats[e.courseId].count++;
      courseStats[e.courseId].totalRevenue += e.finalPrice || 0;
    });

    res.json({
      success: true,
      data: {
        totalEnrollments,
        pendingPayments,
        completedPayments,
        enrolledStudents,
        courseStats: Object.entries(courseStats).map(([id, data]) => ({
          _id: id,
          ...data
        }))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @route   GET /api/enrollments/:id
router.get('/:id', async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Enrollment not found' 
      });
    }

    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    console.error('❌ Error fetching enrollment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @route   PUT /api/enrollments/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status, paymentId, transactionId } = req.body;
    
    const allowedStatuses = ['pending_payment', 'payment_completed', 'enrolled', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status' 
      });
    }

    const updateData = { status };
    if (paymentId) updateData.paymentId = paymentId;
    if (transactionId) updateData.transactionId = transactionId;
    if (status === 'payment_completed') updateData.paymentDate = new Date().toISOString();

    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, updateData);

    if (!enrollment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Enrollment not found' 
      });
    }

    console.log('🔄 Enrollment status updated:', enrollment.id);

    // Update user's course status
    if (status === 'payment_completed' || status === 'enrolled') {
      const user = await User.findOne({ email: enrollment.email });
      if (user && user.enrolledCourses) {
        const updatedCourses = user.enrolledCourses.map(course => {
          if (course.courseId === enrollment.courseId) {
            return { ...course, status: 'active' };
          }
          return course;
        });
        
        await User.findByIdAndUpdate(user.id, {
          enrolledCourses: updatedCourses
        });
      }
    }

    res.json({
      success: true,
      message: 'Enrollment status updated',
      data: enrollment
    });
  } catch (error) {
    console.error('❌ Error updating enrollment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @route   DELETE /api/enrollments/:id
router.delete('/:id', async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    
    if (!enrollment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Enrollment not found' 
      });
    }

    // Remove from user's enrolled courses
    const user = await User.findOne({ email: enrollment.email });
    if (user) {
      await User.findByIdAndUpdate(user.id, {
        $pull: {
          enrolledCourses: { courseId: enrollment.courseId }
        }
      });
    }

    console.log('🗑️ Enrollment deleted:', enrollment.id);

    res.json({
      success: true,
      message: 'Enrollment cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting enrollment:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// @route   GET /api/enrollments/user/:email
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const enrollments = await Enrollment.find({ email: email.toLowerCase() });

    res.json({
      success: true,
      data: enrollments,
      total: enrollments.length
    });
  } catch (error) {
    console.error('❌ Error fetching user enrollments:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;