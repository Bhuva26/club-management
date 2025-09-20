const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Event = require('../models/Event');
const Club = require('../models/Club');
const User = require('../models/User');
const { auth, teacherAuth, eventAccessAuth } = require('../middleware/auth');
const { createNotFoundError, createValidationError, createForbiddenError, createConflictError } = require('../middleware/errorHandler');

const router = express.Router();

// @route   GET /api/events
// @desc    Get all events with filtering and pagination
// @access  Public
router.get('/', [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('club')
    .optional()
    .isMongoId()
    .withMessage('Club must be a valid MongoDB ID'),
  
  query('status')
    .optional()
    .isIn(['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('eventType')
    .optional()
    .isIn(['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports', 'conference', 'hackathon', 'exhibition', 'performance', 'networking', 'training', 'ceremony', 'fundraiser'])
    .withMessage('Invalid event type'),
  
  query('upcoming')
    .optional()
    .isBoolean()
    .withMessage('Upcoming must be true or false'),
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
      club,
      status,
      eventType,
      upcoming,
      search,
      sortBy = 'eventDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    const query = { isPublic: true };

    if (club) {
      query.club = club;
    }

    if (status) {
      query.status = status;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (upcoming === 'true') {
      query.eventDate = { $gte: new Date() };
      query.status = { $in: ['published', 'upcoming'] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get events with pagination
    const events = await Event.find(query)
      .populate('club', 'name slug category')
      .populate('organizer', 'name email')
      .populate('registeredParticipants.user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalEvents = await Event.countDocuments(query);
    const totalPages = Math.ceil(totalEvents / parseInt(limit));

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalEvents,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/search
// @desc    Search events
// @access  Public
router.get('/search', [
  query('q')
    .notEmpty()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters'),
  
  query('club')
    .optional()
    .isMongoId()
    .withMessage('Club must be a valid MongoDB ID'),
  
  query('eventType')
    .optional()
    .isIn(['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports', 'conference', 'hackathon', 'exhibition', 'performance', 'networking', 'training', 'ceremony', 'fundraiser'])
    .withMessage('Invalid event type'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Limit must be between 1 and 30'),
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

    const { q: searchTerm, club, eventType, dateRange, limit = 20 } = req.query;

    const options = {
      club,
      eventType,
      limit: parseInt(limit)
    };

    if (dateRange) {
      try {
        const dates = JSON.parse(dateRange);
        options.dateRange = dates;
      } catch (err) {
        // Invalid JSON, ignore dateRange
      }
    }

    const events = await Event.searchEvents(searchTerm, options);

    res.json({
      success: true,
      data: {
        events,
        searchTerm,
        count: events.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/upcoming
// @desc    Get upcoming events
// @access  Public
router.get('/upcoming', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
  
  query('club')
    .optional()
    .isMongoId()
    .withMessage('Club must be a valid MongoDB ID'),
], async (req, res, next) => {
  try {
    const { limit = 10, club, eventType, category } = req.query;

    const options = {};
    if (club) options.club = club;
    if (eventType) options.eventType = eventType;
    if (category) options.category = category;

    const events = await Event.findUpcoming(parseInt(limit), options);

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

// @route   GET /api/events/popular
// @desc    Get popular events
// @access  Public
router.get('/popular', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20'),
], async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const events = await Event.getPopularEvents(parseInt(limit));

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

// @route   GET /api/events/stats
// @desc    Get event statistics
// @access  Private (Admin/Teacher)
router.get('/stats', auth, teacherAuth, async (req, res, next) => {
  try {
    const stats = await Event.getEventStats();

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/:id
// @desc    Get single event by ID
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id)
      .populate('club', 'name slug category description coordinator')
      .populate('organizer', 'name email department')
      .populate('coOrganizers.user', 'name email')
      .populate('registeredParticipants.user', 'name email department')
      .populate('attendedParticipants.user', 'name email')
      .populate('attendedParticipants.markedBy', 'name');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Increment view count
    await Event.findByIdAndUpdate(id, { $inc: { 'statistics.views': 1 } });

    res.json({
      success: true,
      data: {
        event
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events
// @desc    Create new event
// @access  Private (Teachers and Admins only)
router.post('/', auth, teacherAuth, [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('club')
    .isMongoId()
    .withMessage('Club must be a valid MongoDB ID'),
  
  body('eventDate')
    .isISO8601()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    })
    .withMessage('Event date must be a valid future date'),
  
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (req.body.startTime) {
        const start = req.body.startTime.split(':').map(Number);
        const end = value.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        if (endMinutes <= startMinutes) {
          throw new Error('End time must be after start time');
        }
      }
      return true;
    }),
  
  body('venue.name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Venue name must be between 2 and 200 characters'),
  
  body('eventType')
    .isIn(['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports', 'conference', 'hackathon', 'exhibition', 'performance', 'networking', 'training', 'ceremony', 'fundraiser'])
    .withMessage('Invalid event type'),
  
  body('registrationDeadline')
    .isISO8601()
    .custom((value, { req }) => {
      if (new Date(value) >= new Date(req.body.eventDate)) {
        throw new Error('Registration deadline must be before event date');
      }
      return true;
    })
    .withMessage('Registration deadline must be a valid date before event date'),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum participants must be a non-negative integer'),
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
      title,
      description,
      club,
      eventDate,
      startTime,
      endTime,
      venue,
      eventType,
      registrationDeadline,
      maxParticipants,
      requirements,
      prizes,
      tags,
      agenda,
      speakers
    } = req.body;

    // Verify club exists and user has permissions
    const clubDoc = await Club.findById(club);
    if (!clubDoc) {
      throw createNotFoundError('Club');
    }

    // Check if user is club coordinator, co-coordinator, or admin
    const isCoordinator = clubDoc.coordinator.toString() === req.user._id.toString();
    const isCoCoordinator = clubDoc.coCoordinators.some(
      coCoord => coCoord.user.toString() === req.user._id.toString()
    );
    const isAdmin = req.user.role === 'admin';

    if (!isCoordinator && !isCoCoordinator && !isAdmin) {
      throw createForbiddenError('Only club coordinators and admins can create events for this club');
    }

    // Create event data
    const eventData = {
      title,
      description,
      club,
      organizer: req.user._id,
      eventDate: new Date(eventDate),
      startTime,
      endTime,
      venue,
      eventType,
      registrationDeadline: new Date(registrationDeadline),
      status: 'published' // Auto-publish for now
    };

    // Add optional fields
    if (maxParticipants !== undefined) eventData.maxParticipants = maxParticipants;
    if (requirements) eventData.requirements = requirements;
    if (prizes) eventData.prizes = prizes;
    if (tags) eventData.tags = tags;
    if (agenda) eventData.agenda = agenda;
    if (speakers) eventData.speakers = speakers;

    // Set category from club if not provided
    if (clubDoc.category) {
      eventData.category = clubDoc.category;
    }

    const event = new Event(eventData);
    await event.save();

    // Add event to club's events array
    clubDoc.events.push(event._id);
    await clubDoc.save();

    // Populate event data for response
    await event.populate([
      { path: 'club', select: 'name slug category' },
      { path: 'organizer', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/events/:id
// @desc    Update event
// @access  Private (Event organizer or Admin)
router.put('/:id', auth, eventAccessAuth, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('eventDate')
    .optional()
    .isISO8601()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
  
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  
  body('maxParticipants')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum participants must be a non-negative integer'),
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

    // Check permissions (only organizer or admin can edit)
    if (req.eventRole !== 'organizer' && req.user.role !== 'admin') {
      throw createForbiddenError('Only event organizers and admins can edit event details');
    }

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Don't allow editing if event has started
    if (event.status === 'ongoing' || event.status === 'completed') {
      throw createForbiddenError('Cannot edit event after it has started');
    }

    // Update fields
    const allowedUpdates = [
      'title', 'description', 'eventDate', 'startTime', 'endTime', 'venue', 
      'maxParticipants', 'registrationDeadline', 'requirements', 'prizes', 
      'tags', 'agenda', 'speakers'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key) && req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate([
      { path: 'club', select: 'name slug category' },
      { path: 'organizer', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: {
        event: updatedEvent
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/events/:id
// @desc    Cancel event
// @access  Private (Event organizer or Admin)
router.delete('/:id', auth, eventAccessAuth, [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Cancellation reason must be between 10 and 500 characters'),
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Check permissions
    if (req.eventRole !== 'organizer' && req.user.role !== 'admin') {
      throw createForbiddenError('Only event organizers and admins can cancel events');
    }

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Don't allow canceling completed events
    if (event.status === 'completed') {
      throw createForbiddenError('Cannot cancel completed events');
    }

    // Update event status to cancelled
    event.status = 'cancelled';
    event.cancellation = {
      reason: reason || 'Event cancelled by organizer',
      cancelledAt: new Date(),
      cancelledBy: req.user._id
    };

    await event.save();

    res.json({
      success: true,
      message: 'Event cancelled successfully',
      data: {
        event: {
          id: event._id,
          title: event.title,
          status: event.status,
          cancellation: event.cancellation
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events/:id/register
// @desc    Register for an event
// @access  Private
router.post('/:id/register', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check if event is published and registration is open
    if (event.status !== 'published' && event.status !== 'upcoming') {
      throw createForbiddenError('Event registration is not available');
    }

    // Use event method to register participant
    await event.registerParticipant(req.user._id);

    res.json({
      success: true,
      message: 'Successfully registered for the event'
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events/:id/unregister
// @desc    Unregister from an event
// @access  Private
router.post('/:id/unregister', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Use event method to unregister participant
    await event.unregisterParticipant(req.user._id);

    res.json({
      success: true,
      message: 'Successfully unregistered from the event'
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/:id/participants
// @desc    Get event participants
// @access  Private (Event organizer, club coordinator, or Admin)
router.get('/:id/participants', auth, eventAccessAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'all' } = req.query;

    // Check permissions
    if (req.eventRole === 'participant' && req.user.role === 'student') {
      throw createForbiddenError('Only organizers and coordinators can view participant lists');
    }

    const event = await Event.findById(id)
      .populate('registeredParticipants.user', 'name email department studentId profilePicture')
      .populate('attendedParticipants.user', 'name email department')
      .populate('waitlist.user', 'name email department');

    if (!event) {
      throw createNotFoundError('Event');
    }

    let participants = event.registeredParticipants;

    // Filter by status
    if (status !== 'all') {
      participants = participants.filter(p => p.status === status);
    }

    res.json({
      success: true,
      data: {
        eventTitle: event.title,
        registered: participants,
        attended: event.attendedParticipants,
        waitlist: event.waitlist,
        statistics: {
          totalRegistered: event.registeredParticipants.length,
          totalAttended: event.attendedParticipants.length,
          waitlistCount: event.waitlist.length,
          availableSpots: event.availableSpots
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events/:id/mark-attendance
// @desc    Mark attendance for event participants
// @access  Private (Teachers only)
router.post('/:id/mark-attendance', auth, teacherAuth, [
  body('participants')
    .isArray({ min: 0 })
    .withMessage('Participants must be an array'),
  
  body('participants.*')
    .isMongoId()
    .withMessage('Each participant must be a valid MongoDB ID'),
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
    const { participants } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Use event method to mark attendance
    await event.markAttendance(participants, req.user._id);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendedCount: event.attendedParticipants.length,
        totalRegistered: event.registeredParticipants.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events/:id/feedback
// @desc    Add feedback for an event
// @access  Private
router.post('/:id/feedback', auth, [
  body('rating.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  
  body('feedback.whatWorkedWell')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Feedback must be between 10 and 2000 characters'),
  
  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous must be true or false'),
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
    const feedbackData = req.body;

    const event = await Event.findById(id);
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Use event method to add feedback
    await event.addFeedback(req.user._id, feedbackData);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/:id/feedback
// @desc    Get event feedback
// @access  Private (Event organizer, club coordinator, or Admin)
router.get('/:id/feedback', auth, eventAccessAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.eventRole === 'participant' && req.user.role === 'student') {
      throw createForbiddenError('Only organizers and coordinators can view feedback');
    }

    const Feedback = require('../models/Feedback');
    
    const feedback = await Feedback.find({ event: id })
      .populate('event', 'title')
      .populate('club', 'name')
      .populate('submittedBy', 'name email', null, { match: { anonymous: false } })
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalFeedback = feedback.length;
    let totalRating = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    feedback.forEach(fb => {
      totalRating += fb.rating.overall;
      ratingDistribution[fb.rating.overall]++;
    });

    const averageRating = totalFeedback > 0 ? (totalRating / totalFeedback).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        feedback,
        statistics: {
          totalFeedback,
          averageRating: parseFloat(averageRating),
          ratingDistribution
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/events/:id/status
// @desc    Update event status
// @access  Private (Event organizer or Admin)
router.put('/:id/status', auth, eventAccessAuth, [
  body('status')
    .isIn(['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
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
    const { status } = req.body;

    // Check permissions
    if (req.eventRole !== 'organizer' && req.user.role !== 'admin') {
      throw createForbiddenError('Only event organizers and admins can change event status');
    }

    const event = await Event.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!event) {
      throw createNotFoundError('Event');
    }

    res.json({
      success: true,
      message: 'Event status updated successfully',
      data: {
        eventId: event._id,
        title: event.title,
        status: event.status
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/events/:id/analytics
// @desc    Get event analytics
// @access  Private (Event organizer, club coordinator, or Admin)
router.get('/:id/analytics', auth, eventAccessAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check permissions
    if (req.eventRole === 'participant' && req.user.role === 'student') {
      throw createForbiddenError('Only organizers and coordinators can view analytics');
    }

    const event = await Event.findById(id)
      .populate('club', 'name category');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Registration analytics
    const registrationData = event.registeredParticipants.map(participant => ({
      date: participant.registrationDate.toISOString().split('T')[0],
      status: participant.status
    }));

    // Group registrations by date
    const dailyRegistrations = registrationData.reduce((acc, reg) => {
      acc[reg.date] = (acc[reg.date] || 0) + 1;
      return acc;
    }, {});

    // Attendance analytics
    const attendanceRate = event.statistics.attendanceRate;
    const noShowRate = 100 - attendanceRate;

    // Feedback analytics
    const Feedback = require('../models/Feedback');
    const feedbackSummary = await Feedback.aggregate([
      { $match: { event: event._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating.overall' },
          totalFeedback: { $sum: 1 },
          sentimentCounts: {
            $push: '$sentiment.classification'
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          eventDate: event.eventDate,
          status: event.status,
          club: event.club
        },
        registration: {
          total: event.statistics.totalRegistrations,
          dailyRegistrations,
          availableSpots: event.availableSpots,
          waitlistCount: event.waitlist.length
        },
        attendance: {
          total: event.statistics.totalAttendance,
          rate: attendanceRate,
          noShowRate
        },
        feedback: feedbackSummary[0] || {
          averageRating: 0,
          totalFeedback: 0,
          sentimentCounts: []
        },
        engagement: {
          views: event.statistics.views,
          shareCount: 0, // Placeholder for future social sharing features
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/events/:id/duplicate
// @desc    Duplicate an event
// @access  Private (Event organizer or Admin)
router.post('/:id/duplicate', auth, eventAccessAuth, [
  body('eventDate')
    .isISO8601()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    })
    .withMessage('Event date must be a valid future date'),
  
  body('registrationDeadline')
    .isISO8601()
    .custom((value, { req }) => {
      if (new Date(value) >= new Date(req.body.eventDate)) {
        throw new Error('Registration deadline must be before event date');
      }
      return true;
    })
    .withMessage('Registration deadline must be before event date'),
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
    const { eventDate, registrationDeadline, title } = req.body;

    // Check permissions
    if (req.eventRole !== 'organizer' && req.user.role !== 'admin') {
      throw createForbiddenError('Only event organizers and admins can duplicate events');
    }

    const originalEvent = await Event.findById(id);
    if (!originalEvent) {
      throw createNotFoundError('Event');
    }

    // Create duplicate event data
    const duplicateData = originalEvent.toObject();
    delete duplicateData._id;
    delete duplicateData.slug;
    delete duplicateData.registeredParticipants;
    delete duplicateData.attendedParticipants;
    delete duplicateData.waitlist;
    delete duplicateData.feedback;
    delete duplicateData.statistics;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    // Update with new data
    duplicateData.title = title || `${originalEvent.title} (Copy)`;
    duplicateData.eventDate = new Date(eventDate);
    duplicateData.registrationDeadline = new Date(registrationDeadline);
    duplicateData.status = 'draft';

    const duplicateEvent = new Event(duplicateData);
    await duplicateEvent.save();

    await duplicateEvent.populate([
      { path: 'club', select: 'name slug category' },
      { path: 'organizer', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Event duplicated successfully',
      data: {
        event: duplicateEvent,
        originalEventId: id
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;