const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'Event reference is required'],
    index: true,
  },
  club: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Club',
    required: [true, 'Club reference is required'],
    index: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.anonymous;
    },
    validate: {
      validator: function(v) {
        // If anonymous is false, submittedBy must be provided
        if (!this.anonymous && !v) return false;
        return true;
      },
      message: 'Submitted by is required for non-anonymous feedback',
    },
  },
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number',
      },
    },
    organization: {
      type: Number,
      min: [1, 'Organization rating must be at least 1'],
      max: [5, 'Organization rating cannot exceed 5'],
      validate: {
        validator: function(v) {
          return v === undefined || Number.isInteger(v);
        },
        message: 'Organization rating must be a whole number',
      },
    },
    content: {
      type: Number,
      min: [1, 'Content rating must be at least 1'],
      max: [5, 'Content rating cannot exceed 5'],
      validate: {
        validator: function(v) {
          return v === undefined || Number.isInteger(v);
        },
        message: 'Content rating must be a whole number',
      },
    },
    venue: {
      type: Number,
      min: [1, 'Venue rating must be at least 1'],
      max: [5, 'Venue rating cannot exceed 5'],
      validate: {
        validator: function(v) {
          return v === undefined || Number.isInteger(v);
        },
        message: 'Venue rating must be a whole number',
      },
    },
    speakers: {
      type: Number,
      min: [1, 'Speakers rating must be at least 1'],
      max: [5, 'Speakers rating cannot exceed 5'],
      validate: {
        validator: function(v) {
          return v === undefined || Number.isInteger(v);
        },
        message: 'Speakers rating must be a whole number',
      },
    },
  },
  feedback: {
    whatWorkedWell: {
      type: String,
      required: [true, 'What worked well feedback is required'],
      trim: true,
      minlength: [10, 'Feedback must be at least 10 characters long'],
      maxlength: [2000, 'Feedback cannot exceed 2000 characters'],
    },
    improvements: {
      type: String,
      trim: true,
      maxlength: [2000, 'Improvement suggestions cannot exceed 2000 characters'],
    },
    additionalComments: {
      type: String,
      trim: true,
      maxlength: [1000, 'Additional comments cannot exceed 1000 characters'],
    },
  },
  suggestions: {
    futureTopics: [String],
    preferredFormat: {
      type: String,
      enum: ['workshop', 'seminar', 'hands-on', 'panel-discussion', 'networking', 'hybrid'],
    },
    preferredDuration: {
      type: String,
      enum: ['1-2 hours', '3-4 hours', 'half-day', 'full-day', 'multi-day'],
    },
    preferredTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'weekend'],
    },
    recommendToOthers: {
      type: Boolean,
    },
    likelyToAttendFuture: {
      type: String,
      enum: ['definitely', 'probably', 'maybe', 'probably-not', 'definitely-not'],
    },
  },
  anonymous: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['submitted', 'reviewed', 'responded', 'archived'],
    default: 'submitted',
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  moderationFlags: {
    inappropriate: {
      type: Boolean,
      default: false,
    },
    spam: {
      type: Boolean,
      default: false,
    },
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    flaggedAt: Date,
    flagReason: String,
  },
  response: {
    content: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: Date,
  },
  helpful: {
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  metadata: {
    submissionMethod: {
      type: String,
      enum: ['web', 'mobile', 'email', 'qr-code'],
      default: 'web',
    },
    deviceType: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile'],
    },
    browserInfo: String,
    ipAddress: String,
    location: {
      country: String,
      region: String,
      city: String,
    },
    timeSpent: {
      type: Number, // in seconds
      min: 0,
    },
  },
  sentiment: {
    score: {
      type: Number,
      min: -1,
      max: 1,
    },
    classification: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
    },
    analyzedAt: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for better performance
feedbackSchema.index({ event: 1, submittedBy: 1 }, { unique: true, sparse: true });
feedbackSchema.index({ club: 1, createdAt: -1 });
feedbackSchema.index({ 'rating.overall': -1 });
feedbackSchema.index({ anonymous: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ createdAt: -1 });

