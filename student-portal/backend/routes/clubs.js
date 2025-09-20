const express = require('express');
const { body, validationResult } = require('express-validator');
const Club = require('../models/Club');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all clubs
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const clubs = await Club.find(query)
      .populate('coordinator', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });

    res.json(clubs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single club
router.get('/:id', async (req, res) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate('coordinator', 'name email department')
      .populate('members.user', 'name email department');

    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    res.json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create club (Admin only)
router.post('/', [auth, adminAuth], [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').isIn(['technical', 'cultural', 'sports', 'academic', 'social']).withMessage('Invalid category'),
  body('contactEmail').isEmail().withMessage('Please enter a valid email'),
  body('coordinator').isMongoId().withMessage('Invalid coordinator ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, coordinator, contactEmail, contactPhone, meetingSchedule } = req.body;

    // Check if coordinator exists and is a teacher
    const coordinatorUser = await User.findById(coordinator);
    if (!coordinatorUser || (coordinatorUser.role !== 'teacher' && coordinatorUser.role !== 'admin')) {
      return res.status(400).json({ message: 'Coordinator must be a teacher or admin' });
    }

    const club = new Club({
      name,
      description,
      category,
      coordinator,
      contactEmail,
      contactPhone,
      meetingSchedule,
      members: [{
        user: coordinator,
        role: 'coordinator'
      }]
    });

    await club.save();
    await club.populate('coordinator', 'name email');

    res.status(201).json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join club
router.post('/:id/join', auth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Check if already a member
    const existingMember = club.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    if (existingMember) {
      return res.status(400).json({ message: 'Already a member of this club' });
    }

    // Add user to club members
    club.members.push({
      user: req.user._id,
      role: 'member'
    });

    await club.save();

    // Add club to user's joined clubs
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { joinedClubs: club._id }
    });

    res.json({ message: 'Successfully joined the club' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave club
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ message: 'Club not found' });
    }

    // Remove user from club members
    club.members = club.members.filter(
      member => member.user.toString() !== req.user._id.toString()
    );

    await club.save();

    // Remove club from user's joined clubs
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { joinedClubs: club._id }
    });

    res.json({ message: 'Successfully left the club' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;