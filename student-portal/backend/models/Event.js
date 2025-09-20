const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    minlength: [3, 'Title must be at least 3 characters long'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
    minlength: [10, 'Description must be at least 10 characters long'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
  },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club is required'],
    index: true,
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Event organizer is required'],
    validate: {
      validator: async function(v) {
        const user = await mongoose.model('User').findById(v);
        return user && (user.role === 'teacher' || user.role === 'admin');
      },
      message: 'Event organizer must be a teacher or admin',
    },
  },
  coOrganizers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['coordinator', 'volunteer', 'speaker'],
      default: 'coordinator',
    },
    responsibilities: [String],
  }],
  eventDate: {
    type: Date,
    required: [true, 'Event date is required'],
    validate: {
      validator: function(v) {
        return v >= new Date();
      },
      message: 'Event date must be in the future',
    },
    index: true,
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)'],
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)'],
    validate: {
      validator: function(v) {
        if (!this.startTime) return true;
        const start = this.startTime.split(':').map(Number);
        const end = v.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        return endMinutes > startMinutes;
      },
      message: 'End time must be after start time',
    },
  },
  duration: {
    hours: {
      type: Number,
      min: 0,
      max: 24,
    },
    minutes: {
      type: Number,
      min: 0,
      max: 59,
    },
  },
  venue: {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
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
    room: String,
    building: String,
    campus: String,
    coordinates: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    capacity: {
      type: Number,
      min: 1,
    },
    isVirtual: {
      type: Boolean,
      default: false,
    },
    virtualLink: {
      type: String,
      validate: {
        validator: function(v) {
          if (this.venue.isVirtual && !v) return false;
          if (v && !/^https?:\/\/.*/.test(v)) return false;
          return true;
        },
        message: 'Virtual link is required for virtual events and must be a valid URL',
      },
    },
    accessInstructions: String,
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: {
      values: [
        'workshop', 
        'seminar', 
        'competition', 
        'meeting', 
        'cultural', 
        'sports', 
        'conference',
        'hackathon',
        'exhibition',
        'performance',
        'networking',
        'training',
        'ceremony',
        'fundraiser'
      ],
      message: 'Event type must be one of the predefined values',
    },
    index: true,
  },
  category: {
    type: String,
    enum: ['technical', 'cultural', 'sports', 'academic', 'social', 'arts', 'music', 'dance', 'drama', 'photography', 'literature', 'debate', 'entrepreneurship', 'volunteer', 'environmental'],
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  images: {
    poster: String,
    banner: String,
    gallery: [{
      url: String,
      caption: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  maxParticipants: {
    type: Number,
    min: [0, 'Maximum participants cannot be negative'],
    validate: {
      validator: function(v) {
        if (v > 0 && this.venue.capacity && v > this.venue.capacity) {
          return false;
        }
        return true;
      },
      message: 'Maximum participants cannot exceed venue capacity',
    },
  },
  minParticipants: {
    type: Number,
    min: [0, 'Minimum participants cannot be negative'],
    validate: {
      validator: function(v) {
        if (this.maxParticipants && v > this.maxParticipants) {
          return false;
        }
        return true;
      },
      message: 'Minimum participants cannot exceed maximum participants',
    },
  },
  registrationDeadline: {
    type: Date,
    required: [true, 'Registration deadline is required'],
    validate: {
      validator: function(v) {
        return v <= this.eventDate;
      },
      message: 'Registration deadline must be before event date',
    },
    index: true,
  },
  registrationFee: {
    amount: {
      type: Number,
      min: [0, 'Registration fee cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentMethods: [{
      type: String,
      enum: ['cash', 'card', 'upi', 'net_banking', 'wallet'],
    }],
    refundPolicy: String,
  },
  requirements: {
    prerequisites: [String],
    eligibility: {
      type: String,
      default: 'Open to all students',
    },
    skills: [String],
    equipment: [String],
    materials: [String],
  },
  agenda: [{
    time: {
      type: String,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please provide a valid time format (HH:MM)'],
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    speaker: {
      name: String,
      title: String,
      bio: String,
      image: String,
      contact: String,
    },
    duration: Number, // in minutes
  }],
  speakers: [{
    name: {
      type: String,
      required: true,
    },
    title: String,
    organization: String,
    bio: String,
    image: String,
    socialLinks: {
      linkedin: String,
      twitter: String,
      website: String,
    },
    topics: [String],
  }],
  sponsors: [{
    name: {
      type: String,
      required: true,
    },
    logo: String,
    website: String,
    level: {
      type: String,
      enum: ['title', 'platinum', 'gold', 'silver', 'bronze', 'partner'],
      default: 'partner',
    },
    contribution: String,
  }],
  prizes: {
    description: String,
    details: [{
      position: {
        type: String,
        required: true,
      },
      prize: {
        type: String,
        required: true,
      },
      value: Number,
    }],
    criteria: String,
  },
  resources: [{
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['document', 'link', 'video', 'presentation', 'code'],
    },
    url: {
      type: String,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  }],
  registeredParticipants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['registered', 'waitlisted', 'cancelled', 'attended'],
      default: 'registered',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'waived'],
      default: 'pending',
    },
    checkInTime: Date,
    checkOutTime: Date,
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      submittedAt: Date,
    },
    certificate: {
      issued: {
        type: Boolean,
        default: false,
      },
      issuedAt: Date,
      certificateUrl: String,
    },
  }],
  attendedParticipants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkInTime: {
      type: Date,
      default: Date.now,
    },
    checkOutTime: Date,
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    attendanceType: {
      type: String,
      enum: ['full', 'partial', 'late'],
      default: 'full',
    },
    notes: String,
  }],
  waitlist: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    position: Number,
    notified: {
      type: Boolean,
      default: false,
    },
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'upcoming', 'ongoing', 'completed', 'cancelled', 'postponed'],
    default: 'draft',
    index: true,
  },
  cancellation: {
    reason: String,
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
    },
  },
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    suggestions: String,
    anonymous: {
      type: Boolean,
      default: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  statistics: {
    totalRegistrations: {
      type: Number,
      default: 0,
    },
    totalAttendance: {
      type: Number,
      default: 0,
    },
    attendanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalFeedback: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  isPublic: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPattern: {
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
    },
    interval: Number,
    endDate: Date,
    daysOfWeek: [String],
  },
  parentEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  childEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better performance
eventSchema.index({ title: 'text', description: 'text' });
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ club: 1, eventDate: -1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ eventType: 1, category: 1 });
eventSchema.index({ registrationDeadline: 1 });
eventSchema.index({ slug: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ 'registeredParticipants.user': 1 });

