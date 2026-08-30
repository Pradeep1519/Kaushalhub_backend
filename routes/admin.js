const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requireRole = require('../middleware/roles');
const User = require('../models/User');
const Course = require('../models/Course');
const Batch = require('../models/Batch');
const Enrollment = require('../models/Enrollment');
const Contact = require('../models/Contact');
const Announcement = require('../models/Announcement');
const NotificationSchedule = require('../models/NotificationSchedule');
const bcrypt = require('bcryptjs');

// Every route below requires a valid JWT AND role === 'admin'
router.use(auth, requireRole('admin'));

// ==================== DASHBOARD ====================

// @route   GET /api/admin/dashboard/stats
router.get('/dashboard/stats', async (req, res) => {
  try {
    const [users, courses, batches, enrollments] = await Promise.all([
      User.find(),
      Course.find(),
      Batch.find(),
      Enrollment.find()
    ]);

    const students = users.filter(u => u.role === 'student' || !u.role);
    const teachers = users.filter(u => u.role === 'trainer');
    const enrolledStudents = students.filter(u => u.enrolledCourses && u.enrolledCourses.length > 0);

    const totalRevenue = enrollments
      .filter(e => e.status === 'paid' || e.status === 'active')
      .reduce((sum, e) => sum + (Number(e.finalPrice) || 0), 0);

    res.json({
      success: true,
      data: {
        totalStudents: students.length,
        enrolledStudents: enrolledStudents.length,
        notEnrolledStudents: students.length - enrolledStudents.length,
        totalTeachers: teachers.length,
        totalCourses: courses.length,
        totalBatches: batches.length,
        activeBatches: batches.filter(b => b.status === 'active').length,
        totalEnrollments: enrollments.length,
        totalRevenue
      }
    });
  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching dashboard stats' });
  }
});

// ==================== ANALYTICS / REPORTS ====================
// @route   GET /api/admin/analytics
router.get('/analytics', async (req, res) => {
  try {
    // basic analytics: monthly enrollments & revenue (last 6 months)
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }

    const enrollments = await Enrollment.find();
    const courses = await Course.find();
    const users = await User.find();

    // monthly aggregates
    const monthly = months.map(m => {
      const monthLabel = new Date(m.year, m.month, 1).toLocaleString('default', { month: 'short' });
      const entries = enrollments.filter(e => {
        const dt = e.enrollmentDate ? new Date(e.enrollmentDate) : (e.createdAt ? new Date(e.createdAt.seconds * 1000) : null);
        if (!dt) return false;
        return dt.getFullYear() === m.year && dt.getMonth() === m.month;
      });
      const students = entries.length;
      const revenue = entries.reduce((s, e) => s + (Number(e.finalPrice) || 0), 0);
      return { month: monthLabel, year: m.year, students, revenue };
    });

    // top courses by enrollments
    const courseCounts = {};
    enrollments.forEach(e => {
      if (!e.courseId) return;
      courseCounts[e.courseId] = (courseCounts[e.courseId] || 0) + 1;
    });

    const coursePerformance = Object.entries(courseCounts)
      .map(([courseId, count]) => {
        const course = courses.find(c => c.id === courseId) || { id: courseId, title: 'Unknown' };
        return { courseId, title: course.title || course.title || 'Untitled', enrollments: count };
      })
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 6);

    // top instructors by revenue (sum enrollments for their courses)
    const trainerRevenue = {};
    enrollments.forEach(e => {
      const course = courses.find(c => c.id === e.courseId);
      if (!course || !course.trainerId) return;
      trainerRevenue[course.trainerId] = (trainerRevenue[course.trainerId] || 0) + (Number(e.finalPrice) || 0);
    });

    const topInstructors = Object.entries(trainerRevenue)
      .map(([trainerId, revenue]) => {
        const user = users.find(u => u.id === trainerId) || { id: trainerId, name: 'Unknown' };
        return { trainerId, name: user.name || 'Unnamed', revenue };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    res.json({ success: true, data: { monthly, coursePerformance, topInstructors } });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error computing analytics' });
  }
});

// ==================== STUDENT MANAGEMENT ====================

