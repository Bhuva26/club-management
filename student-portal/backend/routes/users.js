const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth, teacherAuth, ownerOrElevatedAuth } = require('../middleware/auth');
const { createNotFoundError, createValidationError, createForbiddenError } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin/Teacher)
router.get('/', auth, teacherAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Role must be student, teacher, or admin'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Search term cannot be empty'),
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive = 'true'
    } = req.query;

    // Build query
    const query = {};
    
    if (role) {
      query.role = role;
    }

    if (isActive !== 'all') {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .populate('joinedClubs.club', 'name slug category')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', auth, [
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('role')
    .optional()
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Role must be student, teacher, or admin'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { q: searchTerm, role, limit = 20 } = req.query;

    const users = await User.searchUsers(searchTerm, {
      role,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        users,
        searchTerm,
        count: users.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/role/:role
// @desc    Get users by role
// @access  Private (Admin/Teacher)
router.get('/role/:role', auth, teacherAuth, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
], async (req, res, next) => {
  try {
    const { role } = req.params;
    const { limit = 50 } = req.query;

    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw createValidationError('Invalid role specified', 'role');
    }

    const users = await User.findByRole(role).limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        role,
        count: users.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/teachers
// @desc    Get all teachers (for club coordinator assignment)
// @access  Private
router.get('/teachers', auth, async (req, res, next) => {
  try {
    const teachers = await User.find({ 
      role: { $in: ['teacher', 'admin'] },
      isActive: true
    }).select('name email department role');

    res.json({
      success: true,
      data: {
        teachers,
        count: teachers.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Private (Admin)
router.get('/stats', auth, adminAuth, async (req, res, next) => {
  try {
    const stats = await User.getUserStats();

    // Additional statistics
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt');

    const topActiveUsers = await User.find({ isActive: true })
      .sort({ 'joinedClubs': -1, 'eventsRegistered': -1 })
      .limit(10)
      .select('name email role joinedClubs eventsRegistered');

    res.json({
      success: true,
      data: {
        ...stats,
        recentUsers,
        topActiveUsers
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user can access this profile
    if (req.user.role === 'student' && req.user._id.toString() !== id) {
      throw createForbiddenError('You can only access your own profile');
    }

    const user = await User.findById(id)
      .select('-password')
      .populate({
        path: 'joinedClubs.club',
        select: 'name slug category description images.logo'
      })
      .populate({
        path: 'eventsRegistered.event',
        select: 'title slug eventDate venue status eventType'
      });

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          studentId: user.studentId,
          bio: user.bio,
          phoneNumber: user.phoneNumber,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          joinedClubs: user.joinedClubs,
          eventsRegistered: user.eventsRegistered,
          stats: user.stats,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID
// @access  Private (Own profile or Admin)
router.put('/:id', auth, ownerOrElevatedAuth('id'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  
  body('studentId')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Student ID cannot exceed 20 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('phoneNumber')
    .optional()
    .matches(/^[+]?[\d\s\-\(\)]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const allowedUpdates = ['name', 'department', 'studentId', 'bio', 'phoneNumber'];
    
    // Only admin can update certain fields
    const adminOnlyUpdates = ['role', 'isActive', 'isEmailVerified'];
    
    const updates = {};

    // Process regular updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    // Process admin-only updates
    if (req.user.role === 'admin') {
      Object.keys(req.body).forEach(key => {
        if (adminOnlyUpdates.includes(key) && req.body[key] !== undefined) {
          updates[key] = req.body[key];
        }
      });
    }

    // Check if student ID is being updated and is unique
    if (updates.studentId) {
      const existingUser = await User.findOne({ 
        studentId: updates.studentId, 
        _id: { $ne: id },
        role: 'student'
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Student ID already exists'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate user (soft delete)
// @access  Private (Admin only)
router.delete('/:id', auth, adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: false,
        // You might also want to clear some data
        lockUntil: undefined,
        loginAttempts: 0
      },
      { new: true }
    ).select('-password');

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/activate
// @desc    Reactivate user
// @access  Private (Admin only)
router.put('/:id/activate', auth, adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { 
        isActive: true,
        lockUntil: undefined,
        loginAttempts: 0
      },
      { new: true }
    ).select('-password');

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin only)
router.put('/:id/role', auth, adminAuth, [
  body('role')
    .isIn(['student', 'teacher', 'admin'])
    .withMessage('Role must be student, teacher, or admin'),
], async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    // Prevent admin from changing their own role
    if (req.user._id.toString() === id && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id/clubs
// @desc    Get user's joined clubs
// @access  Private
router.get('/:id/clubs', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user can access this data
    if (req.user.role === 'student' && req.user._id.toString() !== id) {
      throw createForbiddenError('You can only access your own club data');
    }

    const user = await User.findById(id)
      .select('joinedClubs')
      .populate({
        path: 'joinedClubs.club',
        select: 'name slug category description images.logo isActive',
        match: { isActive: true }
      });

    if (!user) {
      throw createNotFoundError('User');
    }

    // Filter active club memberships
    const activeClubs = user.joinedClubs.filter(
      membership => membership.isActive && membership.club
    );

    res.json({
      success: true,
      data: {
        clubs: activeClubs,
        count: activeClubs.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id/events
// @desc    Get user's registered events
// @access  Private
router.get('/:id/events', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'all', upcoming = 'false' } = req.query;

    // Check if user can access this data
    if (req.user.role === 'student' && req.user._id.toString() !== id) {
      throw createForbiddenError('You can only access your own event data');
    }

    const user = await User.findById(id)
      .select('eventsRegistered')
      .populate({
        path: 'eventsRegistered.event',
        select: 'title slug eventDate venue status eventType club',
        populate: {
          path: 'club',
          select: 'name slug'
        }
      });

    if (!user) {
      throw createNotFoundError('User');
    }

    let events = user.eventsRegistered.filter(reg => reg.event); // Filter out null events

    // Filter by status
    if (status !== 'all') {
      events = events.filter(reg => reg.status === status);
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      const now = new Date();
      events = events.filter(reg => 
        reg.event && new Date(reg.event.eventDate) >= now
      );
    }

    res.json({
      success: true,
      data: {
        events,
        count: events.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/:id/upload-avatar
// @desc    Upload user avatar
// @access  Private (Own profile or Admin)
router.post('/:id/upload-avatar', auth, ownerOrElevatedAuth('id'), async (req, res, next) => {
  try {
    // This would typically handle file upload using multer
    // For now, we'll just update the profilePicture URL
    const { id } = req.params;
    const { profilePicture } = req.body;

    if (!profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture URL is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { profilePicture },
      { new: true }
    ).select('-password');

    if (!user) {
      throw createNotFoundError('User');
    }

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id/activity
// @desc    Get user activity log
// @access  Private (Own profile or Admin/Teacher)
router.get('/:id/activity', auth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Check permissions
    if (req.user.role === 'student' && req.user._id.toString() !== id) {
      throw createForbiddenError('You can only access your own activity');
    }

    // This would typically fetch from an ActivityLog model
    // For now, we'll return basic user activity data
    const user = await User.findById(id)
      .select('lastLoginAt createdAt eventsRegistered joinedClubs')
      .populate('eventsRegistered.event', 'title eventDate')
      .populate('joinedClubs.club', 'name');

    if (!user) {
      throw createNotFoundError('User');
    }

    // Create activity timeline from available data
    const activities = [];

    // Add registration activities
    user.eventsRegistered.forEach(reg => {
      if (reg.event) {
        activities.push({
          type: 'event_registration',
          description: `Registered for event: ${reg.event.title}`,
          timestamp: reg.registrationDate,
          data: {
            eventId: reg.event._id,
            eventTitle: reg.event.title
          }
        });
      }
    });

    // Add club join activities
    user.joinedClubs.forEach(membership => {
      if (membership.club) {
        activities.push({
          type: 'club_joined',
          description: `Joined club: ${membership.club.name}`,
          timestamp: membership.joinedAt,
          data: {
            clubId: membership.club._id,
            clubName: membership.club.name,
            role: membership.role
          }
        });
      }
    });

    // Sort by timestamp (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginate
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: paginatedActivities,
        pagination: {
          currentPage: parseInt(page),
          totalActivities: activities.length,
          hasMore: skip + parseInt(limit) < activities.length
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;