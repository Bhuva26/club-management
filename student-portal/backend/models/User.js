const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
    minlength: [2, 'Name must be at least 2 characters long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false, // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'teacher', 'student'],
      message: 'Role must be either admin, teacher, or student',
    },
    default: 'student',
  },
  studentId: {
    type: String,
    sparse: true, // Allows multiple null values but ensures uniqueness for non-null values
    trim: true,
    maxlength: [20, 'Student ID cannot exceed 20 characters'],
    validate: {
      validator: function(v) {
        // Student ID is required only for students
        if (this.role === 'student' && (!v || v.trim() === '')) {
          return false;
        }
        return true;
      },
      message: 'Student ID is required for students',
    },
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters'],
  },
  profilePicture: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: '',
  },
  phoneNumber: {
    type: String,
    match: [/^[+]?[\d\s\-\(\)]{10,15}$/, 'Please provide a valid phone number'],
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'India',
    },
  },
  socialLinks: {
    linkedin: {
      type: String,
      match: [/^https?:\/\/(www\.)?linkedin\.com\/.*/, 'Please provide a valid LinkedIn URL'],
    },
    github: {
      type: String,
      match: [/^https?:\/\/(www\.)?github\.com\/.*/, 'Please provide a valid GitHub URL'],
    },
    twitter: {
      type: String,
      match: [/^https?:\/\/(www\.)?twitter\.com\/.*/, 'Please provide a valid Twitter URL'],
    },
  },
  joinedClubs: [{
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['member', 'leader', 'coordinator'],
      default: 'member',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  eventsRegistered: [{
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['registered', 'attended', 'cancelled'],
      default: 'registered',
    },
  }],
  eventsOrganized: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    weeklyDigest: {
      type: Boolean,
      default: true,
    },
    eventReminders: {
      type: Boolean,
      default: true,
    },
  },
  lastLoginAt: {
    type: Date,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'joinedClubs.club': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name formatting
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for user stats
userSchema.virtual('stats').get(function() {
  return {
    clubsJoined: Array.isArray(this.joinedClubs) ? this.joinedClubs.filter(club => club.isActive).length : 0,
    eventsRegistered: Array.isArray(this.eventsRegistered) ? this.eventsRegistered.length : 0,
    eventsOrganized: Array.isArray(this.eventsOrganized) ? this.eventsOrganized.length : 0,
    memberSince: this.createdAt,
  };
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware for student ID validation
userSchema.pre('save', function(next) {
  // Ensure student ID is unique for students
  if (this.role === 'student' && this.studentId) {
    this.constructor.findOne({ 
      studentId: this.studentId, 
      _id: { $ne: this._id } 
    })
    .then(existingUser => {
      if (existingUser) {
        next(new Error('Student ID already exists'));
      } else {
        next();
      }
    })
    .catch(next);
  } else {
    next();
  }
});

// Pre-save middleware to update last login
userSchema.pre('save', function(next) {
  if (this.isModified('lastLoginAt')) {
    // Reset login attempts on successful login
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    email: this.email,
    role: this.role,
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d',
      issuer: 'smart-clubs-api',
      audience: 'smart-clubs-users',
    }
  );
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Instance method to join a club
userSchema.methods.joinClub = function(clubId, role = 'member') {
  const existingClub = this.joinedClubs.find(
    club => club.club.toString() === clubId.toString() && club.isActive
  );

  if (existingClub) {
    throw new Error('User is already a member of this club');
  }

  this.joinedClubs.push({
    club: clubId,
    role: role,
    isActive: true,
  });

  return this.save();
};

// Instance method to leave a club
userSchema.methods.leaveClub = function(clubId) {
  const clubIndex = this.joinedClubs.findIndex(
    club => club.club.toString() === clubId.toString() && club.isActive
  );

  if (clubIndex === -1) {
    throw new Error('User is not a member of this club');
  }

  this.joinedClubs[clubIndex].isActive = false;
  return this.save();
};

// Instance method to register for an event
userSchema.methods.registerForEvent = function(eventId) {
  const existingRegistration = this.eventsRegistered.find(
    reg => reg.event.toString() === eventId.toString()
  );

  if (existingRegistration) {
    throw new Error('User is already registered for this event');
  }

  this.eventsRegistered.push({
    event: eventId,
    status: 'registered',
  });

  return this.save();
};

// Instance method to unregister from an event
userSchema.methods.unregisterFromEvent = function(eventId) {
  const registrationIndex = this.eventsRegistered.findIndex(
    reg => reg.event.toString() === eventId.toString()
  );

  if (registrationIndex === -1) {
    throw new Error('User is not registered for this event');
  }

  this.eventsRegistered[registrationIndex].status = 'cancelled';
  return this.save();
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to search users
userSchema.statics.searchUsers = function(searchTerm, options = {}) {
  const { role, limit = 20, skip = 0 } = options;
  
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { studentId: { $regex: searchTerm, $options: 'i' } },
      { department: { $regex: searchTerm, $options: 'i' } },
    ],
  };

  if (role) {
    searchQuery.role = role;
  }

  return this.find(searchQuery)
    .select('-password')
    .limit(limit)
    .skip(skip)
    .sort({ name: 1 });
};

// Static method to get user statistics
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  const totalUsers = await this.countDocuments();
  const activeUsers = await this.countDocuments({ isActive: true });

  return {
    total: totalUsers,
    active: activeUsers,
    byRole: stats.reduce((acc, stat) => {
      acc[stat._id] = stat;
      return acc;
    }, {}),
  };
};

module.exports = mongoose.model('User', userSchema);