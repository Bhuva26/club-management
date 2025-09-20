const mongoose = require('mongoose');

const clubSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Club name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Club name cannot exceed 100 characters'],
    minlength: [2, 'Club name must be at least 2 characters long'],
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Club description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    minlength: [10, 'Description must be at least 10 characters long'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  category: {
    type: String,
    required: [true, 'Club category is required'],
    enum: {
      values: ['technical', 'cultural', 'sports', 'academic', 'social', 'arts', 'music', 'dance', 'drama', 'photography', 'literature', 'debate', 'entrepreneurship', 'volunteer', 'environmental'],
      message: 'Category must be one of the predefined values',
    },
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  images: {
    logo: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    gallery: [{
      url: String,
      caption: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Club coordinator is required'],
    validate: {
      validator: async function(v) {
        const user = await mongoose.model('User').findById(v);
        return user && (user.role === 'teacher' || user.role === 'admin');
      },
      message: 'Coordinator must be a teacher or admin',
    },
  },
  coCoordinators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    permissions: [{
      type: String,
      enum: ['manage_members', 'create_events', 'manage_content', 'view_analytics'],
    }],
  }],
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    role: {
      type: String,
      enum: ['member', 'leader', 'coordinator', 'co-coordinator'],
      default: 'member',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    contributions: {
      eventsOrganized: {
        type: Number,
        default: 0,
      },
      eventsAttended: {
        type: Number,
        default: 0,
      },
      feedbackGiven: {
        type: Number,
        default: 0,
      },
    },
  }],
  contactInfo: {
    email: {
      type: String,
      required: [true, 'Contact email is required'],
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      match: [/^[+]?[\d\s\-\(\)]{10,15}$/, 'Please provide a valid phone number'],
    },
    website: {
      type: String,
      match: [/^https?:\/\/.*/, 'Please provide a valid website URL'],
    },
    socialLinks: {
      facebook: {
        type: String,
        match: [/^https?:\/\/(www\.)?facebook\.com\/.*/, 'Please provide a valid Facebook URL'],
      },
      instagram: {
        type: String,
        match: [/^https?:\/\/(www\.)?instagram\.com\/.*/, 'Please provide a valid Instagram URL'],
      },
      twitter: {
        type: String,
        match: [/^https?:\/\/(www\.)?twitter\.com\/.*/, 'Please provide a valid Twitter URL'],
      },
      linkedin: {
        type: String,
        match: [/^https?:\/\/(www\.)?linkedin\.com\/.*/, 'Please provide a valid LinkedIn URL'],
      },
      youtube: {
        type: String,
        match: [/^https?:\/\/(www\.)?youtube\.com\/.*/, 'Please provide a valid YouTube URL'],
      },
    },
  },
  meetingSchedule: {
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'as-needed'],
      default: 'monthly',
    },
    dayOfWeek: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    },
    time: String, // Format: "HH:MM"
    location: String,
    virtualMeetingLink: String,
    additionalInfo: String,
  },
  requirements: {
    eligibility: {
      type: String,
      default: 'Open to all students',
    },
    skills: [String],
    prerequisites: [String],
    minimumCommitment: String,
  },
  achievements: [{
    title: {
      type: String,
      required: true,
    },
    description: String,
    date: Date,
    category: {
      type: String,
      enum: ['award', 'recognition', 'milestone', 'competition', 'project'],
    },
    attachments: [{
      name: String,
      url: String,
      type: String,
    }],
  }],
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  announcements: [{
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'members', 'leaders', 'coordinators'],
      default: 'members',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  resources: [{
    title: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['document', 'link', 'video', 'image', 'presentation'],
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    tags: [String],
  }],
  settings: {
    isPublic: {
      type: Boolean,
      default: true,
    },
    requireApproval: {
      type: Boolean,
      default: false,
    },
    allowMemberInvites: {
      type: Boolean,
      default: true,
    },
    showMemberList: {
      type: Boolean,
      default: true,
    },
    enableDiscussions: {
      type: Boolean,
      default: true,
    },
    maxMembers: {
      type: Number,
      min: 0,
    },
  },
  statistics: {
    totalEvents: {
      type: Number,
      default: 0,
    },
    totalMembers: {
      type: Number,
      default: 0,
    },
    averageAttendance: {
      type: Number,
      default: 0,
    },
    totalFeedback: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  establishedAt: {
    type: Date,
    default: Date.now,
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  archiveReason: String,
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better performance
clubSchema.index({ name: 'text', description: 'text', shortDescription: 'text' });
clubSchema.index({ category: 1, isActive: 1 });
clubSchema.index({ coordinator: 1 });
clubSchema.index({ 'members.user': 1 });
clubSchema.index({ createdAt: -1 });
clubSchema.index({ slug: 1 });
clubSchema.index({ tags: 1 });

// Virtual for member count
clubSchema.virtual('memberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for active events count
clubSchema.virtual('activeEventsCount').get(function() {
  return this.events.length;
});

// Virtual for club age
clubSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.establishedAt) / (1000 * 60 * 60 * 24));
});

// Virtual for club status
clubSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.archivedAt) return 'archived';
  if (!this.isVerified) return 'pending';
  return 'active';
});

// Pre-save middleware to generate slug
clubSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Pre-save middleware to generate short description
clubSchema.pre('save', function(next) {
  if (this.isModified('description') && !this.shortDescription) {
    this.shortDescription = this.description.length > 200 
      ? this.description.substring(0, 200) + '...'
      : this.description;
  }
  next();
});

