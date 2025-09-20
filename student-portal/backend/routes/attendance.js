const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Event = require('../models/Event');
const User = require('../models/User');
const { auth, teacherAuth } = require('../middleware/auth');
const { createNotFoundError, createValidationError, createForbiddenError } = require('../middleware/errorHandler');

const router = express.Router();

// @route   POST /api/attendance/mark
// @desc    Mark attendance for event participants
// @access  Private (Teachers only)
router.post('/mark', auth, teacherAuth, [
  body('eventId')
    .isMongoId()
    .withMessage('Event ID must be a valid MongoDB ID'),
  
  body('participants')
    .isArray()
    .withMessage('Participants must be an array'),
  
  body('participants.*')
    .isMongoId()
    .withMessage('Each participant must be a valid MongoDB ID'),
  
  body('attendanceType')
    .optional()
    .isIn(['full', 'partial', 'late'])
    .withMessage('Attendance type must be full, partial, or late'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
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

    const { eventId, participants, attendanceType = 'full', notes } = req.body;

    const event = await Event.findById(eventId)
      .populate('club', 'name coordinator')
      .populate('organizer', 'name email');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check if user has permission to mark attendance
    const isOrganizer = event.organizer._id.toString() === req.user._id.toString();
    const isCoordinator = event.club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOrganizer && !isCoordinator && !isAdmin) {
      throw createForbiddenError('Only event organizers, club coordinators, and admins can mark attendance');
    }

    // Clear existing attendance
    event.attendedParticipants = [];

    // Mark new attendance
    const attendedUsers = [];
    for (const participantId of participants) {
      // Verify participant was registered
      const isRegistered = event.registeredParticipants.some(
        p => p.user.toString() === participantId && p.status === 'registered'
      );

      if (isRegistered) {
        event.attendedParticipants.push({
          user: participantId,
          markedBy: req.user._id,
          attendanceType,
          notes
        });

        // Update participant status to attended
        const participant = event.registeredParticipants.find(
          p => p.user.toString() === participantId
        );
        if (participant) {
          participant.status = 'attended';
        }

        attendedUsers.push(participantId);
      }
    }

    await event.save();

    // Get attended user details for response
    const attendedUserDetails = await User.find({
      _id: { $in: attendedUsers }
    }).select('name email studentId department');

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        eventId: event._id,
        eventTitle: event.title,
        attendedCount: event.attendedParticipants.length,
        totalRegistered: event.registeredParticipants.filter(p => p.status !== 'cancelled').length,
        attendanceRate: event.statistics.attendanceRate,
        attendedUsers: attendedUserDetails,
        markedBy: req.user.name,
        markedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/event/:eventId
// @desc    Get attendance for an event
// @access  Private (Event organizer, club coordinator, or Admin)
router.get('/event/:eventId', auth, async (req, res, next) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId)
      .populate('club', 'name coordinator')
      .populate('organizer', 'name email')
      .populate('registeredParticipants.user', 'name email studentId department profilePicture')
      .populate('attendedParticipants.user', 'name email studentId department profilePicture')
      .populate('attendedParticipants.markedBy', 'name email');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check permissions
    const isOrganizer = event.organizer._id.toString() === req.user._id.toString();
    const isCoordinator = event.club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';

    if (!isOrganizer && !isCoordinator && !isAdmin && !isTeacher) {
      throw createForbiddenError('Access denied');
    }

    // Calculate attendance statistics
    const totalRegistered = event.registeredParticipants.filter(p => p.status !== 'cancelled').length;
    const totalAttended = event.attendedParticipants.length;
    const attendancePercentage = totalRegistered > 0 
      ? Math.round((totalAttended / totalRegistered) * 100)
      : 0;

    // Create attendance summary
    const attendanceByType = event.attendedParticipants.reduce((acc, attendance) => {
      const type = attendance.attendanceType || 'full';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Mark who attended vs who didn't
    const registeredUserIds = event.registeredParticipants
      .filter(p => p.status !== 'cancelled')
      .map(p => p.user._id.toString());
    
    const attendedUserIds = event.attendedParticipants.map(p => p.user._id.toString());
    
    const absentParticipants = event.registeredParticipants.filter(p => 
      p.status !== 'cancelled' && !attendedUserIds.includes(p.user._id.toString())
    );

    res.json({
      success: true,
      data: {
        event: {
          id: event._id,
          title: event.title,
          eventDate: event.eventDate,
          status: event.status,
          club: event.club,
          organizer: event.organizer
        },
        attendance: {
          totalRegistered,
          totalAttended,
          attendancePercentage,
          absentCount: totalRegistered - totalAttended,
          attendanceByType
        },
        participants: {
          registered: event.registeredParticipants.filter(p => p.status !== 'cancelled'),
          attended: event.attendedParticipants,
          absent: absentParticipants
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/user/:userId
// @desc    Get attendance history for a user
// @access  Private (Own data, Teacher, or Admin)
router.get('/user/:userId', auth, [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
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

    const { userId } = req.params;
    const { limit = 50, startDate, endDate, eventType } = req.query;

    // Check permissions
    const isOwnData = req.user._id.toString() === userId;
    const isAuthorized = isOwnData || req.user.role === 'teacher' || req.user.role === 'admin';

    if (!isAuthorized) {
      throw createForbiddenError('You can only access your own attendance data');
    }

    // Verify user exists
    const user = await User.findById(userId).select('name email studentId department');
    if (!user) {
      throw createNotFoundError('User');
    }

    // Build query for events where user attended
    const eventQuery = {
      'attendedParticipants.user': userId
    };

    // Add date range filter if provided
    if (startDate || endDate) {
      eventQuery.eventDate = {};
      if (startDate) eventQuery.eventDate.$gte = new Date(startDate);
      if (endDate) eventQuery.eventDate.$lte = new Date(endDate);
    }

    // Add event type filter if provided
    if (eventType) {
      eventQuery.eventType = eventType;
    }

    const events = await Event.find(eventQuery)
      .populate('club', 'name category')
      .populate('organizer', 'name')
      .select('title eventDate venue club organizer eventType attendedParticipants')
      .sort({ eventDate: -1 })
      .limit(parseInt(limit));

    // Extract attendance details for this user
    const attendanceHistory = events.map(event => {
      const userAttendance = event.attendedParticipants.find(
        attendance => attendance.user.toString() === userId
      );

      return {
        eventId: event._id,
        eventTitle: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        eventType: event.eventType,
        club: event.club,
        organizer: event.organizer,
        attendance: {
          markedAt: userAttendance.markedAt,
          attendanceType: userAttendance.attendanceType,
          notes: userAttendance.notes
        }
      };
    });

    // Calculate attendance statistics
    const totalEventsAttended = attendanceHistory.length;
    const attendanceByType = attendanceHistory.reduce((acc, record) => {
      const type = record.attendance.attendanceType || 'full';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const attendanceByEventType = attendanceHistory.reduce((acc, record) => {
      acc[record.eventType] = (acc[record.eventType] || 0) + 1;
      return acc;
    }, {});

    // Get total events user was registered for (for attendance rate calculation)
    const totalRegisteredEvents = await Event.countDocuments({
      'registeredParticipants.user': userId,
      'registeredParticipants.status': { $ne: 'cancelled' }
    });

    const overallAttendanceRate = totalRegisteredEvents > 0 
      ? Math.round((totalEventsAttended / totalRegisteredEvents) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          department: user.department
        },
        statistics: {
          totalEventsAttended,
          totalRegisteredEvents,
          overallAttendanceRate,
          attendanceByType,
          attendanceByEventType
        },
        attendanceHistory,
        filters: {
          startDate,
          endDate,
          eventType,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/attendance/update/:eventId/:userId
// @desc    Update attendance record for a specific user in an event
// @access  Private (Teachers only)
router.put('/update/:eventId/:userId', auth, teacherAuth, [
  body('attendanceType')
    .optional()
    .isIn(['full', 'partial', 'late'])
    .withMessage('Attendance type must be full, partial, or late'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('checkInTime')
    .optional()
    .isISO8601()
    .withMessage('Check-in time must be a valid ISO date'),
  
  body('checkOutTime')
    .optional()
    .isISO8601()
    .withMessage('Check-out time must be a valid ISO date'),
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

    const { eventId, userId } = req.params;
    const { attendanceType, notes, checkInTime, checkOutTime } = req.body;

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
      throw createForbiddenError('Only event organizers, club coordinators, and admins can update attendance');
    }

    // Find the attendance record
    const attendanceIndex = event.attendedParticipants.findIndex(
      attendance => attendance.user.toString() === userId
    );

    if (attendanceIndex === -1) {
      throw createNotFoundError('Attendance record not found for this user');
    }

    // Update attendance record
    const attendance = event.attendedParticipants[attendanceIndex];
    if (attendanceType !== undefined) attendance.attendanceType = attendanceType;
    if (notes !== undefined) attendance.notes = notes;
    if (checkInTime !== undefined) attendance.checkInTime = new Date(checkInTime);
    if (checkOutTime !== undefined) attendance.checkOutTime = new Date(checkOutTime);

    await event.save();

    // Get updated user details
    const user = await User.findById(userId).select('name email studentId department');

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: {
        eventId: event._id,
        eventTitle: event.title,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          department: user.department
        },
        attendance: attendance,
        updatedBy: req.user.name,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/attendance/remove/:eventId/:userId
// @desc    Remove attendance record for a specific user
// @access  Private (Teachers only)
router.delete('/remove/:eventId/:userId', auth, teacherAuth, async (req, res, next) => {
  try {
    const { eventId, userId } = req.params;

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
      throw createForbiddenError('Only event organizers, club coordinators, and admins can remove attendance');
    }

    // Find and remove attendance record
    const initialLength = event.attendedParticipants.length;
    event.attendedParticipants = event.attendedParticipants.filter(
      attendance => attendance.user.toString() !== userId
    );

    if (event.attendedParticipants.length === initialLength) {
      throw createNotFoundError('Attendance record not found for this user');
    }

    // Update participant status back to registered
    const participant = event.registeredParticipants.find(
      p => p.user.toString() === userId
    );
    if (participant) {
      participant.status = 'registered';
    }

    await event.save();

    res.json({
      success: true,
      message: 'Attendance record removed successfully',
      data: {
        eventId: event._id,
        userId,
        removedBy: req.user.name,
        removedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/reports/club/:clubId
// @desc    Get attendance reports for a club
// @access  Private (Club coordinator or Admin)
router.get('/reports/club/:clubId', auth, [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  
  query('eventType')
    .optional()
    .isIn(['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports', 'conference', 'hackathon', 'exhibition', 'performance', 'networking', 'training', 'ceremony', 'fundraiser'])
    .withMessage('Invalid event type'),
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
    const { startDate, endDate, eventType } = req.query;

    // Verify club exists and check permissions
    const Club = require('../models/Club');
    const club = await Club.findById(clubId);
    if (!club) {
      throw createNotFoundError('Club');
    }

    const isCoordinator = club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';

    if (!isCoordinator && !isAdmin && !isTeacher) {
      throw createForbiddenError('Only club coordinators, teachers, and admins can view attendance reports');
    }

    // Build query for club events
    const eventQuery = { club: clubId };

    // Add date range filter
    if (startDate || endDate) {
      eventQuery.eventDate = {};
      if (startDate) eventQuery.eventDate.$gte = new Date(startDate);
      if (endDate) eventQuery.eventDate.$lte = new Date(endDate);
    }

    // Add event type filter
    if (eventType) {
      eventQuery.eventType = eventType;
    }

    const events = await Event.find(eventQuery)
      .populate('organizer', 'name email')
      .select('title eventDate venue eventType registeredParticipants attendedParticipants statistics')
      .sort({ eventDate: -1 });

    // Calculate overall statistics
    let totalEvents = events.length;
    let totalRegistrations = 0;
    let totalAttendance = 0;
    let attendanceByEventType = {};
    let monthlyAttendance = {};

    const eventReports = events.map(event => {
      const registered = event.registeredParticipants.filter(p => p.status !== 'cancelled').length;
      const attended = event.attendedParticipants.length;
      const attendanceRate = registered > 0 ? Math.round((attended / registered) * 100) : 0;

      totalRegistrations += registered;
      totalAttendance += attended;

      // Group by event type
      attendanceByEventType[event.eventType] = attendanceByEventType[event.eventType] || { events: 0, totalAttended: 0, totalRegistered: 0 };
      attendanceByEventType[event.eventType].events += 1;
      attendanceByEventType[event.eventType].totalAttended += attended;
      attendanceByEventType[event.eventType].totalRegistered += registered;

      // Group by month
      const monthKey = event.eventDate.toISOString().substring(0, 7); // YYYY-MM
      monthlyAttendance[monthKey] = monthlyAttendance[monthKey] || { events: 0, totalAttended: 0, totalRegistered: 0 };
      monthlyAttendance[monthKey].events += 1;
      monthlyAttendance[monthKey].totalAttended += attended;
      monthlyAttendance[monthKey].totalRegistered += registered;

      return {
        eventId: event._id,
        title: event.title,
        eventDate: event.eventDate,
        venue: event.venue,
        eventType: event.eventType,
        organizer: event.organizer,
        statistics: {
          registered,
          attended,
          attendanceRate,
          noShowCount: registered - attended
        }
      };
    });

    const overallAttendanceRate = totalRegistrations > 0 
      ? Math.round((totalAttendance / totalRegistrations) * 100)
      : 0;

    // Calculate average attendance rate by event type
    Object.keys(attendanceByEventType).forEach(type => {
      const data = attendanceByEventType[type];
      data.averageAttendanceRate = data.totalRegistered > 0 
        ? Math.round((data.totalAttended / data.totalRegistered) * 100)
        : 0;
    });

    res.json({
      success: true,
      data: {
        club: {
          id: club._id,
          name: club.name,
          category: club.category
        },
        summary: {
          totalEvents,
          totalRegistrations,
          totalAttendance,
          overallAttendanceRate,
          averageEventAttendance: totalEvents > 0 ? Math.round(totalAttendance / totalEvents) : 0
        },
        analytics: {
          attendanceByEventType,
          monthlyAttendance
        },
        events: eventReports,
        filters: {
          startDate,
          endDate,
          eventType
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/attendance/export/:eventId
// @desc    Export attendance data for an event
// @access  Private (Event organizer, club coordinator, or Admin)
router.get('/export/:eventId', auth, [
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be json or csv'),
], async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { format = 'json' } = req.query;

    const event = await Event.findById(eventId)
      .populate('club', 'name coordinator')
      .populate('organizer', 'name email')
      .populate('registeredParticipants.user', 'name email studentId department phoneNumber')
      .populate('attendedParticipants.user', 'name email studentId department phoneNumber')
      .populate('attendedParticipants.markedBy', 'name email');

    if (!event) {
      throw createNotFoundError('Event');
    }

    // Check permissions
    const isOrganizer = event.organizer._id.toString() === req.user._id.toString();
    const isCoordinator = event.club.coordinator.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isTeacher = req.user.role === 'teacher';

    if (!isOrganizer && !isCoordinator && !isAdmin && !isTeacher) {
      throw createForbiddenError('Access denied');
    }

    // Prepare export data
    const registeredUserIds = event.registeredParticipants
      .filter(p => p.status !== 'cancelled')
      .map(p => p.user._id.toString());

    const attendedUserIds = event.attendedParticipants.map(p => p.user._id.toString());

    const exportData = event.registeredParticipants
      .filter(p => p.status !== 'cancelled')
      .map(participant => {
        const user = participant.user;
        const attended = attendedUserIds.includes(user._id.toString());
        const attendanceRecord = attended 
          ? event.attendedParticipants.find(a => a.user._id.toString() === user._id.toString())
          : null;

        return {
          name: user.name,
          email: user.email,
          studentId: user.studentId,
          department: user.department,
          phoneNumber: user.phoneNumber,
          registrationDate: participant.registrationDate,
          registrationStatus: participant.status,
          attended: attended ? 'Yes' : 'No',
          attendanceType: attendanceRecord?.attendanceType || 'N/A',
          checkInTime: attendanceRecord?.checkInTime || 'N/A',
          checkOutTime: attendanceRecord?.checkOutTime || 'N/A',
          attendanceNotes: attendanceRecord?.notes || '',
          markedBy: attendanceRecord?.markedBy?.name || 'N/A',
          markedAt: attendanceRecord?.markedAt || 'N/A'
        };
      });

    if (format === 'csv') {
      // Convert to CSV format
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header];
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"` 
              : value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-${event.slug || event._id}.csv"`);
      res.send(csvContent);
    } else {
      // Return JSON format
      res.json({
        success: true,
        data: {
          event: {
            id: event._id,
            title: event.title,
            eventDate: event.eventDate,
            venue: event.venue,
            club: event.club,
            organizer: event.organizer
          },
          summary: {
            totalRegistered: registeredUserIds.length,
            totalAttended: attendedUserIds.length,
            attendanceRate: registeredUserIds.length > 0 
              ? Math.round((attendedUserIds.length / registeredUserIds.length) * 100) 
              : 0
          },
          participants: exportData,
          exportedAt: new Date(),
          exportedBy: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email
          }
        }
      });
    }

  } catch (error) {
    next(error);
  }
});

module.exports = router;