import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Phone, 
  Calendar,
  MapPin,
  Star,
  UserPlus,
  UserMinus,
  Settings,
  Award,
  Clock,
  Globe,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  ExternalLink,
  Trophy,
  Target,
  BookOpen,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Video,
  Link as LinkIcon,
  ChevronRight,
  Eye,
  ThumbsUp
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isThisWeek } from 'date-fns';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const ClubDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [clubEvents, setClubEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  const tabs = [
    { id: 'about', label: 'About', icon: BookOpen },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'resources', label: 'Resources', icon: FileText },
  ];

  useEffect(() => {
    if (id) {
      fetchClubDetails();
      fetchClubEvents();
    }
  }, [id]);

  const fetchClubDetails = async () => {
    try {
      const response = await axios.get(`/api/clubs/${id}`);
      setClub(response.data);
    } catch (error) {
      console.error('Error fetching club details:', error);
      toast.error('Failed to load club details');
      navigate('/clubs');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubEvents = async () => {
    try {
      const response = await axios.get(`/api/events?club=${id}`);
      setClubEvents(response.data);
    } catch (error) {
      console.error('Error fetching club events:', error);
    }
  };

  const handleJoinLeave = async () => {
    if (!club) return;

    setJoinLoading(true);
    try {
      const isMember = club.members.some(member => member.user._id === user._id && member.isActive);
      const endpoint = isMember ? 'leave' : 'join';
      
      await axios.post(`/api/clubs/${club._id}/${endpoint}`);
      
      toast.success(isMember ? 'Left club successfully' : 'Joined club successfully');
      fetchClubDetails(); // Refresh club data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setJoinLoading(false);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      technical: '💻',
      cultural: '🎭',
      sports: '⚽',
      academic: '📚',
      social: '🤝',
      arts: '🎨',
      music: '🎵',
      dance: '💃',
      drama: '🎪',
      photography: '📸',
      literature: '📖',
      debate: '🗣️',
      entrepreneurship: '💼',
      volunteer: '❤️',
      environmental: '🌱'
    };
    return icons[category] || '🏛️';
  };

  const getCategoryColor = (category) => {
    const colors = {
      technical: 'bg-blue-100 text-blue-800',
      cultural: 'bg-purple-100 text-purple-800',
      sports: 'bg-green-100 text-green-800',
      academic: 'bg-yellow-100 text-yellow-800',
      social: 'bg-pink-100 text-pink-800',
      arts: 'bg-indigo-100 text-indigo-800',
      music: 'bg-red-100 text-red-800',
      dance: 'bg-orange-100 text-orange-800',
      drama: 'bg-cyan-100 text-cyan-800',
      photography: 'bg-gray-100 text-gray-800',
      literature: 'bg-teal-100 text-teal-800',
      debate: 'bg-amber-100 text-amber-800',
      entrepreneurship: 'bg-emerald-100 text-emerald-800',
      volunteer: 'bg-rose-100 text-rose-800',
      environmental: 'bg-lime-100 text-lime-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getEventDateLabel = (eventDate) => {
    const date = new Date(eventDate);
    if (isPast(date)) return 'Past';
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM dd');
  };

  const getResourceIcon = (type) => {
    const icons = {
      document: FileText,
      link: LinkIcon,
      video: Video,
      image: ImageIcon,
      presentation: FileText,
    };
    return icons[type] || FileText;
  };

  const getSocialIcon = (platform) => {
    const icons = {
      facebook: Facebook,
      instagram: Instagram,
      twitter: Twitter,
      linkedin: Linkedin,
      youtube: Youtube,
    };
    return icons[platform] || ExternalLink;
  };

  const isUserMember = () => {
    return club?.members.some(member => member.user._id === user._id && member.isActive);
  };

  const getUserRole = () => {
    if (!club) return null;
    if (club.coordinator._id === user._id) return 'coordinator';
    const member = club.members.find(member => member.user._id === user._id && member.isActive);
    return member?.role || null;
  };

  const canManageClub = () => {
    const userRole = getUserRole();
    return userRole === 'coordinator' || user.role === 'admin';
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading club details..." />;
  }

  if (!club) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Club not found</h2>
        <Link
          to="/clubs"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Back to Clubs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/clubs')}
          className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Club Details</h1>
          <p className="text-gray-600">Discover more about this club</p>
        </div>
      </div>

      {/* Club Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start space-x-6 mb-6 lg:mb-0">
            {/* Club Logo/Icon */}
            <div className="flex-shrink-0">
              {club.images?.logo ? (
                <img
                  src={club.images.logo}
                  alt={club.name}
                  className="w-20 h-20 rounded-xl object-cover"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl">
                  {getCategoryIcon(club.category)}
                </div>
              )}
            </div>

            {/* Club Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <h2 className="text-3xl font-bold text-gray-900">{club.name}</h2>
                {isUserMember() && (
                  <Star className="w-6 h-6 text-yellow-500 fill-current" />
                )}
                {club.isVerified && (
                  <Award className="w-6 h-6 text-blue-500" title="Verified Club" />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(club.category)}`}>
                  {club.category.charAt(0).toUpperCase() + club.category.slice(1)}
                </span>
                <span className="text-gray-600 text-sm">
                  {club.members.filter(m => m.isActive).length} members
                </span>
                <span className="text-gray-600 text-sm">
                  {clubEvents.length} events
                </span>
                <span className="text-gray-600 text-sm">
                  Est. {format(new Date(club.establishedAt), 'MMM yyyy')}
                </span>
              </div>

              <p className="text-gray-700 leading-relaxed mb-4">{club.shortDescription}</p>

              {/* Tags */}
              {club.tags && club.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {club.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3">
            <button
              onClick={handleJoinLeave}
              disabled={joinLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[140px] ${
                isUserMember()
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {joinLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : isUserMember() ? (
                <UserMinus className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {joinLoading ? 'Processing...' : isUserMember() ? 'Leave Club' : 'Join Club'}
            </button>

            {canManageClub() && (
              <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Club</h3>
                <div className="prose max-w-none text-gray-700">
                  <p className="leading-relaxed">{club.description}</p>
                </div>
              </div>

              {/* Requirements */}
              {club.requirements && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Eligibility</h4>
                        <p className="text-blue-800 text-sm">{club.requirements.eligibility}</p>
                      </div>
                      {club.requirements.skills && club.requirements.skills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-blue-900 mb-2">Skills</h4>
                          <div className="flex flex-wrap gap-1">
                            {club.requirements.skills.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Meeting Schedule */}
              {club.meetingSchedule && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Schedule</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Frequency</p>
                          <p className="text-gray-600 text-sm capitalize">{club.meetingSchedule.frequency}</p>
                        </div>
                      </div>
                      {club.meetingSchedule.dayOfWeek && (
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Day</p>
                            <p className="text-gray-600 text-sm capitalize">{club.meetingSchedule.dayOfWeek}</p>
                          </div>
                        </div>
                      )}
                      {club.meetingSchedule.time && (
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Time</p>
                            <p className="text-gray-600 text-sm">{club.meetingSchedule.time}</p>
                          </div>
                        </div>
                      )}
                      {club.meetingSchedule.location && (
                        <div className="flex items-center space-x-3">
                          <MapPin className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">Location</p>
                            <p className="text-gray-600 text-sm">{club.meetingSchedule.location}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Coordinator</h4>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {club.coordinator.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{club.coordinator.name}</p>
                        <p className="text-gray-600 text-sm">{club.coordinator.department}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-700 mb-3">Contact Details</h4>
                    <div className="space-y-2">
                      <a 
                        href={`mailto:${club.contactInfo.email}`}
                        className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {club.contactInfo.email}
                      </a>
                      {club.contactInfo.phone && (
                        <a 
                          href={`tel:${club.contactInfo.phone}`}
                          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          {club.contactInfo.phone}
                        </a>
                      )}
                      {club.contactInfo.website && (
                        <a 
                          href={club.contactInfo.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                {club.contactInfo.socialLinks && Object.keys(club.contactInfo.socialLinks).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Social Media</h4>
                    <div className="flex space-x-3">
                      {Object.entries(club.contactInfo.socialLinks).map(([platform, url]) => {
                        if (!url) return null;
                        const Icon = getSocialIcon(platform);
                        return (
                          <a
                            key={platform}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                            title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                          >
                            <Icon className="w-5 h-5" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Club Events</h3>
                {canManageClub() && (
                  <Link
                    to="/admin"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Link>
                )}
              </div>

              {clubEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No events yet</h4>
                  <p className="text-gray-600">Events organized by this club will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {clubEvents.map((event) => (
                    <Link
                      key={event._id}
                      to={`/events/${event._id}`}
                      className="block p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 text-lg">{event.title}</h4>
                            <span className="text-sm font-medium text-blue-600">
                              {getEventDateLabel(event.eventDate)}
                            </span>
                          </div>
                          <p className="text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                          <div className="flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(event.eventDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {event.startTime}
                            </div>
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {event.venue.name}
                            </div>
                            <div className="flex items-center">
                              <Users className="w-4 h-4 mr-1" />
                              {event.registeredParticipants.length} registered
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
                            event.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                            event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.status}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            event.eventType === 'workshop' ? 'bg-blue-100 text-blue-800' :
                            event.eventType === 'competition' ? 'bg-red-100 text-red-800' :
                            event.eventType === 'seminar' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.eventType}
                          </span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Club Members ({club.members.filter(m => m.isActive).length})
                </h3>
              </div>

              <div className="space-y-4">
                {club.members
                  .filter(member => member.isActive)
                  .sort((a, b) => {
                    const roleOrder = { coordinator: 0, leader: 1, member: 2 };
                    return roleOrder[a.role] - roleOrder[b.role];
                  })
                  .map((member) => (
                    <div key={member.user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{member.user.name}</h4>
                          <p className="text-gray-600 text-sm">{member.user.email}</p>
                          {member.user.department && (
                            <p className="text-gray-500 text-xs">{member.user.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          member.role === 'coordinator' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'leader' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.role === 'coordinator' ? 'Coordinator' : 
                           member.role === 'leader' ? 'Leader' : 'Member'}
                        </span>
                        <span className="text-gray-500 text-xs">
                          Joined {format(new Date(member.joinedAt), 'MMM yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Achievements & Awards</h3>
              
              {club.achievements && club.achievements.length > 0 ? (
                <div className="space-y-6">
                  {club.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                      <div className="p-2 bg-yellow-500 rounded-full">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{achievement.title}</h4>
                        <p className="text-gray-700 mb-2">{achievement.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{format(new Date(achievement.date), 'MMM dd, yyyy')}</span>
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium capitalize">
                            {achievement.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No achievements yet</h4>
                  <p className="text-gray-600">Club achievements and awards will appear here</p>
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Resources & Materials</h3>
              
              {club.resources && club.resources.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {club.resources
                    .filter(resource => resource.isPublic || isUserMember())
                    .map((resource, index) => {
                      const Icon = getResourceIcon(resource.type);
                      return (
                        <a
                          key={index}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                        >
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Icon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{resource.title}</h4>
                            {resource.description && (
                              <p className="text-gray-600 text-sm mb-2">{resource.description}</p>
                            )}
                            <div className="flex items-center space-x-3 text-xs text-gray-500">
                              <span className="capitalize">{resource.type}</span>
                              {resource.uploadedAt && (
                                <span>Added {format(new Date(resource.uploadedAt), 'MMM dd, yyyy')}</span>
                              )}
                              {!resource.isPublic && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                                  Members Only
                                </span>
                              )}
                            </div>
                            {resource.tags && resource.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {resource.tags.map((tag, tagIndex) => (
                                  <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No resources available</h4>
                  <p className="text-gray-600">Club resources and materials will appear here</p>
                </div>
              )}

              {/* Announcements */}
              {club.announcements && club.announcements.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Announcements</h4>
                  <div className="space-y-4">
                    {club.announcements
                      .filter(announcement => announcement.isActive)
                      .slice(0, 3)
                      .map((announcement, index) => (
                        <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                                <h5 className="font-medium text-blue-900">{announcement.title}</h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  announcement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  announcement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {announcement.priority}
                                </span>
                              </div>
                              <p className="text-blue-800 text-sm">{announcement.content}</p>
                              <p className="text-blue-600 text-xs mt-2">
                                {format(new Date(announcement.createdAt), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{club.statistics?.totalMembers || club.members.filter(m => m.isActive).length}</div>
          <div className="text-gray-600 text-sm">Total Members</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{club.statistics?.totalEvents || clubEvents.length}</div>
          <div className="text-gray-600 text-sm">Events Organized</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{Math.round(club.statistics?.averageAttendance) || 0}%</div>
          <div className="text-gray-600 text-sm">Avg Attendance</div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <Star className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900">{club.statistics?.averageRating?.toFixed(1) || '0.0'}</div>
          <div className="text-gray-600 text-sm">Average Rating</div>
        </div>
      </div>

      {/* Quick Actions for Members */}
      {isUserMember() && (
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Member Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={`/events?club=${club._id}`}
              className="flex items-center p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <Calendar className="w-6 h-6 mr-3" />
              <div>
                <div className="font-medium">View Events</div>
                <div className="text-sm opacity-90">See upcoming events</div>
              </div>
            </Link>
            <Link
              to="/profile"
              className="flex items-center p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
            >
              <User className="w-6 h-6 mr-3" />
              <div>
                <div className="font-medium">My Profile</div>
                <div className="text-sm opacity-90">Manage your info</div>
              </div>
            </Link>
            <button className="flex items-center p-3 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
              <MessageSquare className="w-6 h-6 mr-3" />
              <div>
                <div className="font-medium">Contact</div>
                <div className="text-sm opacity-90">Get in touch</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubDetail;