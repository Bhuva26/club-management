const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const Club = require('../models/Club');
const { auth, teacherAuth } = require('../middleware/auth');
const { createNotFoundError, createValidationError, createForbiddenError, createConflictError } = require('../middleware/errorHandler');

const router = express.Router();

// @route   POST /api/feedback
// @desc    Submit feedback for an event
// @access  Private
router.post('/', auth, [
  body('event')
    .isMongoId()
    .withMessage('Event must be a valid MongoDB ID'),
  
  body('rating.overall')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  
  body('rating.organization')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Organization rating must be between 1 and 5'),
  
  body('rating.content')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Content rating must be between 1 and 5'),
  
  body('rating.venue')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Venue rating must be between 1 and 5'),
  
  body('rating.speakers')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Speakers rating must be between 1 and 5'),
  
  body('feedback.whatWorkedWell')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Feedback must be between 10 and 2000 characters'),
  
  body('feedback.improvements')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Improvement suggestions cannot exceed 2000 characters'),
  
  body('feedback.additionalComments')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Additional comments cannot exceed 1000 characters'),
  
  body('anonymous')
    .optional()
    .isBoolean()
    .withMessage('Anonymous must be true or false'),
  
  body('suggestions.recommendToOthers')
    .optional()
    .isBoolean()
    .withMessage('Recommend to others must be true or false'),
  
  body('suggestions.likelyToAttendFuture')
    .optional()
    .isIn(['definitely', 'probably', 'maybe', 'probably-not', 'definitely-not'])
    .withMessage('Invalid value for likely to attend future events'),
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

    const { event: eventId, rating, feedback, suggestions, anonymous = true } = req.body;

    // Check if event exists
    const event = await Event.findById(eventId).populate('club');
    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check if event is completed
    if (event.status !== 'completed') {
      throw createValidationError('Feedback can only be submitted for completed events');
    }

    // Check if user attended the event
    const attended = event.attendedParticipants.some(
      participant => participant.user.toString() === req.user._id.toString()
    );

    if (!attended) {
      throw createForbiddenError('You can only provide feedback for events you attended');
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      event: eventId,
      submittedBy: req.user._id
    });

    if (existingFeedback) {
      throw createConflictError('You have already submitted feedback for this event');
    }

    // Create feedback
    const feedbackData = {
      event: eventId,
      club: event.club._id,
      rating,
      feedback,
      suggestions,
      anonymous,
      submittedBy: anonymous ? null : req.user._id,
      metadata: {
        submissionMethod: 'web',
        deviceType: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'desktop',
        browserInfo: req.get('User-Agent'),
        ipAddress: req.ip
      }
    };

    const newFeedback = new Feedback(feedbackData);
    await newFeedback.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: newFeedback._id,
        submittedAt: newFeedback.createdAt,
        anonymous: newFeedback.anonymous
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feedback/event/:eventId
// @desc    Get feedback for an event
// @access  Private (Teachers and Admins only)
router.get('/event/:eventId', auth, teacherAuth, [
  query('includeAnonymous')
    .optional()
    .isBoolean()
    .withMessage('Include anonymous must be true or false'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'rating', 'helpful'])
    .withMessage('Sort by must be createdAt, rating, or helpful'),
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

    const { eventId } = req.params;
    const {
      includeAnonymous = true,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Verify event exists and user has permission
    const event = await Event.findById(eventId)
      .populate('club', 'name coordinator')
      .populate('organizer', 'name email');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check permissions
    const isOrganizer = event.organizer._id.toString() === req.user._id.toString();
    const isCoordinator = event.club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isCoordinator && !isAdmin) {
      throw createForbiddenError('Only event organizers, club coordinators, and admins can view feedback');
    }

    // Build query
    const query = { event: eventId };
    if (!includeAnonymous) {
      query.anonymous = false;
    }

    // Build sort object
    const sort = {};
    if (sortBy === 'helpful') {
      sort['helpful.count'] = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'rating') {
      sort['rating.overall'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get feedback with pagination
    const feedback = await Feedback.find(query)
      .populate('event', 'title eventDate')
      .populate('club', 'name')
      .populate('submittedBy', 'name email', null, { match: { anonymous: false } })
      .populate('response.respondedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalFeedback = await Feedback.countDocuments(query);
    const totalPages = Math.ceil(totalFeedback / parseInt(limit));

    // Calculate statistics
    const stats = await Feedback.getClubFeedbackSummary(event.club._id);

    res.json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          eventDate: event.eventDate,
          club: event.club,
          organizer: event.organizer
        },
        feedback,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFeedback,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: stats
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feedback/club/:clubId
// @desc    Get feedback summary for a club
// @access  Private (Club coordinator and Admins only)
router.get('/club/:clubId', auth, [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
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

    const { clubId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    // Verify club exists and check permissions
    const club = await Club.findById(clubId);
    if (!club) {
      throw createNotFoundError('Club');
    }

    const isCoordinator = club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';

    if (!isCoordinator && !isAdmin && !isTeacher) {
      throw createForbiddenError('Only club coordinators, teachers, and admins can view feedback');
    }

    // Build date range filter
    const dateRange = {};
    if (startDate) dateRange.from = startDate;
    if (endDate) dateRange.to = endDate;

    // Get feedback summary
    const summary = await Feedback.getClubFeedbackSummary(clubId, {
      dateRange: Object.keys(dateRange).length ? dateRange : undefined,
      limit: parseInt(limit)
    });

    // Get recent feedback
    const recentFeedback = await Feedback.find({
      club: clubId,
      ...(startDate && { createdAt: { $gte: new Date(startDate) } }),
      ...(endDate && { createdAt: { $lte: new Date(endDate) } })
    })
      .populate('event', 'title eventDate eventType')
      .populate('submittedBy', 'name email', null, { match: { anonymous: false } })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Get trending topics
    const trendingTopics = await Feedback.getTrendingTopics({
      limit: 10,
      timeframe: 30
    });

    // Get feedback analytics over time
    const analytics = await Feedback.getAnalytics({
      timeframe: 90,
      groupBy: 'week'
    });

    res.json({
      success: true,
      data: {
        club: {
          id: club._id,
          name: club.name,
          category: club.category
        },
        summary,
        recentFeedback,
        trendingTopics,
        analytics,
        filters: {
          startDate,
          endDate,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/feedback/:id/helpful
// @desc    Mark feedback as helpful
// @access  Private
router.put('/:id/helpful', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw createNotFoundError('Feedback');
    }

    // Check if already marked as helpful by this user
    const alreadyHelpful = feedback.helpful.users.includes(req.user._id);

    if (alreadyHelpful) {
      // Remove from helpful
      await feedback.unmarkAsHelpful(req.user._id);
    } else {
      // Add to helpful
      await feedback.markAsHelpful(req.user._id);
    }

    res.json({
      success: true,
      message: alreadyHelpful ? 'Removed from helpful' : 'Marked as helpful',
      data: {
        feedbackId: feedback._id,
        helpfulCount: feedback.helpful.count,
        userMarkedHelpful: !alreadyHelpful
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   POST /api/feedback/:id/respond
// @desc    Respond to feedback
// @access  Private (Teachers and Admins only)
router.post('/:id/respond', auth, teacherAuth, [
  body('response')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Response must be between 10 and 1000 characters'),
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
    const { response } = req.body;

    const feedback = await Feedback.findById(id)
      .populate('event', 'title organizer club')
      .populate('club', 'coordinator');

    if (!feedback) {
      throw createNotFoundError('Feedback');
    }

    // Check permissions - only organizer, coordinator, or admin can respond
    const isOrganizer = feedback.event.organizer.toString() === req.user._id.toString();
    const isCoordinator = feedback.club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isCoordinator && !isAdmin) {
      throw createForbiddenError('Only event organizers, club coordinators, and admins can respond to feedback');
    }

    // Check if already responded
    if (feedback.response && feedback.response.content) {
      throw createConflictError('This feedback has already been responded to');
    }

    // Add response
    await feedback.respond(response, req.user._id);

    res.json({
      success: true,
      message: 'Response added successfully',
      data: {
        feedbackId: feedback._id,
        response: feedback.response,
        respondedBy: req.user.name,
        respondedAt: feedback.response.respondedAt
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/feedback/:id/flag
// @desc    Flag feedback as inappropriate
// @access  Private (Teachers and Admins only)
router.put('/:id/flag', auth, teacherAuth, [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Flag reason must be between 10 and 500 characters'),
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
    const { reason } = req.body;

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw createNotFoundError('Feedback');
    }

    // Flag feedback
    await feedback.flag(req.user._id, reason);

    res.json({
      success: true,
      message: 'Feedback flagged successfully',
      data: {
        feedbackId: feedback._id,
        flaggedBy: req.user.name,
        flaggedAt: feedback.moderationFlags.flaggedAt,
        reason: feedback.moderationFlags.flagReason
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feedback/analytics/sentiment
// @desc    Get sentiment analysis of feedback
// @access  Private (Admins only)
router.get('/analytics/sentiment', auth, [
  query('clubId')
    .optional()
    .isMongoId()
    .withMessage('Club ID must be a valid MongoDB ID'),
  
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Event ID must be a valid MongoDB ID'),
  
  query('timeframe')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Timeframe must be between 1 and 365 days'),
], async (req, res, next) => {
  try {
    // Only admins can access sentiment analytics
    if (req.user.role !== 'admin') {
      throw createForbiddenError('Only admins can access sentiment analytics');
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clubId, eventId, timeframe = 30 } = req.query;

    // Build query
    const matchQuery = {};
    if (clubId) matchQuery.club = mongoose.Types.ObjectId(clubId);
    if (eventId) matchQuery.event = mongoose.Types.ObjectId(eventId);

    // Add timeframe filter
    const fromDate = new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000);
    matchQuery.createdAt = { $gte: fromDate };

    // Get sentiment analytics
    const sentimentAnalysis = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$sentiment.classification',
          count: { $sum: 1 },
          averageScore: { $avg: '$sentiment.score' },
          averageRating: { $avg: '$rating.overall' },
          averageConfidence: { $avg: '$sentiment.confidence' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get sentiment over time
    const sentimentOverTime = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            sentiment: '$sentiment.classification'
          },
          count: { $sum: 1 },
          averageScore: { $avg: '$sentiment.score' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Get most common positive and negative phrases
    const trendingTopics = await Feedback.getTrendingTopics({
      limit: 20,
      timeframe: parseInt(timeframe)
    });

    // Calculate overall metrics
    const totalFeedback = await Feedback.countDocuments(matchQuery);
    const overallStats = await Feedback.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating.overall' },
          averageSentimentScore: { $avg: '$sentiment.score' },
          totalFeedback: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalFeedback,
          averageRating: overallStats[0]?.averageRating || 0,
          averageSentimentScore: overallStats[0]?.averageSentimentScore || 0,
          timeframe: parseInt(timeframe)
        },
        sentimentDistribution: sentimentAnalysis,
        sentimentTrends: sentimentOverTime,
        trendingTopics,
        filters: {
          clubId,
          eventId,
          timeframe: parseInt(timeframe)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feedback/export
// @desc    Export feedback data
// @access  Private (Teachers and Admins only)
router.get('/export', auth, teacherAuth, [
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Event ID must be a valid MongoDB ID'),
  
  query('clubId')
    .optional()
    .isMongoId()
    .withMessage('Club ID must be a valid MongoDB ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
  query('includePersonalData')
    .optional()
    .isBoolean()
    .withMessage('Include personal data must be true or false'),
  
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
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
      eventId,
      clubId,
      startDate,
      endDate,
      includePersonalData = false,
      format = 'json'
    } = req.query;

    // Only admins can include personal data
    const canIncludePersonalData = req.user.role === 'admin' && includePersonalData === 'true';

    // Build filters
    const filters = {};
    if (eventId) filters.eventId = eventId;
    if (clubId) filters.clubId = clubId;
    if (startDate || endDate) {
      filters.dateRange = {};
      if (startDate) filters.dateRange.from = startDate;
      if (endDate) filters.dateRange.to = endDate;
    }

    // Export feedback data
    const feedbackData = await Feedback.exportFeedbackData({
      ...filters,
      includePersonalData: canIncludePersonalData
    });

    if (format === 'csv') {
      // Convert to CSV
      if (feedbackData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No feedback data found for the specified criteria'
        });
      }

      // Prepare CSV data
      const csvData = feedbackData.map(feedback => ({
        'Event Title': feedback.event?.title || 'N/A',
        'Event Date': feedback.event?.eventDate || 'N/A',
        'Club Name': feedback.club?.name || 'N/A',
        'Club Category': feedback.club?.category || 'N/A',
        'Overall Rating': feedback.rating.overall,
        'Organization Rating': feedback.rating.organization || 'N/A',
        'Content Rating': feedback.rating.content || 'N/A',
        'Venue Rating': feedback.rating.venue || 'N/A',
        'Speakers Rating': feedback.rating.speakers || 'N/A',
        'What Worked Well': feedback.feedback.whatWorkedWell,
        'Improvements': feedback.feedback.improvements || '',
        'Additional Comments': feedback.feedback.additionalComments || '',
        'Future Topics': feedback.suggestions.futureTopics?.join(', ') || '',
        'Preferred Format': feedback.suggestions.preferredFormat || 'N/A',
        'Recommend to Others': feedback.suggestions.recommendToOthers !== undefined ? (feedback.suggestions.recommendToOthers ? 'Yes' : 'No') : 'N/A',
        'Sentiment': feedback.sentiment?.classification || 'N/A',
        'Sentiment Score': feedback.sentiment?.score || 'N/A',
        'Anonymous': feedback.anonymous ? 'Yes' : 'No',
        'Submitted Date': feedback.createdAt,
        ...(canIncludePersonalData && feedback.submittedBy && {
          'Submitted By': feedback.submittedBy.name,
          'Submitter Email': feedback.submittedBy.email,
        })
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="feedback-export.csv"');
      res.send(csvContent);
    } else {
      // Return JSON
      res.json({
        success: true,
        data: {
          feedback: feedbackData,
          summary: {
            totalRecords: feedbackData.length,
            includesPersonalData: canIncludePersonalData,
            exportedAt: new Date(),
            exportedBy: {
              id: req.user._id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role
            }
          },
          filters
        }
      });
    }

  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (Admin only)
// @access  Private (Admin only)
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Only admins can delete feedback
    if (req.user.role !== 'admin') {
      throw createForbiddenError('Only admins can delete feedback');
    }

    const feedback = await Feedback.findById(id);
    if (!feedback) {
      throw createNotFoundError('Feedback');
    }

    // Soft delete by archiving
    feedback.status = 'archived';
    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback archived successfully',
      data: {
        feedbackId: feedback._id,
        archivedBy: req.user.name,
        archivedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/feedback/my-feedback
// @desc    Get current user's feedback history
// @access  Private
router.get('/my-feedback', auth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
], async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user's feedback
    const feedback = await Feedback.find({
      submittedBy: req.user._id,
      status: { $ne: 'archived' }
    })
      .populate('event', 'title eventDate venue eventType')
      .populate('club', 'name category')
      .populate('response.respondedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalFeedback = await Feedback.countDocuments({
      submittedBy: req.user._id,
      status: { $ne: 'archived' }
    });

    const totalPages = Math.ceil(totalFeedback / parseInt(limit));

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalFeedback,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        summary: {
          totalSubmitted: totalFeedback,
          averageRating: feedback.length > 0 
            ? (feedback.reduce((sum, f) => sum + f.rating.overall, 0) / feedback.length).toFixed(1)
            : 0,
          responsesReceived: feedback.filter(f => f.response && f.response.content).length
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;