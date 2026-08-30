// ✅ API ROUTES: Contact form endpoints
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// ✅ POST API: Contact form submission
router.post('/submit', async (req, res) => {
  try {
    console.log('📥 Received contact form submission:', req.body);
    
    // ✅ VALIDATION: Check required fields
    const { name, phone, email, message, inquiryType } = req.body;
    
    if (!name || !phone || !email || !message || !inquiryType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, phone, email, message, inquiryType'
      });
    }

    // ✅ DATABASE OPERATION: Save to MongoDB
    const newContact = new Contact({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      course: req.body.course || '',
      message: message.trim(),
      currentCompany: req.body.currentCompany || '',
      experience: req.body.experience || '',
      currentSalary: req.body.currentSalary || '',
      expectedSalary: req.body.expectedSalary || '',
      technicalIssue: req.body.technicalIssue || '',
      placementSupport: req.body.placementSupport || '',
      inquiryType: inquiryType
    });

    const savedContact = await newContact.save();

    console.log('✅ Contact form saved to database with ID:', savedContact._id);
    
    // ✅ SUCCESS RESPONSE
    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully',
      data: {
        id: savedContact._id,
        name: savedContact.name,
        email: savedContact.email,
        inquiryType: savedContact.inquiryType,
        submittedAt: savedContact.submittedAt
      }
    });

  } catch (error) {
    console.error('❌ Error saving contact form:', error);
    
    // ✅ ERROR RESPONSE
    let errorMessage = 'Internal server error';
    
    if (error.name === 'ValidationError') {
      errorMessage = Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.code === 11000) {
      errorMessage = 'Duplicate entry found';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET API: Fetch all contact submissions (Admin use ke liye)
router.get('/submissions', async (req, res) => {
  try {
    const submissions = await Contact.find().sort({ submittedAt: -1 });
    
    res.json({
      success: true,
      count: submissions.length,
      data: submissions
    });
  } catch (error) {
    console.error('❌ Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching submissions'
    });
  }
});

// ✅ GET API: Fetch single contact by ID
router.get('/submissions/:id', async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
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
      message: 'Error fetching contact'
    });
  }
});

module.exports = router;