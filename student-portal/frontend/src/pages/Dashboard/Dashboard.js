import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock,
  MapPin,
  ChevronRight,
  Star,
  Award,
  Plus,
  Bell,
  Activity,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import LoadingSpinner, { CardSkeleton } from '../../components/Common/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClubs: 0,
    joinedClubs: 0,
    upcomingEvents: 0,
    registeredEvents: 0,
    totalEvents: 0,
    completedEvents: 0
  });
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [myClubs, setMyClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch multiple endpoints concurrently
      const [eventsRes, userRes, clubsRes] = await Promise.all([
        axios.get('/api/events?upcoming=true'),
        axios.get('/api/auth/me'),
        axios.get('/api/clubs')
      ]);

      const events = eventsRes.data;
      const userData = userRes.data;
      const clubs = clubsRes.data;

      // Calculate statistics
      setStats({
        totalClubs: clubs.length,
        joinedClubs: userData.joinedClubs?.length || 0,
        upcomingEvents: events.filter(e => e.status === 'upcoming').length,
        registeredEvents: userData.eventsRegistered?.length || 0,
        totalEvents: events.length,
        completedEvents: events.filter(e => e.status === 'completed').length
      });

      // Set upcoming events (limit to 5)
      setUpcomingEvents(events.slice(0, 5));
      
      // Get user's joined clubs
      setMyClubs(userData.joinedClubs?.slice(0, 4) || []);
      
      // Create recent activities from user's registered events and clubs
      const eventActivities = userData.eventsRegistered?.slice(0, 3).map(item => ({
        id: item._id,
        type: 'event_registration',
        title: 'Registered for Event',
        description: item.event?.title || 'Event',
        date: item.registrationDate,
        icon: Calendar,
        color: 'text-blue-600 bg-blue-100'
      })) || [];

      const clubActivities = userData.joinedClubs?.slice(0, 2).map(item => ({
        id: item.club?._id || item._id,
        type: 'club_join',
        title: 'Joined Club',
        description: item.club?.name || item.name,
        date: item.joinedAt,
        icon: Users,
        color: 'text-green-600 bg-green-100'
      })) || [];

      // Combine and sort activities
      const allActivities = [...eventActivities, ...clubActivities]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
      
      setRecentActivities(allActivities);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventDateLabel = (eventDate) => {
    const date = parseISO(eventDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isThisWeek(date)) return format(date, 'EEEE');
    return format(date, 'MMM dd');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map(i => (
            <CardSkeleton key={i} className="h-24" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CardSkeleton className="h-80" />
          <CardSkeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {getGreeting()}, {user.name}! 👋
            </h1>
            <p className="text-gray-600">
              Here's what's happening in your clubs and events
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" />
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </div>
            <div className="text-sm text-gray-500">
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Clubs</p>
              <p className="text-3xl font-bold">{stats.totalClubs}</p>
              <p className="text-blue-200 text-sm">Available to join</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Users className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">My Clubs</p>
              <p className="text-3xl font-bold">{stats.joinedClubs}</p>
              <p className="text-green-200 text-sm">Currently member</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Star className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Upcoming Events</p>
              <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
              <p className="text-purple-200 text-sm">This month</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">My Events</p>
              <p className="text-3xl font-bold">{stats.registeredEvents}</p>
              <p className="text-orange-200 text-sm">Registered</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-lg">
              <Award className="w-8 h-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No upcoming events</p>
              <p className="text-gray-400 text-sm mt-1">Check back later for new events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => (
                <Link
                  key={event._id}
                  to={`/events/${event._id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {event.club?.name}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          <span className="font-medium text-blue-600">
                            {getEventDateLabel(event.eventDate)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {event.venue?.name || event.venue}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        event.eventType === 'workshop' ? 'bg-blue-100 text-blue-800' :
                        event.eventType === 'competition' ? 'bg-red-100 text-red-800' :
                        event.eventType === 'seminar' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.eventType}
                      </span>
                    </div>
                  </div>
                  {index < upcomingEvents.length - 1 && (
                    <div className="border-b border-gray-50 mt-4"></div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-green-600" />
              Recent Activities
            </h2>
            <Link
              to="/profile"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View profile <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No recent activities</p>
              <p className="text-sm text-gray-400 mt-1">
                Join clubs and register for events to see your activities here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${activity.color}`}>
                    <activity.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(parseISO(activity.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  {index < recentActivities.length - 1 && (
                    <div className="border-b border-gray-50 absolute left-6 right-6 mt-16"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* My Clubs Section */}
      {myClubs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-600" />
              My Clubs
            </h2>
            <Link
              to="/clubs"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
            >
              View all <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {myClubs.map((clubItem) => {
              const club = clubItem.club || clubItem;
              return (
                <Link
                  key={club._id}
                  to={`/clubs/${club._id}`}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                      {club.name}
                    </h3>
                    <p className="text-xs text-gray-500 capitalize">
                      {club.category}
                    </p>
                    <div className="mt-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Member
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Zap className="w-6 h-6 mr-2" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/clubs"
            className="flex items-center p-6 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-colors group"
          >
            <Users className="w-10 h-10 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="font-semibold text-lg">Explore Clubs</h3>
              <p className="text-sm opacity-90">Discover new clubs to join</p>
            </div>
          </Link>
          
          <Link
            to="/events"
            className="flex items-center p-6 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-colors group"
          >
            <Calendar className="w-10 h-10 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="font-semibold text-lg">Browse Events</h3>
              <p className="text-sm opacity-90">Find events to participate in</p>
            </div>
          </Link>
          
          <Link
            to="/profile"
            className="flex items-center p-6 bg-white bg-opacity-20 rounded-xl hover:bg-opacity-30 transition-colors group"
          >
            <Target className="w-10 h-10 mr-4 group-hover:scale-110 transition-transform" />
            <div>
              <h3 className="font-semibold text-lg">My Profile</h3>
              <p className="text-sm opacity-90">View your activities and progress</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;