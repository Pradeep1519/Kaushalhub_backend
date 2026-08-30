const express = require('express');
const router = express.Router();
const Trainer = require('../models/Trainer');

router.get('/public', async (req, res) => {
  try {
    const trainers = await Trainer.find({ isActive: true });
    res.json({
      success: true,
      count: trainers.length,
      trainers: trainers.map((trainer) => ({
        ...trainer,
        id: trainer.id || trainer.slug
      }))
    });
  } catch (error) {
    console.error('Get public trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching public trainers'
    });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const trainer = await Trainer.findBySlug(req.params.slug);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    res.json({
      success: true,
      trainer
    });
  } catch (error) {
    console.error('Get public trainer details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching trainer details'
    });
  }
});

module.exports = router;