// @route   GET /api/admin/students
// Full list of every user who signed up on the home website, with enrollment + batch status
// Optional query: ?q=searchTerm (searches name + email)
router.get('/students', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const users = await User.find();
    const batches = await Batch.find();

    let students = users
      .filter(u => u.role === 'student' || !u.role)
      .map(u => {
        const { password, resetToken, ...safe } = u;
        const studentBatches = batches.filter(b => (b.studentIds || []).includes(u.id));
        return {
          ...safe,
          isEnrolled: !!(u.enrolledCourses && u.enrolledCourses.length > 0),
          batches: studentBatches.map(b => ({ id: b.id, name: b.name, courseTitle: b.courseTitle }))
        };
      });

    if (q) {
      students = students.filter(s => (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q));
    }

    res.json({ success: true, count: students.length, students });
  } catch (error) {
    console.error('Admin get students error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching students' });
  }
});

// @route   GET /api/admin/students/:id
router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const { password, resetToken, ...safe } = student;
    res.json({ success: true, student: safe });
  } catch (error) {
    console.error('Admin get student error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching student' });
  }
});

// @route   POST /api/admin/students
// Create a new user (student/admin/trainer)
router.post('/students', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'name, email and password are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'A user with this email already exists' });

    const created = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, message: 'User created', user: { id: created.id, name: created.name, email: created.email, role: created.role } });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ success: false, message: 'Server error creating user' });
  }
});

// @route   PUT /api/admin/students/:id
// Update user fields (name, email, profile, isActive)
router.put('/students/:id', async (req, res) => {
  try {
    const update = {};
    const { name, email, profile, isActive } = req.body;
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email;
    if (profile !== undefined) update.profile = profile;
    if (isActive !== undefined) update.isActive = isActive;

    const updated = await User.findByIdAndUpdate(req.params.id, update);
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User updated' });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ success: false, message: 'Server error updating user' });
  }
});

// @route   POST /api/admin/students/:id/reset-password
// Admin resets a user's password
router.post('/students/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ success: false, message: 'newPassword is required' });

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(newPassword, salt);
    const updated = await User.findByIdAndUpdate(req.params.id, { password: hashed });
    if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Password reset' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
});

// @route   PUT /api/admin/students/:id/status
// Activate / deactivate a student account
router.put('/students/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body;
    const updated = await User.findByIdAndUpdate(req.params.id, { isActive: !!isActive });
    if (!updated) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, message: 'Student status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating student status' });
  }
});

// @route   PUT /api/admin/students/:id/fee
// Update fee status for one of a student's enrolled courses
router.put('/students/:id/fee', async (req, res) => {
  try {
    const { courseId, feeStatus, amountPaid, totalFee } = req.body;
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const enrolledCourses = (student.enrolledCourses || []).map(c => {
      if (c.courseId === courseId) {
        return { ...c, feeStatus: feeStatus || c.feeStatus || 'pending', amountPaid: amountPaid ?? c.amountPaid ?? 0, totalFee: totalFee ?? c.totalFee ?? 0 };
      }
      return c;
    });

    await User.findByIdAndUpdate(req.params.id, { enrolledCourses });
    res.json({ success: true, message: 'Fee details updated' });
  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ success: false, message: 'Server error updating fee details' });
  }
});

// ==================== TEACHER MANAGEMENT ====================

// @route   GET /api/admin/teachers
router.get('/teachers', async (req, res) => {
  try {
    const users = await User.find();
    const teachers = users
      .filter(u => u.role === 'trainer')
      .map(u => { const { password, resetToken, ...safe } = u; return safe; });
    res.json({ success: true, count: teachers.length, teachers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching teachers' });
  }
});

// @route   POST /api/admin/teachers
// Admin creates a teacher/trainer login (id + password stored, hashed, in DB)
router.post('/teachers', async (req, res) => {
  try {
    const { name, email, password, phone, specialization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    const teacher = await User.create({
      name, email, password, role: 'trainer'
    });

    await User.findByIdAndUpdate(teacher.id, {
      profile: { phone: phone || '', specialization: specialization || '' }
    });

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email, role: 'trainer' }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ success: false, message: 'Server error creating teacher' });
  }
});