// Virtual for available spots
eventSchema.virtual('availableSpots').get(function() {
  if (!this.maxParticipants) return null;
  return Math.max(0, this.maxParticipants - this.registeredParticipants.length);
});

// Virtual for is full
eventSchema.virtual('isFull').get(function() {
  if (!this.maxParticipants) return false;
  return this.registeredParticipants.length >= this.maxParticipants;
});

// Virtual for registration status
eventSchema.virtual('registrationStatus').get(function() {
  const now = new Date();
  if (now > this.registrationDeadline) return 'closed';
  if (this.isFull) return 'full';
  return 'open';
});

// Virtual for event duration in minutes
eventSchema.virtual('durationInMinutes').get(function() {
  if (!this.startTime || !this.endTime) return 0;
  
  const start = this.startTime.split(':').map(Number);
  const end = this.endTime.split(':').map(Number);
  const startMinutes = start[0] * 60 + start[1];
  const endMinutes = end[0] * 60 + end[1];
  
  return endMinutes - startMinutes;
});

// Pre-save middleware to generate slug
eventSchema.pre('save', function(next) {
  if (this.isModified('title') || this.isNew) {
    let baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add date to make slug unique
    const eventDate = new Date(this.eventDate);
    const dateString = eventDate.toISOString().split('T')[0];
    this.slug = `${baseSlug}-${dateString}`;
  }
  next();
});

// Pre-save middleware to generate short description
eventSchema.pre('save', function(next) {
  if (this.isModified('description') && !this.shortDescription) {
    this.shortDescription = this.description.length > 300 
      ? this.description.substring(0, 300) + '...'
      : this.description;
  }
  next();
});

// Pre-save middleware to update statistics
eventSchema.pre('save', function(next) {
  if (this.isModified('registeredParticipants') || this.isModified('attendedParticipants') || this.isModified('feedback')) {
    // Update registration count
    this.statistics.totalRegistrations = this.registeredParticipants.filter(
      p => p.status === 'registered' || p.status === 'attended'
    ).length;

    // Update attendance count
    this.statistics.totalAttendance = this.attendedParticipants.length;

    // Update attendance rate
    if (this.statistics.totalRegistrations > 0) {
      this.statistics.attendanceRate = Math.round(
        (this.statistics.totalAttendance / this.statistics.totalRegistrations) * 100
      );
    }

    // Update feedback statistics
    const validFeedback = this.feedback.filter(f => f.rating && f.comment);
    this.statistics.totalFeedback = validFeedback.length;

    if (validFeedback.length > 0) {
      const totalRating = validFeedback.reduce((sum, f) => sum + f.rating, 0);
      this.statistics.averageRating = +(totalRating / validFeedback.length).toFixed(1);
    }
  }
  next();
});

