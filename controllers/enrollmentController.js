// controllers/enrollmentController.js
const Enrollment = require('../models/Enrollment');

// ✅ Check if user is already enrolled in a specific course
const checkEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id; // User ID from auth middleware

    console.log('🔍 Checking enrollment for:', { userId, courseId });

    // Check database for existing enrollment
    const existingEnrollment = await Enrollment.findOne({
      where: { 
        userId: userId,
        courseId: courseId,
        status: 'active' // Only check active enrollments
      }
    });

    if (existingEnrollment) {
      console.log('✅ User already enrolled in course');
      return res.status(200).json({
        success: true,
        isEnrolled: true,
        enrollment: {
          id: existingEnrollment.id,
          status: existingEnrollment.status,
          enrolledAt: existingEnrollment.enrolledAt
        },
        message: 'You are already enrolled in this course'
      });
    }

    // If no active enrollment found
    console.log('❌ User not enrolled in course');
    return res.status(200).json({
      success: true,
      isEnrolled: false,
      message: 'You are not enrolled in this course'
    });

  } catch (error) {
    console.error('❌ Error checking enrollment:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking enrollment status',
      error: error.message
    });
  }
};

module.exports = {
  checkEnrollment
};