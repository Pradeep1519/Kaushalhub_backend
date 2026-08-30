const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Trainer = require('../models/Trainer');

const router = express.Router();

// Helper functions
const getCourseStatus = (progress) => {
  if (progress === 0) return "Not Started";
  if (progress === 100) return "Completed";
  return "In Progress";
};

const getCourseCategory = (title) => {
  if (!title) return "General";
  if (title.includes('Web') || title.includes('Development') || title.includes('Programming')) return "Programming";
  if (title.includes('Data') || title.includes('Algorithm') || title.includes('DSA')) return "Computer Science";
  if (title.includes('Digital') || title.includes('Marketing')) return "Marketing";
  if (title.includes('PLC') || title.includes('Automation')) return "Industrial Automation";
  return "General";
};

// @route   GET /api/courses/public
router.get('/public', async (req, res) => {
  try {
    const courses = await Course.findPublic();
    const populatedCourses = await Promise.all(
      courses.map(async (course) => {
        const trainer = course.trainerId ? await Trainer.findById(course.trainerId) : null;
        return {
          ...course,
          trainer: trainer || null,
          trainerId: course.trainerId || trainer?.id || null
        };
      })
    );

    res.json({
      success: true,
      count: populatedCourses.length,
      courses: populatedCourses
    });
  } catch (error) {
    console.error('Get public courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching public courses'
    });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const course = await Course.findBySlug(req.params.slug);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const trainer = course.trainerId ? await Trainer.findById(course.trainerId) : null;

    res.json({
      success: true,
      course: {
        ...course,
        trainer: trainer || null
      }
    });
  } catch (error) {
    console.error('Get public course details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching course details'
    });
  }
});

// @route   GET /api/courses/all
router.get('/all', async (req, res) => {
  try {
    const courses = await Course.find();

    res.json({
      success: true,
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        trainerId: course.trainerId,
        duration: course.duration,
        category: course.category,
        instructor: "KaushalHub Expert"
      }))
    });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
});

// @route   GET /api/courses/trainer/my-courses
router.get('/trainer/my-courses', auth, async (req, res) => {
  try {
    if (req.user.role !== 'trainer') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Trainer role required.'
      });
    }

    const courses = await Course.find({ trainerId: req.user.id });
    
    res.json({
      success: true,
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        duration: course.duration,
        category: course.category,
        status: 'active',
        students: Math.floor(Math.random() * 2000) + 500,
        rating: 4.5 + (Math.random() * 0.5)
      }))
    });
  } catch (error) {
    console.error('Get trainer courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assigned courses'
    });
  }
});

// @route   POST /api/courses/admin/create
router.post('/admin/create', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { title, description, price, trainerId, duration, category } = req.body;

    const course = await Course.create({
      title,
      description,
      price,
      trainerId,
      duration,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating course'
    });
  }
});

// @route   PUT /api/courses/admin/update/:id
router.put('/admin/update/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const course = await Course.findByIdAndUpdate(req.params.id, req.body);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating course'
    });
  }
});

// @route   POST /api/courses/enroll
router.post('/enroll', auth, async (req, res) => {
  try {
    const { courseId, courseTitle, coursePrice, trainerId } = req.body;

    if (!courseId || !courseTitle) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and title are required'
      });
    }

    // Check if already enrolled
    const alreadyEnrolled = req.user.enrolledCourses?.some(
      course => course.courseId === courseId
    );

    if (alreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Add course to enrolled courses
    const user = await User.findByIdAndUpdate(req.user.id, {
      $push: {
        enrolledCourses: {
          courseId,
          courseTitle,
          coursePrice: coursePrice || 0,
          trainerId: trainerId || '',
          enrolledAt: new Date().toISOString(),
          progress: 0,
          status: 'active'
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Successfully enrolled in course',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        enrolledCourses: user.enrolledCourses
      }
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during enrollment'
    });
  }
});

// @route   GET /api/courses/my-courses
router.get('/my-courses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.json({
        success: true,
        courses: [],
        message: 'No courses enrolled yet'
      });
    }

    const courses = user.enrolledCourses.map((course) => ({
      id: course.courseId,
      title: course.courseTitle,
      instructor: "KaushalHub Expert",
      progress: course.progress || 0,
      duration: "12 Weeks",
      students: Math.floor(Math.random() * 2000) + 500,
      rating: 4.5 + (Math.random() * 0.5),
      status: getCourseStatus(course.progress),
      category: getCourseCategory(course.courseTitle),
      modules: 24,
      videos: 120,
      description: `${course.courseTitle} - Complete course with hands-on projects`
    }));

    console.log('✅ Courses fetched:', user.email, 'Total:', courses.length);
    
    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching courses'
    });
  }
});

// @route   PUT /api/courses/update-progress
router.put('/update-progress', auth, async (req, res) => {
  try {
    const { courseId, progress } = req.body;

    if (!courseId || progress === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Course ID and progress are required'
      });
    }

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const courseIndex = user.enrolledCourses?.findIndex(
      course => course.courseId === courseId
    );

    if (courseIndex === -1 || courseIndex === undefined) {
      return res.status(404).json({
        success: false,
        message: 'Course not found in enrolled courses'
      });
    }

    // Update progress
    const updatedCourses = [...user.enrolledCourses];
    updatedCourses[courseIndex].progress = progress;
    
    if (progress === 100) {
      updatedCourses[courseIndex].status = 'Completed';
    } else if (progress > 0) {
      updatedCourses[courseIndex].status = 'In Progress';
    } else {
      updatedCourses[courseIndex].status = 'Not Started';
    }

    await User.findByIdAndUpdate(req.user.id, {
      enrolledCourses: updatedCourses
    });

    console.log('✅ Progress updated:', {
      user: user.email,
      course: updatedCourses[courseIndex].courseTitle,
      progress: progress + '%'
    });

    res.json({
      success: true,
      message: 'Course progress updated successfully',
      data: {
        courseId,
        progress,
        status: updatedCourses[courseIndex].status
      }
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating progress'
    });
  }
});

module.exports = router;