// @route   PUT /api/admin/teachers/:id
router.put('/teachers/:id', async (req, res) => {
  try {
    const { name, phone, specialization, isActive } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (isActive !== undefined) update.isActive = isActive;
    if (phone !== undefined || specialization !== undefined) {
      const teacher = await User.findById(req.params.id);
      update.profile = { ...(teacher?.profile || {}), phone: phone ?? teacher?.profile?.phone, specialization: specialization ?? teacher?.profile?.specialization };
    }

    const updated = await User.findByIdAndUpdate(req.params.id, update);
    if (!updated) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, message: 'Teacher updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating teacher' });
  }
});

// @route   DELETE /api/admin/teachers/:id
router.delete('/teachers/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, { isActive: false, role: 'trainer' });
    if (!updated) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, message: 'Teacher account deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error removing teacher' });
  }
});

// ==================== COURSE MANAGEMENT ====================

// @route   GET /api/admin/courses
router.get('/courses', async (req, res) => {
  try {
    const courses = await Course.find();
    res.json({ success: true, count: courses.length, courses });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching courses' });
  }
});

// @route   POST /api/admin/courses
router.post('/courses', async (req, res) => {
  try {
    const { title, description, price, duration, category, trainerId } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Course title is required' });

    const course = await Course.create({ title, description, price, duration, category, trainerId, status: 'active' });
    res.status(201).json({ success: true, message: 'Course created', course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating course' });
  }
});

// @route   PUT /api/admin/courses/:id
router.put('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course updated', course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating course' });
  }
});

// @route   PUT /api/admin/courses/:id/archive  (soft-delete / remove from home site)
router.put('/courses/:id/archive', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, { status: 'archived' });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course archived' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error archiving course' });
  }
});

// ==================== BATCH MANAGEMENT ====================

// @route   GET /api/admin/batches
router.get('/batches', async (req, res) => {
  try {
    const batches = await Batch.find();
    res.json({ success: true, count: batches.length, batches });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching batches' });
  }
});

// @route   POST /api/admin/batches
router.post('/batches', async (req, res) => {
  try {
    const { name, courseId, courseTitle, teacherId, timing, startDate, endDate, mode } = req.body;
    if (!name || !courseId) {
      return res.status(400).json({ success: false, message: 'Batch name and courseId are required' });
    }

    let teacherName = '';
    if (teacherId) {
      const teacher = await User.findById(teacherId);
      teacherName = teacher?.name || '';
    }

    const batch = await Batch.create({ name, courseId, courseTitle, teacherId, teacherName, timing, startDate, endDate, mode });
    res.status(201).json({ success: true, message: 'Batch created', batch });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ success: false, message: 'Server error creating batch' });
  }
});

// @route   PUT /api/admin/batches/:id
router.put('/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Batch updated', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating batch' });
  }
});

// @route   POST /api/admin/batches/:id/assign-teacher
router.post('/batches/:id/assign-teacher', async (req, res) => {
  try {
    const { teacherId } = req.body;
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'trainer') {
      return res.status(400).json({ success: false, message: 'Valid teacherId is required' });
    }
    const batch = await Batch.findByIdAndUpdate(req.params.id, { teacherId, teacherName: teacher.name });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Teacher assigned to batch', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error assigning teacher' });
  }
});

// @route   POST /api/admin/batches/:id/add-students
// body: { studentIds: [...] }
router.post('/batches/:id/add-students', async (req, res) => {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }
    const batch = await Batch.findByIdAndUpdate(req.params.id, { $addToSet: { studentIds } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Students added to batch', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error adding students to batch' });
  }
});

// @route   POST /api/admin/batches/:id/remove-student
router.post('/batches/:id/remove-student', async (req, res) => {
  try {
    const { studentId } = req.body;
    const batch = await Batch.findByIdAndUpdate(req.params.id, { $pull: { studentIds: studentId } });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Student removed from batch', batch });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error removing student from batch' });
  }
});

// @route   DELETE /api/admin/batches/:id
router.delete('/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, message: 'Batch deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting batch' });
  }
});

// ==================== ENQUIRIES / CONTACT (read access for admin) ====

