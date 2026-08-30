const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const User = require('../models/User');
const Batch = require('../models/Batch');

// Every route below requires a valid JWT AND role === 'trainer'
router.use(auth, requireRole('trainer'));

// @route   GET /api/teacher/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const batches = await Batch.find({ teacherId: req.user.id });
    const studentIds = [...new Set(batches.flatMap(b => b.studentIds || []))];

    res.json({
      success: true,
      data: {
        totalBatches: batches.length,
        activeBatches: batches.filter(b => b.status === 'active').length,
        totalStudents: studentIds.length
      }
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard' });
  }
});

// @route   GET /api/teacher/batches
// Only batches this logged-in teacher has been assigned by admin
router.get('/batches', async (req, res) => {
  try {
    const batches = await Batch.find({ teacherId: req.user.id });
    res.json({ success: true, count: batches.length, batches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching batches' });
  }
});

// @route   GET /api/teacher/batches/:id
router.get('/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch || batch.teacherId !== req.user.id) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const students = await Promise.all(
      (batch.studentIds || []).map(async (id) => {
        const s = await User.findById(id);
        if (!s) return null;
        const { password, resetToken, ...safe } = s;
        return safe;
      })
    );

    res.json({ success: true, batch, students: students.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching batch details' });
  }
});

// @route   GET /api/teacher/students
// All students across every batch assigned to this teacher
router.get('/students', async (req, res) => {
  try {
    const batches = await Batch.find({ teacherId: req.user.id });
    const studentIds = [...new Set(batches.flatMap(b => b.studentIds || []))];

    const students = await Promise.all(
      studentIds.map(async (id) => {
        const s = await User.findById(id);
        if (!s) return null;
        const { password, resetToken, ...safe } = s;
        return safe;
      })
    );

    res.json({ success: true, count: students.length, students: students.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching students' });
  }
});

// @route   PUT /api/teacher/students/:id/progress
// body: { courseId, progress }  -- teacher updates a student's course progress
router.put('/students/:id/progress', async (req, res) => {
  try {
    const { courseId, progress } = req.body;

    // Make sure this student is actually in one of the teacher's batches
    const batches = await Batch.find({ teacherId: req.user.id });
    const allowedStudentIds = new Set(batches.flatMap(b => b.studentIds || []));
    if (!allowedStudentIds.has(req.params.id)) {
      return res.status(403).json({ success: false, message: 'This student is not in one of your batches' });
    }

    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrolledCourses = (student.enrolledCourses || []).map(c =>
      c.courseId === courseId ? { ...c, progress } : c
    );

    await User.findByIdAndUpdate(req.params.id, { enrolledCourses });
    res.json({ success: true, message: 'Student progress updated' });
  } catch (error) {
    console.error('Teacher update progress error:', error);
    res.status(500).json({ success: false, message: 'Server error updating progress' });
  }
});

module.exports = router;