// Pre-save middleware to auto-update status based on dates
eventSchema.pre('save', function(next) {
  const now = new Date();
  const eventStart = new Date(this.eventDate);
  const eventEnd = new Date(eventStart);
  
  // Calculate event end time
  if (this.endTime) {
    const [hours, minutes] = this.endTime.split(':').map(Number);
    eventEnd.setHours(hours, minutes, 0, 0);
  } else {
    eventEnd.setHours(eventStart.getHours() + 2); // Default 2 hours duration
  }

  // Auto-update status based on time
  if (this.status === 'published' || this.status === 'upcoming') {
    if (now >= eventStart && now <= eventEnd) {
      this.status = 'ongoing';
    } else if (now > eventEnd) {
      this.status = 'completed';
    }
  }

  next();
});

// Instance method to register a participant
eventSchema.methods.registerParticipant = function(userId, paymentStatus = 'pending') {
  // Check if registration is open
  if (this.registrationStatus !== 'open') {
    throw new Error('Registration is not open for this event');
  }

  // Check if already registered
  const existingRegistration = this.registeredParticipants.find(
    p => p.user.toString() === userId.toString()
  );

  if (existingRegistration) {
    throw new Error('User is already registered for this event');
  }

  // Check if event is full
  if (this.isFull) {
    // Add to waitlist instead
    return this.addToWaitlist(userId);
  }

  this.registeredParticipants.push({
    user: userId,
    status: 'registered',
    paymentStatus: paymentStatus,
  });

  return this.save();
};

// Instance method to unregister a participant
eventSchema.methods.unregisterParticipant = function(userId) {
  const participantIndex = this.registeredParticipants.findIndex(
    p => p.user.toString() === userId.toString()
  );

  if (participantIndex === -1) {
    throw new Error('User is not registered for this event');
  }

  // Check if event has already started
  if (this.status === 'ongoing' || this.status === 'completed') {
    throw new Error('Cannot unregister after event has started');
  }

  this.registeredParticipants[participantIndex].status = 'cancelled';

  // If there's a waitlist, move the first person
  if (this.waitlist.length > 0) {
    const nextInLine = this.waitlist.shift();
    this.registeredParticipants.push({
      user: nextInLine.user,
      status: 'registered',
      paymentStatus: 'pending',
    });
  }

  return this.save();
};

// Instance method to add to waitlist
eventSchema.methods.addToWaitlist = function(userId) {
  const existingWaitlist = this.waitlist.find(
    w => w.user.toString() === userId.toString()
  );

  if (existingWaitlist) {
    throw new Error('User is already on the waitlist');
  }

  this.waitlist.push({
    user: userId,
    position: this.waitlist.length + 1,
  });

  return this.save();
};

// Instance method to mark attendance
eventSchema.methods.markAttendance = function(participants, markedBy) {
  // Clear existing attendance
  this.attendedParticipants = [];

  // Mark new attendance
  for (const participantId of participants) {
    // Check if participant was registered
    const isRegistered = this.registeredParticipants.some(
      p => p.user.toString() === participantId.toString() && p.status === 'registered'
    );

    if (isRegistered) {
      this.attendedParticipants.push({
        user: participantId,
        markedBy: markedBy,
        attendanceType: 'full',
      });

      // Update participant status
      const participant = this.registeredParticipants.find(
        p => p.user.toString() === participantId.toString()
      );
      if (participant) {
        participant.status = 'attended';
      }
    }
  }

  return this.save();
};

// Instance method to add feedback
eventSchema.methods.addFeedback = function(userId, feedbackData) {
  // Check if user attended the event
  const attended = this.attendedParticipants.some(
    p => p.user.toString() === userId.toString()
  );

  if (!attended) {
    throw new Error('Only attendees can provide feedback');
  }

  // Check if feedback already exists
  const existingFeedback = this.feedback.find(
    f => f.user && f.user.toString() === userId.toString()
  );

  if (existingFeedback) {
    throw new Error('Feedback already submitted');
  }

  this.feedback.push({
    user: feedbackData.anonymous ? null : userId,
    rating: feedbackData.rating,
    comment: feedbackData.comment,
    suggestions: feedbackData.suggestions,
    anonymous: feedbackData.anonymous,
  });

  return this.save();
};