// ==================== ANNOUNCEMENTS ====================

// @route   GET /api/admin/announcements
router.get('/announcements', async (req, res) => {
  try {
    const announcements = await Announcement.find({}, { limit: 100 });
    res.json({ success: true, count: announcements.length, announcements });
  } catch (error) {
    console.error('Admin get announcements error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching announcements' });
  }
});

// @route   POST /api/admin/announcements
router.post('/announcements', async (req, res) => {
  try {
    const payload = req.body;
    const created = await Announcement.create(payload);
    res.status(201).json({ success: true, message: 'Announcement created', announcement: created });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error creating announcement' });
  }
});

// @route   PUT /api/admin/announcements/:id
router.put('/announcements/:id', async (req, res) => {
  try {
    const updated = await Announcement.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, message: 'Announcement updated', announcement: updated });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error updating announcement' });
  }
});

// @route   DELETE /api/admin/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  try {
    const removed = await Announcement.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Announcement not found' });
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting announcement' });
  }
});

// ==================== NOTIFICATIONS / SCHEDULED ====================

// @route   GET /api/admin/notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await NotificationSchedule.find({}, { limit: 100 });
    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    console.error('Admin get notifications error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

// @route   POST /api/admin/notifications
router.post('/notifications', async (req, res) => {
  try {
    const payload = req.body;
    const created = await NotificationSchedule.create(payload);
    res.status(201).json({ success: true, message: 'Notification scheduled', notification: created });
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ success: false, message: 'Server error creating notification' });
  }
});

// @route   PUT /api/admin/notifications/:id
router.put('/notifications/:id', async (req, res) => {
  try {
    const updated = await NotificationSchedule.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification updated', notification: updated });
  } catch (error) {
    console.error('Update notification error:', error);
    res.status(500).json({ success: false, message: 'Server error updating notification' });
  }
});

// @route   DELETE /api/admin/notifications/:id
router.delete('/notifications/:id', async (req, res) => {
  try {
    const removed = await NotificationSchedule.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
});

// ==================== ENQUIRIES / CONTACT (read access for admin) ====================

// @route   GET /api/admin/contacts
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json({ success: true, count: contacts.length, contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching contacts' });
  }
});

// ==================== RECENT ACTIVITIES (derived) ====
// @route   GET /api/admin/recent
router.get('/recent', async (req, res) => {
  try {
    const [contacts, enrollments, courses] = await Promise.all([
      Contact.find({}, { limit: 10 }),
      Enrollment.find({}, { limit: 10 }),
      Course.find()
    ]);

    const recentEnrollments = (enrollments || []).slice(0, 10).map(e => ({
      type: 'enrollment',
      id: e.id,
      user: e.fullName || e.email,
      courseTitle: e.courseTitle,
      time: e.enrollmentDate || (e.createdAt ? (e.createdAt.seconds ? new Date(e.createdAt.seconds * 1000).toISOString() : e.createdAt) : null)
    }));

    const recentContacts = (contacts || []).slice(0, 10).map(c => ({
      type: 'contact',
      id: c.id,
      user: c.name || c.email,
      subject: c.subject || c.message || 'Contact form',
      time: c.createdAt ? (c.createdAt.seconds ? new Date(c.createdAt.seconds * 1000).toISOString() : c.createdAt) : null
    }));

    // recent courses by createdAt descending
    const recentCourses = (courses || [])
      .map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt }))
      .filter(c => c.createdAt)
      .sort((a, b) => {
        const ta = a.createdAt.seconds ? a.createdAt.seconds : new Date(a.createdAt).getTime()/1000;
        const tb = b.createdAt.seconds ? b.createdAt.seconds : new Date(b.createdAt).getTime()/1000;
        return tb - ta;
      })
      .slice(0, 10)
      .map(c => ({ type: 'course', id: c.id, title: c.title, time: c.createdAt ? (c.createdAt.seconds ? new Date(c.createdAt.seconds * 1000).toISOString() : c.createdAt) : null }));

    res.json({ success: true, data: { recentEnrollments, recentContacts, recentCourses } });
  } catch (error) {
    console.error('Admin recent activities error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching recent activities' });
  }
});

module.exports = router;