// Virtual for average rating
feedbackSchema.virtual('averageRating').get(function() {
  const ratings = [];
  if (this.rating.overall) ratings.push(this.rating.overall);
  if (this.rating.organization) ratings.push(this.rating.organization);
  if (this.rating.content) ratings.push(this.rating.content);
  if (this.rating.venue) ratings.push(this.rating.venue);
  if (this.rating.speakers) ratings.push(this.rating.speakers);
  
  if (ratings.length === 0) return 0;
  return +(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
});

// Virtual for feedback length
feedbackSchema.virtual('feedbackLength').get(function() {
  let totalLength = 0;
  if (this.feedback.whatWorkedWell) totalLength += this.feedback.whatWorkedWell.length;
  if (this.feedback.improvements) totalLength += this.feedback.improvements.length;
  if (this.feedback.additionalComments) totalLength += this.feedback.additionalComments.length;
  return totalLength;
});

// Virtual for is detailed feedback
feedbackSchema.virtual('isDetailed').get(function() {
  const hasMultipleRatings = Object.keys(this.rating).length > 1;
  const hasDetailedFeedback = this.feedbackLength > 100;
  const hasSuggestions = this.suggestions && Object.keys(this.suggestions).length > 0;
  
  return hasMultipleRatings && hasDetailedFeedback && hasSuggestions;
});

// Virtual for display name
feedbackSchema.virtual('displayName').get(function() {
  if (this.anonymous) {
    return 'Anonymous User';
  }
  return this.submittedBy ? this.submittedBy.name : 'Unknown User';
});

// Pre-save middleware to validate attendance
feedbackSchema.pre('save', async function(next) {
  if (this.isNew && this.submittedBy) {
    try {
      const Event = mongoose.model('Event');
      const event = await Event.findById(this.event);
      
      if (!event) {
        return next(new Error('Event not found'));
      }

      // Check if user attended the event
      const attended = event.attendedParticipants.some(
        participant => participant.user.toString() === this.submittedBy.toString()
      );

      if (!attended) {
        return next(new Error('Only attendees can provide feedback'));
      }

      // Set club from event if not provided
      if (!this.club) {
        this.club = event.club;
      }

      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-save middleware for sentiment analysis (placeholder)
feedbackSchema.pre('save', function(next) {
  if (this.isModified('feedback.whatWorkedWell') || this.isModified('feedback.improvements')) {
    // This is where you would integrate with a sentiment analysis service
    // For now, we'll do a simple keyword-based analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'best', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'poor', 'boring'];
    
    const feedbackText = `${this.feedback.whatWorkedWell || ''} ${this.feedback.improvements || ''}`.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveWords.forEach(word => {
      if (feedbackText.includes(word)) positiveCount++;
    });
    
    negativeWords.forEach(word => {
      if (feedbackText.includes(word)) negativeCount++;
    });
    
    let score = 0;
    let classification = 'neutral';
    
    if (positiveCount > negativeCount) {
      score = Math.min(1, positiveCount / 10);
      classification = 'positive';
    } else if (negativeCount > positiveCount) {
      score = Math.max(-1, -negativeCount / 10);
      classification = 'negative';
    }
    
    this.sentiment = {
      score,
      classification,
      confidence: Math.abs(score),
      analyzedAt: new Date(),
    };
  }
  
  next();
});

// Instance method to mark as helpful
feedbackSchema.methods.markAsHelpful = function(userId) {
  if (!this.helpful.users.includes(userId)) {
    this.helpful.users.push(userId);
    this.helpful.count = this.helpful.users.length;
  }
  return this.save();
};

// Instance method to unmark as helpful
feedbackSchema.methods.unmarkAsHelpful = function(userId) {
  const index = this.helpful.users.indexOf(userId);
  if (index > -1) {
    this.helpful.users.splice(index, 1);
    this.helpful.count = this.helpful.users.length;
  }
  return this.save();
};

// Instance method to respond to feedback
feedbackSchema.methods.respond = function(responseContent, respondedBy) {
  this.response = {
    content: responseContent,
    respondedBy,
    respondedAt: new Date(),
  };
  this.status = 'responded';
  return this.save();
};

// Instance method to flag as inappropriate
feedbackSchema.methods.flag = function(flaggedBy, reason) {
  this.moderationFlags = {
    inappropriate: true,
    flaggedBy,
    flaggedAt: new Date(),
    flagReason: reason,
  };
  return this.save();
};

// Static method to get feedback for an event
feedbackSchema.statics.getEventFeedback = function(eventId, options = {}) {
  const { includeAnonymous = true, limit = 50, skip = 0, sort = { createdAt: -1 } } = options;
  
  const query = { event: eventId };
  if (!includeAnonymous) {
    query.anonymous = false;
  }

  return this.find(query)
    .populate('submittedBy', 'name email', null, { match: { anonymous: false } })
    .populate('event', 'title eventDate')
    .populate('club', 'name')
    .limit(limit)
    .skip(skip)
    .sort(sort);
};

// Static method to get club feedback summary
feedbackSchema.statics.getClubFeedbackSummary = async function(clubId, options = {}) {
  const { dateRange, limit = 100 } = options;
  
  const matchQuery = { club: clubId };
  if (dateRange) {
    matchQuery.createdAt = {};
    if (dateRange.from) matchQuery.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) matchQuery.createdAt.$lte = new Date(dateRange.to);
  }

  const summary = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalFeedback: { $sum: 1 },
        averageOverallRating: { $avg: '$rating.overall' },
        averageOrganizationRating: { $avg: '$rating.organization' },
        averageContentRating: { $avg: '$rating.content' },
        averageVenueRating: { $avg: '$rating.venue' },
        averageSpeakersRating: { $avg: '$rating.speakers' },
        sentimentDistribution: {
          $push: '$sentiment.classification'
        },
        ratingDistribution: {
          $push: '$rating.overall'
        }
      }
    },
    {
      $addFields: {
        sentimentCounts: {
          positive: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                as: 'sentiment',
                cond: { $eq: ['$$sentiment', 'positive'] }
              }
            }
          },
          neutral: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                as: 'sentiment',
                cond: { $eq: ['$$sentiment', 'neutral'] }
              }
            }
          },
          negative: {
            $size: {
              $filter: {
                input: '$sentimentDistribution',
                as: 'sentiment',
                cond: { $eq: ['$$sentiment', 'negative'] }
              }
            }
          }
        },
        ratingCounts: {
          1: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                as: 'rating',
                cond: { $eq: ['$$rating', 1] }
              }
            }
          },
          2: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                as: 'rating',
                cond: { $eq: ['$$rating', 2] }
              }
            }
          },
          3: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                as: 'rating',
                cond: { $eq: ['$$rating', 3] }
              }
            }
          },
          4: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                as: 'rating',
                cond: { $eq: ['$$rating', 4] }
              }
            }
          },
          5: {
            $size: {
              $filter: {
                input: '$ratingDistribution',
                as: 'rating',
                cond: { $eq: ['$rating', 5] }
              }
            }
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalFeedback: 1,
        averageOverallRating: { $round: ['$averageOverallRating', 1] },
        averageOrganizationRating: { $round: ['$averageOrganizationRating', 1] },
        averageContentRating: { $round: ['$averageContentRating', 1] },
        averageVenueRating: { $round: ['$averageVenueRating', 1] },
        averageSpeakersRating: { $round: ['$averageSpeakersRating', 1] },
        sentimentCounts: 1,
        ratingCounts: 1
      }
    }
  ]);

  return summary[0] || {
    totalFeedback: 0,
    averageOverallRating: 0,
    averageOrganizationRating: 0,
    averageContentRating: 0,
    averageVenueRating: 0,
    averageSpeakersRating: 0,
    sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
};