// Pre-save middleware to update statistics
clubSchema.pre('save', function(next) {
  if (this.isModified('members')) {
    this.statistics.totalMembers = this.members.filter(member => member.isActive).length;
    this.statistics.lastActivityAt = new Date();
  }
  next();
});

// Post-save middleware to update coordinator's clubs
clubSchema.post('save', async function() {
  if (this.isModified('coordinator')) {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(this.coordinator, {
      $addToSet: {
        joinedClubs: {
          club: this._id,
          role: 'coordinator',
          joinedAt: new Date(),
        }
      }
    });
  }
});

// Instance method to add a member
clubSchema.methods.addMember = function(userId, role = 'member') {
  const existingMember = this.members.find(
    member => member.user.toString() === userId.toString() && member.isActive
  );

  if (existingMember) {
    throw new Error('User is already a member of this club');
  }

  // Check max members limit
  if (this.settings.maxMembers && this.memberCount >= this.settings.maxMembers) {
    throw new Error('Club has reached maximum member capacity');
  }

  this.members.push({
    user: userId,
    role: role,
    isActive: true,
  });

  return this.save();
};

// Instance method to remove a member
clubSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(
    member => member.user.toString() === userId.toString() && member.isActive
  );

  if (memberIndex === -1) {
    throw new Error('User is not a member of this club');
  }

  // Don't allow removing the coordinator
  if (this.members[memberIndex].role === 'coordinator') {
    throw new Error('Cannot remove the club coordinator');
  }

  this.members[memberIndex].isActive = false;
  return this.save();
};

// Instance method to update member role
clubSchema.methods.updateMemberRole = function(userId, newRole) {
  const member = this.members.find(
    member => member.user.toString() === userId.toString() && member.isActive
  );

  if (!member) {
    throw new Error('User is not a member of this club');
  }

  member.role = newRole;
  return this.save();
};

// Instance method to check if user is a member
clubSchema.methods.isMember = function(userId) {
  return this.members.some(
    member => member.user.toString() === userId.toString() && member.isActive
  );
};

// Instance method to get member by user ID
clubSchema.methods.getMember = function(userId) {
  return this.members.find(
    member => member.user.toString() === userId.toString() && member.isActive
  );
};

// Instance method to add an announcement
clubSchema.methods.addAnnouncement = function(announcementData) {
  this.announcements.unshift({
    ...announcementData,
    createdAt: new Date(),
  });

  return this.save();
};

// Instance method to add a resource
clubSchema.methods.addResource = function(resourceData) {
  this.resources.push({
    ...resourceData,
    uploadedAt: new Date(),
  });

  return this.save();
};

// Instance method to calculate statistics
clubSchema.methods.calculateStatistics = async function() {
  const Event = mongoose.model('Event');
  const Feedback = mongoose.model('Feedback');

  // Get club events
  const events = await Event.find({ club: this._id });
  
  // Calculate total events
  this.statistics.totalEvents = events.length;

  // Calculate average attendance
  let totalAttendance = 0;
  let completedEvents = 0;

  for (const event of events) {
    if (event.status === 'completed' && event.attendedParticipants.length > 0) {
      totalAttendance += event.attendedParticipants.length;
      completedEvents++;
    }
  }

  this.statistics.averageAttendance = completedEvents > 0 
    ? Math.round(totalAttendance / completedEvents) 
    : 0;

  // Calculate feedback statistics
  const feedback = await Feedback.find({ club: this._id });
  this.statistics.totalFeedback = feedback.length;

  if (feedback.length > 0) {
    const totalRating = feedback.reduce((sum, fb) => sum + fb.rating, 0);
    this.statistics.averageRating = +(totalRating / feedback.length).toFixed(1);
  }

  this.statistics.lastActivityAt = new Date();
  
  return this.save();
};

// Static method to find clubs by category
clubSchema.statics.findByCategory = function(category, options = {}) {
  const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;
  
  return this.find({ 
    category, 
    isActive: true 
  })
  .populate('coordinator', 'name email department')
  .populate('members.user', 'name email')
  .limit(limit)
  .skip(skip)
  .sort(sort);
};

// Static method to search clubs
clubSchema.statics.searchClubs = function(searchTerm, options = {}) {
  const { category, limit = 20, skip = 0 } = options;
  
  const searchQuery = {
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { shortDescription: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } },
    ],
  };

  if (category) {
    searchQuery.category = category;
  }

  return this.find(searchQuery)
    .populate('coordinator', 'name email department')
    .populate('members.user', 'name email')
    .limit(limit)
    .skip(skip)
    .sort({ name: 1 });
};

// Static method to get popular clubs
clubSchema.statics.getPopularClubs = function(limit = 10) {
  return this.find({ isActive: true })
    .populate('coordinator', 'name email department')
    .sort({ 
      'statistics.totalMembers': -1,
      'statistics.averageRating': -1,
      'statistics.totalEvents': -1 
    })
    .limit(limit);
};

// Static method to get club statistics
clubSchema.statics.getClubStats = async function() {
  const totalClubs = await this.countDocuments();
  const activeClubs = await this.countDocuments({ isActive: true });
  const verifiedClubs = await this.countDocuments({ isVerified: true });

  const categoryStats = await this.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalMembers: { $sum: '$statistics.totalMembers' },
        averageRating: { $avg: '$statistics.averageRating' },
      }
    },
    { $sort: { count: -1 } }
  ]);

  return {
    total: totalClubs,
    active: activeClubs,
    verified: verifiedClubs,
    byCategory: categoryStats,
  };
};

module.exports = mongoose.model('Club', clubSchema);