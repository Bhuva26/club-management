const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate user
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided or invalid format.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database and exclude password
      const user = await User.findById(decoded.userId)
        .select('-password')
        .populate('joinedClubs.club', 'name slug category');
      
      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Token is not valid. User not found.' 
        });
      }

      // Check if user account is active
      if (!user.isActive) {
        return res.status(401).json({ 
          success: false,
          message: 'Account has been deactivated. Please contact administrator.' 
        });
      }

      // Check if account is locked
      if (user.isLocked) {
        const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
        return res.status(423).json({ 
          success: false,
          message: `Account is temporarily locked. Try again in ${lockTimeRemaining} minutes.` 
        });
      }

      // Add user to request object
      req.user = user;
      next();
      
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid token format.',
          code: 'INVALID_TOKEN'
        });
      } else {
        throw jwtError;
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during authentication.' 
    });
  }
};

// Middleware to authorize admin users only
const adminAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Admin privileges required.',
      userRole: req.user.role,
      requiredRole: 'admin'
    });
  }

  next();
};

// Middleware to authorize teacher and admin users
const teacherAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Teacher or admin privileges required.',
      userRole: req.user.role,
      requiredRoles: ['teacher', 'admin']
    });
  }

  next();
};

// Middleware to authorize student, teacher, and admin users
const studentAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  const allowedRoles = ['student', 'teacher', 'admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Valid user role required.',
      userRole: req.user.role,
      allowedRoles
    });
  }

  next();
};

// Middleware to check if user owns resource or has elevated privileges
const ownerOrElevatedAuth = (resourceUserField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    // Admins and teachers can access any resource
    if (req.user.role === 'admin' || req.user.role === 'teacher') {
      return next();
    }

    // Students can only access their own resources
    const resourceUserId = req.params[resourceUserField] || req.body[resourceUserField];
    
    if (req.user.role === 'student' && req.user._id.toString() !== resourceUserId) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only access your own resources.' 
      });
    }

    next();
  };
};

// Middleware to check club membership or elevated privileges
const clubMemberAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    // Admins can access any club
    if (req.user.role === 'admin') {
      return next();
    }

    const clubId = req.params.clubId || req.body.clubId;
    
    if (!clubId) {
      return res.status(400).json({ 
        success: false,
        message: 'Club ID is required.' 
      });
    }

    const Club = require('../models/Club');
    const club = await Club.findById(clubId);
    
    if (!club) {
      return res.status(404).json({ 
        success: false,
        message: 'Club not found.' 
      });
    }

    // Check if user is club coordinator
    if (club.coordinator.toString() === req.user._id.toString()) {
      req.clubRole = 'coordinator';
      return next();
    }

    // Check if user is a member of the club
    const membership = club.members.find(
      member => member.user.toString() === req.user._id.toString() && member.isActive
    );

    if (membership) {
      req.clubRole = membership.role;
      return next();
    }

    // Teachers can access clubs they don't belong to for administrative purposes
    if (req.user.role === 'teacher') {
      req.clubRole = 'teacher';
      return next();
    }

    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Club membership required.' 
    });

  } catch (error) {
    console.error('Club member auth error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during club authorization.' 
    });
  }
};

// Middleware to check event access permissions
const eventAccessAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    // Admins can access any event
    if (req.user.role === 'admin') {
      return next();
    }

    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    
    if (!eventId) {
      return res.status(400).json({ 
        success: false,
        message: 'Event ID is required.' 
      });
    }

    const Event = require('../models/Event');
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        success: false,
        message: 'Event not found.' 
      });
    }

    // Check if user is event organizer
    if (event.organizer.toString() === req.user._id.toString()) {
      req.eventRole = 'organizer';
      return next();
    }

    // Check if user is co-organizer
    const coOrganizerRole = event.coOrganizers.find(
      coOrg => coOrg.user.toString() === req.user._id.toString()
    );

    if (coOrganizerRole) {
      req.eventRole = coOrganizerRole.role;
      return next();
    }

    // Teachers can access events for administrative purposes
    if (req.user.role === 'teacher') {
      req.eventRole = 'teacher';
      return next();
    }

    // Students can access events they are registered for or public events
    if (req.user.role === 'student') {
      const isRegistered = event.registeredParticipants.some(
        participant => participant.user.toString() === req.user._id.toString()
      );

      if (isRegistered || event.isPublic) {
        req.eventRole = 'participant';
        return next();
      }
    }

    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Event access permission required.' 
    });

  } catch (error) {
    console.error('Event access auth error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during event authorization.' 
    });
  }
};

// Middleware for role-based authorization with multiple roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Insufficient privileges.',
        userRole: req.user.role,
        allowedRoles: roles
      });
    }

    next();
  };
};

// Middleware to verify email (for future email verification feature)
const verifyEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      message: 'Authentication required.' 
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({ 
      success: false,
      message: 'Email verification required. Please verify your email address.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

// Middleware to log user activity
const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      // In a real application, you might want to log this to a separate collection
      console.log(`User ${req.user._id} (${req.user.email}) performed action: ${action} at ${new Date().toISOString()}`);
      
      // You could also add this to a user activity log
      // const ActivityLog = require('../models/ActivityLog');
      // ActivityLog.create({
      //   user: req.user._id,
      //   action,
      //   timestamp: new Date(),
      //   ipAddress: req.ip,
      //   userAgent: req.get('User-Agent')
      // });
    }
    next();
  };
};

module.exports = {
  auth,
  adminAuth,
  teacherAuth,
  studentAuth,
  ownerOrElevatedAuth,
  clubMemberAuth,
  eventAccessAuth,
  authorize,
  verifyEmail,
  logActivity,
};