// Static method to get trending feedback topics
feedbackSchema.statics.getTrendingTopics = async function(options = {}) {
  const { limit = 10, timeframe = 30 } = options;
  const fromDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

  // This would typically use a more sophisticated text analysis
  // For now, we'll extract common words from feedback
  const pipeline = [
    {
      $match: {
        createdAt: { $gte: fromDate },
        status: { $ne: 'archived' }
      }
    },
    {
      $project: {
        words: {
          $split: [
            {
              $toLower: {
                $concat: [
                  { $ifNull: ['$feedback.whatWorkedWell', ''] },
                  ' ',
                  { $ifNull: ['$feedback.improvements', ''] }
                ]
              }
            },
            ' '
          ]
        }
      }
    },
    { $unwind: '$words' },
    {
      $match: {
        words: { 
          $regex: /^[a-zA-Z]{4,}$/, // Words with at least 4 characters
          $nin: ['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'their', 'would', 'could', 'should']
        }
      }
    },
    {
      $group: {
        _id: '$words',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];

  return this.aggregate(pipeline);
};

// Static method to get feedback analytics
feedbackSchema.statics.getAnalytics = async function(options = {}) {
  const { timeframe = 30, groupBy = 'day' } = options;
  const fromDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

  const groupByFormat = {
    day: {
      $dateToString: {
        format: '%Y-%m-%d',
        date: '$createdAt'
      }
    },
    week: {
      $dateToString: {
        format: '%Y-W%U',
        date: '$createdAt'
      }
    },
    month: {
      $dateToString: {
        format: '%Y-%m',
        date: '$createdAt'
      }
    }
  };

  const analytics = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: fromDate }
      }
    },
    {
      $group: {
        _id: groupByFormat[groupBy],
        totalFeedback: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        positiveCount: {
          $sum: {
            $cond: [{ $eq: ['$sentiment.classification', 'positive'] }, 1, 0]
          }
        },
        neutralCount: {
          $sum: {
            $cond: [{ $eq: ['$sentiment.classification', 'neutral'] }, 1, 0]
          }
        },
        negativeCount: {
          $sum: {
            $cond: [{ $eq: ['$sentiment.classification', 'negative'] }, 1, 0]
          }
        },
        anonymousCount: {
          $sum: {
            $cond: ['$anonymous', 1, 0]
          }
        },
        detailedCount: {
          $sum: {
            $cond: [{ $gt: [{ $strLenCP: '$feedback.whatWorkedWell' }, 100] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return analytics;
};

// Static method to export feedback data
feedbackSchema.statics.exportFeedbackData = async function(filters = {}) {
  const { eventId, clubId, dateRange, includePersonalData = false } = filters;
  
  const query = {};
  if (eventId) query.event = eventId;
  if (clubId) query.club = clubId;
  if (dateRange) {
    query.createdAt = {};
    if (dateRange.from) query.createdAt.$gte = new Date(dateRange.from);
    if (dateRange.to) query.createdAt.$lte = new Date(dateRange.to);
  }

  const projection = {
    'rating.overall': 1,
    'rating.organization': 1,
    'rating.content': 1,
    'rating.venue': 1,
    'rating.speakers': 1,
    'feedback.whatWorkedWell': 1,
    'feedback.improvements': 1,
    'feedback.additionalComments': 1,
    'suggestions.futureTopics': 1,
    'suggestions.preferredFormat': 1,
    'suggestions.recommendToOthers': 1,
    'sentiment.classification': 1,
    'sentiment.score': 1,
    anonymous: 1,
    createdAt: 1
  };

  if (includePersonalData) {
    projection.submittedBy = 1;
  }

  return this.find(query, projection)
    .populate('event', 'title eventDate')
    .populate('club', 'name category')
    .populate(includePersonalData ? 'submittedBy' : '', 'name email')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Feedback', feedbackSchema);