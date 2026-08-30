const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// @route   POST /api/students/check-enrollment
router.post('/check-enrollment', async (req, res) => {
  try {
    const { email } = req.body;

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

    const isEnrolled = user.enrolledCourses && user.enrolledCourses.length > 0;

    res.json({
      success: true,
      isEnrolled,
      enrolledCourses: user.enrolledCourses || [],
      message: isEnrolled 
        ? 'Student is enrolled in courses' 
        : 'Student is not enrolled in any course'
    });

  } catch (error) {
    console.error('Enrollment check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment check'
    });
  }
});

// @route   GET /api/students/dashboard/:userId
router.get('/dashboard/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const dashboardData = {
      studentName: user.name,
      studentEmail: user.email,
      studentId: user.id,
      enrolledCourses: user.enrolledCourses ? user.enrolledCourses.length : 0,
      completedCourses: user.enrolledCourses ? user.enrolledCourses.filter(course => course.progress === 100).length : 0,
      overallProgress: user.enrolledCourses && user.enrolledCourses.length > 0 
        ? user.enrolledCourses.reduce((acc, course) => acc + (course.progress || 0), 0) / user.enrolledCourses.length 
        : 0,
      recentEnrollments: user.enrolledCourses || [],
      joinDate: user.createdAt,
      lastLogin: user.lastLogin || user.createdAt
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
});

module.exports = router;