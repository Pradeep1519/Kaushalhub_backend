const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Resend } = require('resend');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d',
  });
};

// Email sending function
const sendResetEmail = async (email, resetToken, userName) => {
  try {
    console.log('📧 Sending reset email to:', email);
    
    const resend = new Resend(process.env.RESEND_API_KEY);
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: 'KaushalHub <support@kaushalhub.com>',
      to: email,
      subject: `Reset Your Password, ${userName}! - KaushalHub`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello ${userName}! 👋</h2>
          <p>You requested a password reset for your KaushalHub account.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return false;
    }

    console.log('✅ Email sent:', data.id);
    return true;
  } catch (error) {
    console.error('❌ Email error:', error);
    return false;
  }
};

// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        enrolledCourses: user.enrolledCourses
      },
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log('🚀 Login attempt:', email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Password compare
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await User.findByIdAndUpdate(user.id, { lastLogin: new Date().toISOString() });

    console.log('✅ Login successful:', email);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        enrolledCourses: user.enrolledCourses || [],
        lastLogin: user.lastLogin
      },
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
});

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    console.log('🔐 Forgot password request:', email);

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.json({
        success: true,
        message: 'If your email exists, you will receive a reset link shortly'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString();

    await User.findByIdAndUpdate(user.id, {
      resetToken,
      resetTokenExpiry
    });

    console.log('✅ Reset token generated for:', user.name);

    const emailSent = await sendResetEmail(email, resetToken, user.name);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    } else {
      // Reset token clear karo agar email fail
      await User.findByIdAndUpdate(user.id, {
        resetToken: null,
        resetTokenExpiry: null
      });
      
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again.'
      });
    }

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// @route   POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    console.log('🔄 Reset password attempt');

    // Firebase me token-based query ke liye saare users fetch karo
    const usersSnapshot = await User.collection
      .where('resetToken', '==', token)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    // Check expiry
    if (new Date(user.resetTokenExpiry) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Reset token has expired'
      });
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    await User.findByIdAndUpdate(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    console.log('✅ Password reset successful:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password reset',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;