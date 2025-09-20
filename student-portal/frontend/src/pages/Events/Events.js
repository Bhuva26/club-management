import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Clock,
  Users,
  Plus,
  Star,
  Award,
  ChevronRight,
  UserCheck,
  Grid,
  List,
  TrendingUp,
  Eye,
  // BookmarkCheck removed, use Bookmark instead
  Bookmark
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import { CardSkeleton } from '../../components/Common/LoadingSpinner';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const { user } = useAuth();

  // Check if current user is registered for an event
  const isUserRegistered = (event) => {
    if (!user) return false;
    return event.registeredParticipants?.some(participant => 
      participant.user._id === user._id || participant.user === user._id
    );
  };

  const statusOptions = [
    { value: '', label: 'All Events' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Seminar' },
    { value: 'competition', label: 'Competition' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'cultural', label: 'Cultural' },
    { value: 'sports', label: 'Sports' },
    { value: 'conference', label: 'Conference' },
    { value: 'hackathon', label: 'Hackathon' }
  ];

  const dateFilterOptions = [
    { value: '', label: 'Any Date' },
    { value: 'today', label: 'Today' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Event Date' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'newest', label: 'Recently Added' }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const filterEvents = React.useCallback(() => {
    let filtered = events;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.club?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(event => event.status === selectedStatus);
    }

    // Type filter
    if (selectedType) {
      filtered = filtered.filter(event => event.eventType === selectedType);
    }

    // Date filter
    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter(event => {
        const eventDate = parseISO(event.eventDate);
        switch (dateFilter) {
          case 'today':
            return isToday(eventDate);
          case 'tomorrow':
            return isTomorrow(eventDate);
          case 'week':
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return eventDate >= now && eventDate <= weekFromNow;
          case 'month':
            const monthFromNow = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            return eventDate >= now && eventDate <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'popular':
          return (b.registeredParticipants?.length || 0) - (a.registeredParticipants?.length || 0);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date':
        default:
          return new Date(a.eventDate) - new Date(b.eventDate);
      }
    });

    setFilteredEvents(filtered);
  }, [events, searchTerm, selectedStatus, selectedType, dateFilter, sortBy]);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, selectedStatus, selectedType, dateFilter, sortBy, filterEvents]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      // Ensure events is always an array
      setEvents(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };


  // getEventDateLabel removed (unused)
  // getStatusColor removed (unused)
  // getTypeColor removed (unused)

  const handleQuickRegister = async (eventId) => {
    try {
      await axios.post(`/api/events/${eventId}/register`);
      toast.success('Successfully registered for the event!');
      fetchEvents(); // Refresh events
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Always use an array for events in render

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
          <p className="text-gray-600">Discover and participate in exciting events</p>
        </div>
        
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Link
            to="/admin"
            className="mt-4 lg:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              {dateFilterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'} transition-colors`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{events.length}</div>
          <div className="text-sm text-gray-600">Total Events</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {events.filter(e => e.status === 'upcoming').length}
          </div>
          <div className="text-sm text-gray-600">Upcoming</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {events.filter(e => isUserRegistered(e)).length}
          </div>
          <div className="text-sm text-gray-600">My Events</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {events.filter(e => e.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
      </div>

      {/* Results */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedStatus || selectedType || dateFilter
              ? 'Try adjusting your search or filter criteria' 
              : 'There are no events available at the moment'
            }
          </p>
          {(searchTerm || selectedStatus || selectedType || dateFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setSelectedType('');
                setDateFilter('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing {filteredEvents.length} of {events.length} events
            </p>
          </div>

          {/* Events Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event._id} event={event} user={user} onQuickRegister={handleQuickRegister} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredEvents.map((event) => (
                <EventListItem key={event._id} event={event} user={user} onQuickRegister={handleQuickRegister} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Event Card Component for Grid View
const EventCard = ({ event, user, onQuickRegister }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const isUserRegistered = () => {
    return event.registeredParticipants?.some(participant => 
      participant.user._id === user._id || participant.user === user._id
    );
  };

  const canRegister = () => {
    return event.status === 'upcoming' && !isUserRegistered() && 
           (!event.maxParticipants || event.registeredParticipants?.length < event.maxParticipants);
  };

  const getEventDateLabel = (eventDate) => {
    const date = parseISO(eventDate);
    if (isPast(date)) return 'Past';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'workshop': 'bg-blue-100 text-blue-800',
      'seminar': 'bg-green-100 text-green-800',
      'competition': 'bg-red-100 text-red-800',
      'meeting': 'bg-yellow-100 text-yellow-800',
      'cultural': 'bg-purple-100 text-purple-800',
      'sports': 'bg-orange-100 text-orange-800',
      'conference': 'bg-indigo-100 text-indigo-800',
      'hackathon': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Event Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors line-clamp-1">
                {event.title}
              </h3>
              {isUserRegistered() && (
                <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                {event.status}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.eventType)}`}>
                {event.eventType}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isBookmarked ? (
              <Bookmark className="w-5 h-5 text-blue-600" />
            ) : (
              <Bookmark className="w-5 h-5 text-gray-400 hover:text-blue-600" />
            )}
          </button>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.shortDescription || event.description}
        </p>

        <div className="space-y-2 text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{format(parseISO(event.eventDate), 'EEEE, MMM dd, yyyy')}</span>
            <span className="ml-2 text-xs font-medium text-blue-600">
              {getEventDateLabel(event.eventDate)}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>{event.startTime} - {event.endTime}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="truncate">{event.venue?.name || event.venue}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>
              {event.registeredParticipants?.length || 0}
              {event.maxParticipants > 0 && `/${event.maxParticipants}`} registered
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-gray-600 font-medium">{event.club?.name}</span>
          <div className="flex items-center text-gray-500">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>{event.statistics?.averageRating || 0}/5</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6">
        <div className="flex space-x-3">
          {canRegister() && (
            <button
              onClick={() => onQuickRegister(event._id)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm font-medium"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Register
            </button>
          )}
          
          {isUserRegistered() && (
            <div className="flex-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center text-sm font-medium">
              <UserCheck className="w-4 h-4 mr-2" />
              Registered
            </div>
          )}
          
          {(!canRegister() && !isUserRegistered() && event.status === 'upcoming') && (
            <div className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center text-sm font-medium">
              {event.maxParticipants > 0 && event.registeredParticipants?.length >= event.maxParticipants ? 'Full' : 'Registration Closed'}
            </div>
          )}

          <Link
            to={`/events/${event._id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center text-sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};

// Event List Item Component for List View
const EventListItem = ({ event, user, onQuickRegister }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const isUserRegistered = () => {
    return event.registeredParticipants?.some(participant => 
      participant.user._id === user._id || participant.user === user._id
    );
  };

  const canRegister = () => {
    return event.status === 'upcoming' && !isUserRegistered() && 
           (!event.maxParticipants || event.registeredParticipants?.length < event.maxParticipants);
  };

  const getEventDateLabel = (eventDate) => {
    const date = parseISO(eventDate);
    if (isPast(date)) return 'Past';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-green-100 text-green-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'workshop': 'bg-blue-100 text-blue-800',
      'seminar': 'bg-green-100 text-green-800',
      'competition': 'bg-red-100 text-red-800',
      'meeting': 'bg-yellow-100 text-yellow-800',
      'cultural': 'bg-purple-100 text-purple-800',
      'sports': 'bg-orange-100 text-orange-800',
      'conference': 'bg-indigo-100 text-indigo-800',
      'hackathon': 'bg-pink-100 text-pink-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
            {isUserRegistered() && (
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
              {event.status}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.eventType)}`}>
              {event.eventType}
            </span>
          </div>
          
          <p className="text-gray-600 mb-4 line-clamp-2">
            {event.shortDescription || event.description}
          </p>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              <div>
                <div>{format(parseISO(event.eventDate), 'MMM dd, yyyy')}</div>
                <div className="text-xs text-blue-600 font-medium">{getEventDateLabel(event.eventDate)}</div>
              </div>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <div>
                <div>{event.startTime} - {event.endTime}</div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              <div>
                <div className="truncate">{event.venue?.name || event.venue}</div>
                <div className="text-xs text-gray-400">Venue</div>
              </div>
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-2" />
              <div>
                <div>{event.registeredParticipants?.length || 0}{event.maxParticipants > 0 && `/${event.maxParticipants}`}</div>
                <div className="text-xs text-gray-400">Registered</div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className="font-medium">{event.club?.name}</span>
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-1" />
              <span>{event.statistics?.averageRating || 0}/5 rating</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 ml-6">
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {isBookmarked ? (
              <Bookmark className="w-5 h-5 text-blue-600" />
            ) : (
              <Bookmark className="w-5 h-5 text-gray-400 hover:text-blue-600" />
            )}
          </button>

          {canRegister() && (
            <button
              onClick={() => onQuickRegister(event._id)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center text-sm font-medium"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Register
            </button>
          )}
          
          {isUserRegistered() && (
            <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg flex items-center text-sm font-medium">
              <UserCheck className="w-4 h-4 mr-2" />
              Registered
            </div>
          )}
          
          <Link
            to={`/events/${event._id}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center text-sm"
          >
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Events;