// Instance method to check if user can register
eventSchema.methods.canUserRegister = function(userId) {
  const now = new Date();
  
  // Check if registration is still open
  if (now > this.registrationDeadline) {
    return { canRegister: false, reason: 'Registration deadline has passed' };
  }

  // Check if already registered
  const isRegistered = this.registeredParticipants.some(
    p => p.user.toString() === userId.toString() && p.status !== 'cancelled'
  );

  if (isRegistered) {
    return { canRegister: false, reason: 'Already registered' };
  }

  // Check if event is full
  if (this.isFull) {
    return { canRegister: false, reason: 'Event is full', canWaitlist: true };
  }

  return { canRegister: true };
};

// Instance method to generate certificate data
eventSchema.methods.generateCertificate = function(userId) {
  const participant = this.attendedParticipants.find(
    p => p.user.toString() === userId.toString()
  );

  if (!participant) {
    throw new Error('User did not attend this event');
  }

  return {
    eventTitle: this.title,
    eventDate: this.eventDate,
    participantName: participant.user.name, // Will be populated
    certificateId: `${this.slug}-${userId}-${Date.now()}`,
    issueDate: new Date(),
    organizer: this.organizer.name, // Will be populated
    club: this.club.name, // Will be populated
  };
};

// Static method to find upcoming events
eventSchema.statics.findUpcoming = function(limit = 10, options = {}) {
  const { club, eventType, category } = options;
  const query = {
    eventDate: { $gte: new Date() },
    status: { $in: ['published', 'upcoming'] },
    isPublic: true,
  };

  if (club) query.club = club;
  if (eventType) query.eventType = eventType;
  if (category) query.category = category;

  return this.find(query)
    .populate('club', 'name slug category')
    .populate('organizer', 'name email')
    .sort({ eventDate: 1 })
    .limit(limit);
};

// Static method to search events
eventSchema.statics.searchEvents = function(searchTerm, options = {}) {
  const { club, eventType, category, dateRange, limit = 20, skip = 0 } = options;
  
  const query = {
    isPublic: true,
    status: { $in: ['published', 'upcoming', 'ongoing', 'completed'] },
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { shortDescription: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } },
    ],
  };

  if (club) query.club = club;
  if (eventType) query.eventType = eventType;
  if (category) query.category = category;
  
  if (dateRange) {
    query.eventDate = {};
    if (dateRange.from) query.eventDate.$gte = new Date(dateRange.from);
    if (dateRange.to) query.eventDate.$lte = new Date(dateRange.to);
  }

  return this.find(query)
    .populate('club', 'name slug category')
    .populate('organizer', 'name email')
    .limit(limit)
    .skip(skip)
    .sort({ eventDate: 1 });
};

// Static method to get popular events
eventSchema.statics.getPopularEvents = function(limit = 10) {
  return this.find({ 
    isPublic: true,
    status: { $in: ['published', 'upcoming', 'completed'] }
  })
    .populate('club', 'name slug category')
    .populate('organizer', 'name email')
    .sort({ 
      'statistics.totalRegistrations': -1,
      'statistics.averageRating': -1,
      'statistics.views': -1 
    })
    .limit(limit);
};

// Static method to get event statistics
eventSchema.statics.getEventStats = async function() {
  const totalEvents = await this.countDocuments();
  const upcomingEvents = await this.countDocuments({ 
    eventDate: { $gte: new Date() },
    status: { $in: ['published', 'upcoming'] }
  });
  const completedEvents = await this.countDocuments({ status: 'completed' });

  const typeStats = await this.aggregate([
    { $match: { isPublic: true } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        totalRegistrations: { $sum: '$statistics.totalRegistrations' },
        averageAttendance: { $avg: '$statistics.attendanceRate' },
      }
    },
    { $sort: { count: -1 } }
  ]);

  const monthlyStats = await this.aggregate([
    { 
      $match: { 
        eventDate: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$eventDate' },
          month: { $month: '$eventDate' }
        },
        count: { $sum: 1 },
        totalRegistrations: { $sum: '$statistics.totalRegistrations' },
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  return {
    total: totalEvents,
    upcoming: upcomingEvents,
    completed: completedEvents,
    byType: typeStats,
    monthly: monthlyStats,
  };
};

module.exports = mongoose.model('Event', eventSchema);