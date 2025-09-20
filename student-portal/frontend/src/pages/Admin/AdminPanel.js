import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { 
  Users, 
  Calendar, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  UserCheck,
  BarChart3,
  TrendingUp,
  Award,
  Building,
  Save,
  X,
  Download,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [clubs, setClubs] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [stats, setStats] = useState({});
  
  // Modal states
  const [showClubModal, setShowClubModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Form states
  const [clubForm, setClubForm] = useState({
    name: '',
    description: '',
    category: 'technical',
    coordinator: '',
    contactEmail: '',
    contactPhone: '',
    meetingSchedule: ''
  });
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    club: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    venue: '',
    maxParticipants: '',
    registrationDeadline: '',
    eventType: 'workshop',
    requirements: '',
    prizes: ''
  });

  // Selected items for operations
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const categories = ['technical', 'cultural', 'sports', 'academic', 'social'];
  const eventTypes = ['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports'];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [clubsRes, eventsRes, usersRes, teachersRes] = await Promise.all([
        axios.get('/api/clubs'),
        axios.get('/api/events'),
        axios.get('/api/users'),
        axios.get('/api/users/teachers')
      ]);

      setClubs(Array.isArray(clubsRes.data) ? clubsRes.data : []);
      setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
  setTeachers(Array.isArray(teachersRes.data?.teachers) ? teachersRes.data.teachers : []);

      // Calculate stats
      const clubsArr = Array.isArray(clubsRes.data) ? clubsRes.data : [];
      const eventsArr = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      const usersArr = Array.isArray(usersRes.data) ? usersRes.data : [];
      const statsData = {
        totalClubs: clubsArr.length,
        totalEvents: eventsArr.length,
        totalUsers: usersArr.length,
        activeClubs: clubsArr.filter(c => c.isActive).length,
        upcomingEvents: eventsArr.filter(e => e.status === 'upcoming').length,
        completedEvents: eventsArr.filter(e => e.status === 'completed').length,
        studentCount: usersArr.filter(u => u.role === 'student').length,
        teacherCount: usersArr.filter(u => u.role === 'teacher').length,
        adminCount: usersArr.filter(u => u.role === 'admin').length,
      };
      setStats(statsData);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e) => {
    e.preventDefault();
    // Frontend validation
    const errors = [];
    if (!clubForm.name || clubForm.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }
    if (!clubForm.description || clubForm.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    const validCategories = ['technical', 'cultural', 'sports', 'academic', 'social'];
    if (!validCategories.includes(clubForm.category)) {
      errors.push('Invalid category');
    }
    if (!clubForm.contactEmail || !/^\S+@\S+\.\S+$/.test(clubForm.contactEmail)) {
      errors.push('Please enter a valid email');
    }
    if (!clubForm.coordinator || clubForm.coordinator.length !== 24) {
      errors.push('Coordinator must be selected');
    }
    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }
    try {
      await axios.post('/api/clubs', clubForm);
      toast.success('Club created successfully!');
      setShowClubModal(false);
      resetClubForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create club');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/events', eventForm);
      toast.success('Event created successfully!');
      setShowEventModal(false);
      resetEventForm();
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create event');
    }
  };

  const handleMarkAttendance = async () => {
    try {
      await axios.post('/api/attendance/mark', {
        eventId: selectedEvent._id,
        participants: attendanceList
      });
      toast.success('Attendance marked successfully!');
      setShowAttendanceModal(false);
      setSelectedEvent(null);
      setAttendanceList([]);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/users/${userId}`);
        toast.success('User deleted successfully!');
        fetchAllData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleDeleteClub = async (clubId) => {
    if (window.confirm('Are you sure you want to delete this club?')) {
      try {
        await axios.delete(`/api/clubs/${clubId}`);
        toast.success('Club deleted successfully!');
        fetchAllData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete club');
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`/api/events/${eventId}`);
        toast.success('Event deleted successfully!');
        fetchAllData();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete event');
      }
    }
  };

  const openAttendanceModal = (event) => {
    setSelectedEvent(event);
    setAttendanceList([]);
    setShowAttendanceModal(true);
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const toggleAttendance = (participantId) => {
    setAttendanceList(prev => 
      prev.includes(participantId) 
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const resetClubForm = () => {
    setClubForm({
      name: '',
      description: '',
      category: 'technical',
      coordinator: '',
      contactEmail: '',
      contactPhone: '',
      meetingSchedule: ''
    });
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      club: '',
      eventDate: '',
      startTime: '',
      endTime: '',
      venue: '',
      maxParticipants: '',
      registrationDeadline: '',
      eventType: 'workshop',
      requirements: '',
      prizes: ''
    });
  };

  const filteredUsers = (Array.isArray(users) ? users : []).filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'active' && club.isActive) ||
                         (filterStatus === 'inactive' && !club.isActive);
    return matchesSearch && matchesStatus;
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || event.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage clubs, events, and users across the platform</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: BarChart3 },
            { id: 'clubs', name: 'Clubs', icon: Users },
            { id: 'events', name: 'Events', icon: Calendar },
            { id: 'users', name: 'Users', icon: Settings },
            { id: 'analytics', name: 'Analytics', icon: TrendingUp }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  <p className="text-sm text-blue-600">{stats.studentCount} students</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Clubs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClubs}</p>
                  <p className="text-sm text-green-600">{stats.activeClubs} active</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Building className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
                  <p className="text-sm text-purple-600">{stats.upcomingEvents} upcoming</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Events</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedEvents}</p>
                  <p className="text-sm text-orange-600">All time</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Award className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.club?.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
                      event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Club Distribution</h3>
              <div className="space-y-4">
                {categories.map(category => {
                  const count = clubs.filter(club => club.category === category).length;
                  const percentage = stats.totalClubs > 0 ? (count / stats.totalClubs) * 100 : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                        <span className="text-sm text-gray-500">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowClubModal(true)}
                className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Plus className="w-6 h-6 mr-3" />
                <span>Create Club</span>
              </button>
              <button
                onClick={() => setShowEventModal(true)}
                className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Calendar className="w-6 h-6 mr-3" />
                <span>Create Event</span>
              </button>
              <button
                className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
              >
                <Download className="w-6 h-6 mr-3" />
                <span>Export Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clubs Tab */}
      {activeTab === 'clubs' && (
        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Manage Clubs</h2>
            <button
              onClick={() => setShowClubModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Club
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search clubs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clubs Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinator
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClubs.map((club) => (
                    <tr key={club._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{club.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{club.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                          {club.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {club.coordinator?.name || 'Not assigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {club.members?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          club.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {club.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900 p-1"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClub(club._id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Header with Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Manage Events</h2>
            <button
              onClick={() => setShowEventModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </button>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredEvents.map((event) => (
                    <tr key={event._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500 capitalize">{event.eventType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.club?.name || 'No club'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(event.eventDate), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.registeredParticipants?.length || 0}
                        {event.maxParticipants > 0 && `/${event.maxParticipants}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
                          event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                          event.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {(user.role === 'teacher' || user.role === 'admin') && event.status === 'completed' && (
                            <button
                              onClick={() => openAttendanceModal(event)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Mark Attendance"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteEvent(event._id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
          
          {/* Search and Filter */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clubs
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'teacher' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.joinedClubs?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => openUserModal(user)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-900 p-1"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user._id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-gray-900">Analytics & Reports</h2>
          
          {/* User Analytics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.studentCount}</div>
                <div className="text-sm text-blue-800">Students</div>
                <div className="text-xs text-blue-600 mt-1">
                  {stats.totalUsers > 0 ? Math.round((stats.studentCount / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.teacherCount}</div>
                <div className="text-sm text-yellow-800">Teachers</div>
                <div className="text-xs text-yellow-600 mt-1">
                  {stats.totalUsers > 0 ? Math.round((stats.teacherCount / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.adminCount}</div>
                <div className="text-sm text-red-800">Admins</div>
                <div className="text-xs text-red-600 mt-1">
                  {stats.totalUsers > 0 ? Math.round((stats.adminCount / stats.totalUsers) * 100) : 0}% of total
                </div>
              </div>
            </div>
          </div>

          {/* Event Analytics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Events by Type</h4>
                <div className="space-y-3">
                  {eventTypes.map(type => {
                    const count = events.filter(event => event.eventType === type).length;
                    const percentage = stats.totalEvents > 0 ? (count / stats.totalEvents) * 100 : 0;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span>{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Event Status</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-green-800 font-medium">Upcoming</span>
                    <span className="text-green-600 font-bold">{stats.upcomingEvents}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-800 font-medium">Completed</span>
                    <span className="text-gray-600 font-bold">{stats.completedEvents}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-blue-800 font-medium">Total Events</span>
                    <span className="text-blue-600 font-bold">{stats.totalEvents}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">{stats.totalUsers}</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <Building className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">{stats.activeClubs}</div>
                <div className="text-sm text-gray-600">Active Clubs</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">{stats.upcomingEvents}</div>
                <div className="text-sm text-gray-600">Upcoming Events</div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg text-center">
                <Award className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-lg font-bold text-gray-900">{stats.completedEvents}</div>
                <div className="text-sm text-gray-600">Completed Events</div>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5 mr-2" />
                Export Users
              </button>
              <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5 mr-2" />
                Export Clubs
              </button>
              <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-5 h-5 mr-2" />
                Export Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Club Modal */}
      {showClubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Club</h3>
            <form onSubmit={handleCreateClub} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  {console.log('Users for coordinator dropdown:', users)}
                    Club Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clubForm.name}
                    onChange={(e) => setClubForm({...clubForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter club name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={clubForm.category}
                    onChange={(e) => setClubForm({...clubForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat} className="capitalize">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={clubForm.description}
                  onChange={(e) => setClubForm({...clubForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the club's purpose and activities"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coordinator *
                  </label>
                  <select
                    required
                    value={clubForm.coordinator}
                    onChange={(e) => setClubForm({...clubForm, coordinator: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Coordinator</option>
                    {users.filter(u => u.role === 'teacher' || u.role === 'admin').map(user => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={clubForm.contactEmail}
                    onChange={(e) => setClubForm({...clubForm, contactEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="club@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={clubForm.contactPhone}
                    onChange={(e) => setClubForm({...clubForm, contactPhone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+91 12345 67890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Schedule
                  </label>
                  <input
                    type="text"
                    value={clubForm.meetingSchedule}
                    onChange={(e) => setClubForm({...clubForm, meetingSchedule: e.target.value})}
                    placeholder="e.g. Every Friday 4 PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClubModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Club
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Event</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter event title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Club *
                  </label>
                  <select
                    required
                    value={eventForm.club}
                    onChange={(e) => setEventForm({...eventForm, club: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Club</option>
                    {clubs.map(club => (
                      <option key={club._id} value={club._id}>{club.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={eventForm.description}
                  onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the event details"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.eventDate}
                    onChange={(e) => setEventForm({...eventForm, eventDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({...eventForm, startTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({...eventForm, endTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({...eventForm, venue: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Event venue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Type *
                  </label>
                  <select
                    required
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {eventTypes.map(type => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventForm.registrationDeadline}
                    onChange={(e) => setEventForm({...eventForm, registrationDeadline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={eventForm.maxParticipants}
                    onChange={(e) => setEventForm({...eventForm, maxParticipants: e.target.value})}
                    placeholder="0 for unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requirements
                </label>
                <textarea
                  rows={2}
                  value={eventForm.requirements}
                  onChange={(e) => setEventForm({...eventForm, requirements: e.target.value})}
                  placeholder="Any specific requirements for participants..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prizes & Recognition
                </label>
                <textarea
                  rows={2}
                  value={eventForm.prizes}
                  onChange={(e) => setEventForm({...eventForm, prizes: e.target.value})}
                  placeholder="Prizes, certificates, or other recognition..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Mark Attendance - {selectedEvent.title}
            </h3>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Select participants who attended the event:
              </div>
              
              {selectedEvent.registeredParticipants.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No registered participants</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedEvent.registeredParticipants.map((participant) => (
                    <div key={participant.user._id} className="flex items-center p-3 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={participant.user._id}
                        checked={attendanceList.includes(participant.user._id)}
                        onChange={() => toggleAttendance(participant.user._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3"
                      />
                      <label htmlFor={participant.user._id} className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                            {participant.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{participant.user.name}</div>
                            <div className="text-sm text-gray-500">{participant.user.email}</div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {attendanceList.length} of {selectedEvent.registeredParticipants.length} selected
                </span>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowAttendanceModal(false);
                      setSelectedEvent(null);
                      setAttendanceList([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkAttendance}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Mark Attendance
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* User Profile */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full capitalize mt-1 ${
                    selectedUser.role === 'admin' ? 'bg-red-100 text-red-800' :
                    selectedUser.role === 'teacher' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>
              </div>

              {/* User Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.studentId || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Joined</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Clubs Joined</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.joinedClubs?.length || 0}</p>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">Activity Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Events Registered:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {selectedUser.eventsRegistered?.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Active Status:</span>
                    <span className={`ml-2 font-semibold ${
                      selectedUser.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit User
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser._id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default AdminPanel;
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useAuth } from '../../context/AuthContext';
// import { toast } from 'react-toastify';
// import { 
//   Users, 
//   Calendar, 
//   Settings,
//   Plus,
//   Edit,
//   Trash2,
//   Search,
//   Filter,
//   Eye,
//   UserCheck,
//   Star,
//   BarChart3,
//   TrendingUp,
//   Award,
//   Building,
//   Mail,
//   Phone,
//   Clock,
//   MapPin,
//   Save,
//   X,
//   Download,
//   Upload,
//   CheckCircle,
//   AlertCircle,
//   Info,
//   Activity
// } from 'lucide-react';
// import { format } from 'date-fns';

// const AdminPanel = () => {
//   const { user } = useAuth();
//   const [activeTab, setActiveTab] = useState('overview');
//   const [loading, setLoading] = useState(true);
  
//   // Data states
//   const [clubs, setClubs] = useState([]);
//   const [events, setEvents] = useState([]);
//   const [users, setUsers] = useState([]);
//   const [teachers, setTeachers] = useState([]);
//   const [stats, setStats] = useState({});
  
//   // Modal states
//   const [showClubModal, setShowClubModal] = useState(false);
//   const [showEventModal, setShowEventModal] = useState(false);
//   const [showAttendanceModal, setShowAttendanceModal] = useState(false);
//   const [showUserModal, setShowUserModal] = useState(false);
  
//   // Form states
//   const [clubForm, setClubForm] = useState({
//     name: '',
//     description: '',
//     category: 'technical',
//     coordinator: '',
//     contactEmail: '',
//     contactPhone: '',
//     meetingSchedule: ''
//   });
  
//   const [eventForm, setEventForm] = useState({
//     title: '',
//     description: '',
//     club: '',
//     eventDate: '',
//     startTime: '',
//     endTime: '',
//     venue: '',
//     maxParticipants: '',
//     registrationDeadline: '',
//     eventType: 'workshop',
//     requirements: '',
//     prizes: ''
//   });

//   // Selected items for operations
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [attendanceList, setAttendanceList] = useState([]);

//   // Search and filter states
//   const [searchTerm, setSearchTerm] = useState('');
//   const [filterRole, setFilterRole] = useState('');
//   const [filterStatus, setFilterStatus] = useState('');

//   const categories = ['technical', 'cultural', 'sports', 'academic', 'social'];
//   const eventTypes = ['workshop', 'seminar', 'competition', 'meeting', 'cultural', 'sports'];
//   const userRoles = ['student', 'teacher', 'admin'];

//   useEffect(() => {
//     fetchAllData();
//   }, []);

//   const fetchAllData = async () => {
//     try {
//       setLoading(true);
//       const [clubsRes, eventsRes, usersRes, teachersRes] = await Promise.all([
//         axios.get('/api/clubs'),
//         axios.get('/api/events'),
//         axios.get('/api/users'),
//         axios.get('/api/users/role/teachers')
//       ]);

//       setClubs(clubsRes.data);
//       setEvents(eventsRes.data);
//       setUsers(usersRes.data);
//       setTeachers(teachersRes.data);

//       // Calculate stats
//       const statsData = {
//         totalClubs: clubsRes.data.length,
//         totalEvents: eventsRes.data.length,
//         totalUsers: usersRes.data.length,
//         activeClubs: clubsRes.data.filter(c => c.isActive).length,
//         upcomingEvents: eventsRes.data.filter(e => e.status === 'upcoming').length,
//         completedEvents: eventsRes.data.filter(e => e.status === 'completed').length,
//         studentCount: usersRes.data.filter(u => u.role === 'student').length,
//         teacherCount: usersRes.data.filter(u => u.role === 'teacher').length,
//         adminCount: usersRes.data.filter(u => u.role === 'admin').length,
//       };
//       setStats(statsData);

//     } catch (error) {
//       console.error('Error fetching data:', error);
//       toast.error('Failed to load admin data');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateClub = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post('/api/clubs', clubForm);
//       toast.success('Club created successfully!');
//       setShowClubModal(false);
//       resetClubForm();
//       fetchAllData();
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Failed to create club');
//     }
//   };

//   const handleCreateEvent = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.post('/api/events', eventForm);
//       toast.success('Event created successfully!');
//       setShowEventModal(false);
//       resetEventForm();
//       fetchAllData();
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Failed to create event');
//     }
//   };

//   const handleMarkAttendance = async () => {
//     try {
//       await axios.post('/api/attendance/mark', {
//         eventId: selectedEvent._id,
//         participants: attendanceList
//       });
//       toast.success('Attendance marked successfully!');
//       setShowAttendanceModal(false);
//       setSelectedEvent(null);
//       setAttendanceList([]);
//       fetchAllData();
//     } catch (error) {
//       toast.error(error.response?.data?.message || 'Failed to mark attendance');
//     }
//   };

//   const handleDeleteUser = async (userId) => {
//     if (window.confirm('Are you sure you want to delete this user?')) {
//       try {
//         await axios.delete(`/api/users/${userId}`);
//         toast.success('User deleted successfully!');
//         fetchAllData();
//       } catch (error) {
//         toast.error(error.response?.data?.message || 'Failed to delete user');
//       }
//     }
//   };

//   const handleDeleteClub = async (clubId) => {
//     if (window.confirm('Are you sure you want to delete this club?')) {
//       try {
//         await axios.delete(`/api/clubs/${clubId}`);
//         toast.success('Club deleted successfully!');
//         fetchAllData();
//       } catch (error) {
//         toast.error(error.response?.data?.message || 'Failed to delete club');
//       }
//     }
//   };

//   const handleDeleteEvent = async (eventId) => {
//     if (window.confirm('Are you sure you want to delete this event?')) {
//       try {
//         await axios.delete(`/api/events/${eventId}`);
//         toast.success('Event deleted successfully!');
//         fetchAllData();
//       } catch (error) {
//         toast.error(error.response?.data?.message || 'Failed to delete event');
//       }
//     }
//   };

//   const openAttendanceModal = (event) => {
//     setSelectedEvent(event);
//     setAttendanceList([]);
//     setShowAttendanceModal(true);
//   };

//   const openUserModal = (user) => {
//     setSelectedUser(user);
//     setShowUserModal(true);
//   };

//   const toggleAttendance = (participantId) => {
//     setAttendanceList(prev => 
//       prev.includes(participantId) 
//         ? prev.filter(id => id !== participantId)
//         : [...prev, participantId]
//     );
//   };

//   const resetClubForm = () => {
//     setClubForm({
//       name: '',
//       description: '',
//       category: 'technical',
//       coordinator: '',
//       contactEmail: '',
//       contactPhone: '',
//       meetingSchedule: ''
//     });
//   };

//   const resetEventForm = () => {
//     setEventForm({
//       title: '',
//       description: '',
//       club: '',
//       eventDate: '',
//       startTime: '',
//       endTime: '',
//       venue: '',
//       maxParticipants: '',
//       registrationDeadline: '',
//       eventType: 'workshop',
//       requirements: '',
//       prizes: ''
//     });
//   };

//   const filteredUsers = users.filter(user => {
//     const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesRole = !filterRole || user.role === filterRole;
//     return matchesSearch && matchesRole;
//   });

//   const filteredClubs = clubs.filter(club => {
//     const matchesSearch = club.name.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = !filterStatus || 
//                          (filterStatus === 'active' && club.isActive) ||
//                          (filterStatus === 'inactive' && !club.isActive);
//     return matchesSearch && matchesStatus;
//   });

//   const filteredEvents = events.filter(event => {
//     const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesStatus = !filterStatus || event.status === filterStatus;
//     return matchesSearch && matchesStatus;
//   });

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto p-6">
//       {/* Header */}
//       <div className="mb-8">
//         <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
//         <p className="text-gray-600">Manage clubs, events, and users across the platform</p>
//       </div>

//       {/* Navigation Tabs */}
//       <div className="mb-8 border-b border-gray-200">
//         <nav className="-mb-px flex space-x-8">
//           {[
//             { id: 'overview', name: 'Overview', icon: BarChart3 },
//             { id: 'clubs', name: 'Clubs', icon: Users },
//             { id: 'events', name: 'Events', icon: Calendar },
//             { id: 'users', name: 'Users', icon: Settings },
//             { id: 'analytics', name: 'Analytics', icon: TrendingUp }
//           ].map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => setActiveTab(tab.id)}
//               className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
//                 activeTab === tab.id
//                   ? 'border-blue-500 text-blue-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//               }`}
//             >
//               <tab.icon className="w-4 h-4 mr-2" />
//               {tab.name}
//             </button>
//           ))}
//         </nav>
//       </div>

//       {/* Overview Tab */}
//       {activeTab === 'overview' && (
//         <div className="space-y-8">
//           {/* Stats Grid */}
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total Users</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
//                   <p className="text-sm text-blue-600">{stats.studentCount} students</p>
//                 </div>
//                 <div className="p-3 bg-blue-100 rounded-lg">
//                   <Users className="w-6 h-6 text-blue-600" />
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total Clubs</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.totalClubs}</p>
//                   <p className="text-sm text-green-600">{stats.activeClubs} active</p>
//                 </div>
//                 <div className="p-3 bg-green-100 rounded-lg">
//                   <Building className="w-6 h-6 text-green-600" />
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Total Events</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
//                   <p className="text-sm text-purple-600">{stats.upcomingEvents} upcoming</p>
//                 </div>
//                 <div className="p-3 bg-purple-100 rounded-lg">
//                   <Calendar className="w-6 h-6 text-purple-600" />
//                 </div>
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <div className="flex items-center justify-between">
//                 <div>
//                   <p className="text-sm font-medium text-gray-600">Completed Events</p>
//                   <p className="text-2xl font-bold text-gray-900">{stats.completedEvents}</p>
//                   <p className="text-sm text-orange-600">All time</p>
//                 </div>
//                 <div className="p-3 bg-orange-100 rounded-lg">
//                   <Award className="w-6 h-6 text-orange-600" />
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Recent Activity */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h3>
//               <div className="space-y-3">
//                 {events.slice(0, 5).map((event) => (
//                   <div key={event._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <p className="font-medium text-gray-900">{event.title}</p>
//                       <p className="text-sm text-gray-500">{event.club?.name}</p>
//                     </div>
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${
//                       event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
//                       event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
//                       'bg-blue-100 text-blue-800'
//                     }`}>
//                       {event.status}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             </div>

//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//               <h3 className="text-lg font-semibold text-gray-900 mb-4">Club Distribution</h3>
//               <div className="space-y-4">
//                 {categories.map(category => {
//                   const count = clubs.filter(club => club.category === category).length;
//                   const percentage = stats.totalClubs > 0 ? (count / stats.totalClubs) * 100 : 0;
//                   return (
//                     <div key={category} className="space-y-2">
//                       <div className="flex items-center justify-between">
//                         <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
//                         <span className="text-sm text-gray-500">{count}</span>
//                       </div>
//                       <div className="w-full bg-gray-200 rounded-full h-2">
//                         <div 
//                           className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
//                           style={{ width: `${percentage}%` }}
//                         ></div>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             </div>
//           </div>

//           {/* Quick Actions */}
//           <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
//             <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <button
//                 onClick={() => setShowClubModal(true)}
//                 className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
//               >
//                 <Plus className="w-6 h-6 mr-3" />
//                 <span>Create Club</span>
//               </button>
//               <button
//                 onClick={() => setShowEventModal(true)}
//                 className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
//               >
//                 <Calendar className="w-6 h-6 mr-3" />
//                 <span>Create Event</span>
//               </button>
//               <button
//                 className="flex items-center p-4 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
//               >
//                 <Download className="w-6 h-6 mr-3" />
//                 <span>Export Data</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Clubs Tab */}
//       {activeTab === 'clubs' && (
//         <div className="space-y-6">
//           {/* Header with Actions */}
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Clubs</h2>
//             <button
//               onClick={() => setShowClubModal(true)}
//               className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//             >
//               <Plus className="w-4 h-4 mr-2" />
//               Create Club
//             </button>
//           </div>

//           {/* Search and Filter */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//               <div className="flex-1">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                   <input
//                     type="text"
//                     placeholder="Search clubs..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   />
//                 </div>
//               </div>
//               <div>
//                 <select
//                   value={filterStatus}
//                   onChange={(e) => setFilterStatus(e.target.value)}
//                   className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                   <option value="">All Status</option>
//                   <option value="active">Active</option>
//                   <option value="inactive">Inactive</option>
//                 </select>
//               </div>
//             </div>
//           </div>

//           {/* Clubs Table */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Club
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Category
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Coordinator
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Members
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Status
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {filteredClubs.map((club) => (
//                     <tr key={club._id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div>
//                           <div className="text-sm font-medium text-gray-900">{club.name}</div>
//                           <div className="text-sm text-gray-500 line-clamp-1">{club.description}</div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
//                           {club.category}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {club.coordinator?.name || 'Not assigned'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {club.members?.length || 0}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                           club.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
//                         }`}>
//                           {club.isActive ? 'Active' : 'Inactive'}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                           <button 
//                             className="text-blue-600 hover:text-blue-900 p-1"
//                             title="Edit"
//                           >
//                             <Edit className="w-4 h-4" />
//                           </button>
//                           <button 
//                             className="text-green-600 hover:text-green-900 p-1"
//                             title="View"
//                           >
//                             <Eye className="w-4 h-4" />
//                           </button>
//                           <button 
//                             onClick={() => handleDeleteClub(club._id)}
//                             className="text-red-600 hover:text-red-900 p-1"
//                             title="Delete"
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Events Tab */}
//       {activeTab === 'events' && (
//         <div className="space-y-6">
//           {/* Header with Actions */}
//           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Events</h2>
//             <button
//               onClick={() => setShowEventModal(true)}
//               className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//             >
//               <Plus className="w-4 h-4 mr-2" />
//               Create Event
//             </button>
//           </div>

//           {/* Search and Filter */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//               <div className="flex-1">
//                 <div className="relative">
//                   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                   <input
//                     type="text"
//                     placeholder="Search events..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   />
//                 </div>
//               </div>
//               <div>
//                 <select
//                   value={filterStatus}
//                   onChange={(e) => setFilterStatus(e.target.value)}
//                   className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                   <option value="">All Status</option>
//                   <option value="upcoming">Upcoming</option>
//                   <option value="ongoing">Ongoing</option>
//                   <option value="completed">Completed</option>
//                   <option value="cancelled">Cancelled</option>
//                 </select>
//               </div>
//             </div>
//           </div>

//           {/* Events Table */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Event
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Club
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Date
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Registered
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Status
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {filteredEvents.map((event) => (
//                     <tr key={event._id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <div>
//                           <div className="text-sm font-medium text-gray-900">{event.title}</div>
//                           <div className="text-sm text-gray-500 capitalize">{event.eventType}</div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {event.club?.name || 'No club'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(event.eventDate), 'MMM dd, yyyy')}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {event.registeredParticipants?.length || 0}
//                         {event.maxParticipants > 0 && `/${event.maxParticipants}`}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                           event.status === 'upcoming' ? 'bg-green-100 text-green-800' :
//                           event.status === 'completed' ? 'bg-gray-100 text-gray-800' :
//                           event.status === 'ongoing' ? 'bg-blue-100 text-blue-800' :
//                           'bg-red-100 text-red-800'
//                         }`}>
//                           {event.status}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                           {(user.role === 'teacher' || user.role === 'admin') && event.status === 'upcoming' && (
//                             <button 
//                               onClick={() => openAttendanceModal(event)}
//                                 className="text-green-600 hover:text-green-900 p-1"
//                                 title="Mark Attendance"
//                             >
//                               <UserCheck className="w-4 h-4" />
//                             </button>
//                             )}
//                             <button
//                             className="text-blue-600 hover:text-blue-900 p-1"
//                             title="View"
//                           >
//                             <Eye className="w-4 h-4" />
//                             </button>
//                             <button
//                             className="text-yellow-600 hover:text-yellow-900 p-1"
//                             title="Edit"
//                             >
//                             <Edit className="w-4 h-4" />
//                             </button>
//                             <button
//                             onClick={() => handleDeleteEvent(event._id)}
//                             className="text-red-600 hover:text-red-900 p-1"
//                             title="Delete"
//                             >
//                             <Trash2 className="w-4 h-4" />
//                             </button>
//                         </div>
//                       </td>
//                     </tr>
//                     ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       )}
//         {/* Users Tab */}
//         {activeTab === 'users' && (
//         <div className="space-y-6">
//             {/* Header with Actions */}
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
//             <button
//                 onClick={() => setShowUserModal(true)}
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//             >
//                 <Plus className="w-4 h-4 mr-2" />
//                 Add User
//             </button>
//             </div>
//             {/* Search and Filter */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//                 <div className="flex-1">
//                 <div className="relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                     type="text"
//                     placeholder="Search users..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                     />
//                 </div>
//                 </div>
//                 <div>
//                 <select
//                     value={filterRole}
//                     onChange={(e) => setFilterRole(e.target.value)}
//                     className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                     <option value="">All Roles</option>
//                     {userRoles.map(role => (
//                     <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
//                     ))}
//                 </select>
//                 </div>
//             </div>
//             </div>
//             {/* Users Table */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                     <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         User
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Email
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Role
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Joined
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Actions
//                     </th>
//                     </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                     {filteredUsers.map((user) => (
//                     <tr key={user._id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="flex items-center">
//                             <div className="flex-shrink-0 h-10 w-10">
//                             {user.avatarUrl ? (
//                                 <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt={user.name} />
//                             ) : (
//                                 <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
//                                 <User className="w-6 h-6 text-gray-400" />
//                                 </div>
//                             )}
//                             </div>
//                             <div className="ml-4">
//                             <div className="text-sm font-medium text-gray-900">{user.name}</div>
//                             <div className="text-sm text-gray-500">{user.username}</div>
//                             </div>
//                         </div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {user.email}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap">
//                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                             user.role === 'admin' ? 'bg-red-100 text-red-800' :
//                             user.role === 'teacher' ? 'bg-green-100 text-green-800' :
//                             'bg-blue-100 text-blue-800'
//                         }`}>
//                             {user.role}
//                         </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(user.createdAt), 'MMM dd, yyyy')}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                             <button
//                             onClick={() => openUserModal(user)}
//                             className="text-blue-600 hover:text-blue-900 p-1"
//                             title="View"
//                             >
//                             <Eye className="w-4 h-4" />
//                             </button>
//                             <button
//                             className="text-yellow-600 hover:text-yellow-900 p-1"
//                             title="Edit"
//                             >
//                             <Edit className="w-4 h-4" />
//                             </button>
//                             {user._id !== userId && (
//                             <button
//                                 onClick={() => handleDeleteUser(user._id)}
//                                 className="text-red-600 hover:text-red-900 p-1"
//                                 title="Delete"
//                             >
//                                 <Trash2 className="w-4 h-4" />
//                             </button>
//                             )}
//                         </div>
//                         </td>
//                     </tr>
//                     ))}
//                 </tbody>
//                 </table>
//             </div>
//             </div>
//         </div>
//         )}
//         {/* Analytics Tab */}
//         {activeTab === 'analytics' && (
//         <div className="space-y-8">
//             {/* Placeholder for future analytics content */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
//             <p className="text-gray-600">Detailed analytics and reports will be available here in future updates.</p>
//             </div>
//         </div>
//         )}
//         {/* Create Club Modal */}
//         {showClubModal && (
//         <Modal title="Create New Club" onClose={() => { setShowClubModal(false); resetClubForm(); }}>
//             <form onSubmit={handleCreateClub} className="space-y-4">
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Club Name</label>
//                 <input
//                 type="text"
//                 name="name"
//                 value={clubForm.name}
//                 onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Description</label>
//                 <textarea
//                 name="description"
//                 value={clubForm.description}
//                 onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 rows={3}
//                 ></textarea>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Category</label>
//                 <select
//                 name="category"
//                 value={clubForm.category}
//                 onChange={(e) => setClubForm({ ...clubForm, category: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select category</option>
//                 {categories.map(category => (
//                     <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Coordinator</label>
//                 <select
//                 name="coordinatorId"
//                 value={clubForm.coordinatorId}
//                 onChange={(e) => setClubForm({ ...clubForm, coordinatorId: e.target.value })}
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select coordinator (optional)</option>
//                 {users.filter(u => u.role === 'teacher' || u.role === 'admin').map(user => (
//                     <option key={user._id} value={user._id}>{user.name} ({user.role})</option>
//                 ))}
//                 </select>
//             </div>
//             <div className="flex items-center space-x-4">
//                 <button
//                 type="submit"
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                 Create Club
//                 </button>
//                 <button
//                 type="button"
//                 onClick={() => { setShowClubModal(false); resetClubForm(); }}
//                 className="text-gray-600 hover:text-gray-900"
//                 >
//                 Cancel
//                 </button>
//             </div>
//             </form>
//         </Modal>
//         )}
//         {/* Create Event Modal */}
//         {showEventModal && (
//         <Modal title="Create New Event" onClose={() => { setShowEventModal(false); resetEventForm(); }}>
//             <form onSubmit={handleCreateEvent} className="space-y-4">
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Title</label>
//                 <input
//                 type="text"
//                 name="title"
//                 value={eventForm.title}
//                 onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Description</label>
//                 <textarea
//                 name="description"
//                 value={eventForm.description}
//                 onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 rows={3}
//                 ></textarea>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Type</label>
//                 <select
//                 name="eventType"
//                 value={eventForm.eventType}
//                 onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select event type</option>
//                 {eventTypes.map(type => (
//                     <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Club</label>
//                 <select
//                 name="clubId"
//                 value={eventForm.clubId}
//                 onChange={(e) => setEventForm({ ...eventForm, clubId: e.target.value })}
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select club (optional)</option>
//                 {clubs.map(club => (
//                     <option key={club._id} value={club._id}>{club.name}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Date</label>
//                 <input
//                 type="date"
//                 name="eventDate"
//                 value={eventForm.eventDate}
//                 onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Max Participants</label>
//                 <input
//                 type="number"
//                 name="maxParticipants"
//                 value={eventForm.maxParticipants}
//                 onChange={(e) => setEventForm({ ...eventForm, maxParticipants: e.target.value })}
//                 min={0}
//                 className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//                 <p className="text-xs text-gray-500">Set to 0 for unlimited participants.</p>
//             </div>
//             <div className="flex items-center space-x-4">
//                 <button
//                 type="submit"
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                 Create Event
//                 </button>
//                 <button
//                 type="button"
//                 onClick={() => { setShowEventModal(false); resetEventForm(); }}
//                 className="text-gray-600 hover:text-gray-900"
//                 >
//                 Cancel
//                 </button>
//             </div>
//             </form>
//         </Modal>
//         )}
//         {/* User Modal */}
//         {showUserModal && selectedUser && (
//         <Modal title="User Details" onClose={() => { setShowUserModal(false); setSelectedUser(null); }}>
//             <div className="space-y-4">
//             <div className="flex items-center space-x-4">
//                 {selectedUser.avatarUrl ? (
//                 <img className="h-16 w-16 rounded-full" src={selectedUser.avatarUrl} alt={selectedUser.name} />
//                 ) : (
//                 <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
//                     <User className="w-8 h-8 text-gray-400" />
//                 </div>
//                 )}
//                 <div>
//                 <div className="text-lg font-medium text-gray-900">{selectedUser.name}</div>
//                 <div className="text-sm text-gray-500">{selectedUser.username}</div>
//                 </div>
//             </div>
//             <div>
//                 <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
//                 <p><span className="font-medium">Role:</span> {selectedUser.role}</p>
//                 <p><span className="font-medium">Joined:</span> {format(new Date(selectedUser.createdAt), 'MMM dd, yyyy')}</p>
//             </div>
//             <div className="flex items-center space-x-4">
//                 <button
//                 className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
//                 >
//                 Edit
//                 </button>
//                 <button
//                 onClick={() => { setShowUserModal(false); setSelectedUser(null); }}
//                 className="text-gray-600 hover:text-gray-900"
//                 >
//                 Close
//                 </button>
//             </div>
//             </div>
//         </Modal>
//         )}
//         {/* Attendance Modal */}
//         {showAttendanceModal && selectedEvent && (
//         <Modal title="Mark Attendance" onClose={() => { setShowAttendanceModal(false); setSelectedEvent(null); setAttendance({}); }}>
//             <div className="space-y-4">
//             <div>
//                 <h3 className="text-lg font-medium text-gray-900">{selectedEvent.title}</h3>
//                 <p className="text-sm text-gray-500">{format(new Date(selectedEvent.eventDate), 'MMM dd, yyyy')}</p>
//                 <p className="text-sm text-gray-500">Club: {selectedEvent.club?.name || 'No club'}</p>
//             </div>
//             <form onSubmit={handleMarkAttendance} className="space-y-4 max-h-96 overflow-y-auto">
//                 {selectedEvent.registeredParticipants && selectedEvent.registeredParticipants.length > 0 ? (
//                 selectedEvent.registeredParticipants.map(participant => (
//                     <div key={participant._id} className="flex items-center space-x-4">
//                     <div className="flex-1">
//                         <div className="text-sm font-medium text-gray-900">{participant.name}</div>
//                         <div className="text-sm text-gray-500">{participant.email}</div>
//                     </div>
//                     <div>
//                         <label className="inline-flex items-center">
//                         <input
//                             type="checkbox"
//                             checked={attendance[participant._id] || false}
//                             onChange={(e) => setAttendance({ ...attendance, [participant._id]: e.target.checked })}
//                             className="h-4 w-4 text-blue-600 border-gray-300 rounded"
//                         />
//                         <span className="ml-2 text-sm text-gray-700">Present</span>
//                         </label>
//                     </div>
//                     </div>
//                 ))
//                 ) : (
//                 <p className="text-sm text-gray-500">No participants registered for this event.</p>
//                 )}
//                 <div className="flex items-center space-x-4">
//                 <button
//                     type="submit"
//                     className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
//                 >
//                     Save Attendance
//                 </button>
//                 <button
//                     type="button"
//                     onClick={() => { setShowAttendanceModal(false); setSelectedEvent(null); setAttendance({}); }}
//                     className="text-gray-600 hover:text-gray-900"
//                 >
//                     Cancel
//                 </button>
//                 </div>
//             </form>
//             </div>
//         </Modal>
//         )}
//     </div>
//   );
// };
// export default AdminPanel;
// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { format } from 'date-fns';
// import { Plus, Search, Edit, Trash2, Eye, User, UserCheck } from 'react-feather';
// import Modal from '../../components/Modal';
// import { toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { useAuth } from '../../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';

// toast.configure();
// const categories = ['academic', 'sports', 'cultural', 'technical', 'others'];
// const eventTypes = ['meeting', 'workshop', 'competition', 'social', 'others'];
// const userRoles = ['student', 'teacher', 'admin'];
// export default function AdminPanel() {
//   const { user, userId } = useAuth();
//   const navigate = useNavigate();
//     const [activeTab, setActiveTab] = useState('clubs');
//     const [clubs, setClubs] = useState([]);
//     const [events, setEvents] = useState([]);
//     const [users, setUsers] = useState([]);
//     const [searchTerm, setSearchTerm] = useState('');
//     const [filterStatus, setFilterStatus] = useState('');
//     const [filterRole, setFilterRole] = useState('');
//     const [showClubModal, setShowClubModal] = useState(false);
//     const [showEventModal, setShowEventModal] = useState(false);
//     const [showUserModal, setShowUserModal] = useState(false);
//     const [showAttendanceModal, setShowAttendanceModal] = useState(false);
//     const [selectedUser, setSelectedUser] = useState(null);
//     const [selectedEvent, setSelectedEvent] = useState(null);
//     const [attendance, setAttendance] = useState({});
//     const [clubForm, setClubForm] = useState({ name: '', description: '', category: '', coordinatorId: '' });
//     const [eventForm, setEventForm] = useState({ title: '', description: '', eventType: '', clubId: '', eventDate: '', maxParticipants: 0 });
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         if (!user || (user.role !== 'admin' && user.role !== 'teacher')) {
//             navigate('/');
//         } else {
//             fetchData();
//         }
//     }, [user, navigate]);
//     const fetchData = async () => {
//         setLoading(true);
//         try {
//             const [clubsRes, eventsRes, usersRes] = await Promise.all([
//                 axios.get('/api/clubs'),
//                 axios.get('/api/events'),
//                 axios.get('/api/users'),
//             ]);
//             setClubs(clubsRes.data);
//             setEvents(eventsRes.data);
//             setUsers(usersRes.data);
//         }
//         catch (error) {
//             console.error('Error fetching data:', error);
//             toast.error('Failed to fetch data. Please try again later.');
//         }
//         setLoading(false);
//     }
//     const resetClubForm = () => {
//         setClubForm({ name: '', description: '', category: '', coordinatorId: '' });
//     }
//     const resetEventForm = () => {
//         setEventForm({ title: '', description: '', eventType: '', clubId: '', eventDate: '', maxParticipants: 0 });
//     }
//     const handleCreateClub = async (e) => {
//         e.preventDefault();
//         try {
//             const res = await axios.post('/api/clubs', clubForm);
//             setClubs([...clubs, res.data]);
//             toast.success('Club created successfully!');
//             setShowClubModal(false);
//             resetClubForm();
//         } catch (error) {
//             console.error('Error creating club:', error);
//             toast.error('Failed to create club. Please try again.');
//         }
//     }
//     const handleCreateEvent = async (e) => {
//         e.preventDefault();
//         try {
//             const res = await axios.post('/api/events', eventForm);
//             setEvents([...events, res.data]);
//             toast.success('Event created successfully!');
//             setShowEventModal(false);
//             resetEventForm();
//         } catch (error) {
//             console.error('Error creating event:', error);
//             toast.error('Failed to create event. Please try again.');
//         }
//     }
//     const handleDeleteClub = async (clubId) => {
//         if (!window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) return;
//         try {
//             await axios.delete(`/api/clubs/${clubId}`);
//             setClubs(clubs.filter(club => club._id !== clubId));
//             toast.success('Club deleted successfully!');
//         }
//         catch (error) {
//             console.error('Error deleting club:', error);
//             toast.error('Failed to delete club. Please try again.');
//         }
//     }
//     const handleDeleteEvent = async (eventId) => {
//         if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
//         try {
//             await axios.delete(`/api/events/${eventId}`);
//             setEvents(events.filter(event => event._id !== eventId));
//             toast.success('Event deleted successfully!');
//         }
//         catch (error) {
//             console.error('Error deleting event:', error);
//             toast.error('Failed to delete event. Please try again.');
//         }
//     }
//     const handleDeleteUser = async (userId) => {
//         if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
//         try {
//             await axios.delete(`/api/users/${userId}`);
//             setUsers(users.filter(user => user._id !== userId));
//             toast.success('User deleted successfully!');
//         }
//         catch (error) {
//             console.error('Error deleting user:', error);
//             toast.error('Failed to delete user. Please try again.');
//         }
//     }
//     const openUserModal = (user) => {
//         setSelectedUser(user);
//         setShowUserModal(true);
//     }
//     const openAttendanceModal = (event) => {
//         setSelectedEvent(event);
//         const initialAttendance = {};
//         event.registeredParticipants.forEach(participant => {
//             initialAttendance[participant._id] = false;
//         });
//         setAttendance(initialAttendance);
//         setShowAttendanceModal(true);
//     }
//     const handleMarkAttendance = async (e) => {
//         e.preventDefault();
//         try {
//             await axios.post(`/api/events/${selectedEvent._id}/attendance`, { attendance });
//             toast.success('Attendance marked successfully!');
//             setShowAttendanceModal(false);
//             setSelectedEvent(null);
//             setAttendance({});
//         }
//         catch (error) {
//             console.error('Error marking attendance:', error);
//             toast.error('Failed to mark attendance. Please try again.');
//         }
//     }
//     const filteredClubs = clubs.filter(club => 
//         club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         club.category.toLowerCase().includes(searchTerm.toLowerCase())
//     );
//     const filteredEvents = events.filter(event => 
//         (event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         event.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         (event.club && event.club.name.toLowerCase().includes(searchTerm.toLowerCase()))) &&
//         (filterStatus ? event.status === filterStatus : true)
//     );
//     const filteredUsers = users.filter(user => 
//         (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
//         (filterRole ? user.role === filterRole : true)
//     );
//     return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin Panel</h1>
//       {/* Tabs */}
//         <div className="mb-6 border-b border-gray-200">
//         <nav className="-mb-px flex space-x-8" aria-label="Tabs">
//             <button
//             onClick={() => setActiveTab('clubs')}
//             className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === 'clubs' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//             }`}
//             >
//             Clubs
//             </button>
//             <button
//             onClick={() => setActiveTab('events')}
//             className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === 'events' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//             }`}
//             >
//             Events
//             </button>
//             <button
//             onClick={() => setActiveTab('users')}
//             className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//             }`}
//             >
//             Users
//             </button>
//             <button
//             onClick={() => setActiveTab('analytics')}
//             className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
//                 activeTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//             }`}
//             >
//             Analytics
//             </button>
//         </nav>
//         </div>
//         {loading ? (
//         <div className="flex justify-center items-center h-64">
//             <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
//         </div>
//         ) : (
//         activeTab === 'clubs' && (
//         <div className="space-y-6">
//           {/* Header with Actions */}
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Clubs</h2>
//             <button
//                 onClick={() => setShowClubModal(true)}
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//             >
//                 <Plus className="w-4 h-4 mr-2" />
//                 Add Club
//             </button>
//             </div>
//             {/* Search and Filter */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//                 <div className="flex-1">
//                 <div className="relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                     type="text"
//                     placeholder="Search clubs..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                     />
//                 </div>
//                 </div>
//             </div>
//             </div>
//             {/* Clubs Table */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                     <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Club Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Category
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Coordinator
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Created At
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Actions
//                     </th>
//                     </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                     {filteredClubs.map((club) => (
//                     <tr key={club._id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{club.name}</div>
//                         <div className="text-sm text-gray-500">{club.description}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {club.category.charAt(0).toUpperCase() + club.category.slice(1)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {club.coordinator ? club.coordinator.name : 'No coordinator'}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(club.createdAt), 'MMM dd, yyyy')}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                             <button
//                             className="text-yellow-600 hover:text-yellow-900 p-1"
//                             title="Edit"
//                             >
//                             <Edit className="w-4 h-4" />
//                             </button>
//                             <button
//                             onClick={() => handleDeleteClub(club._id)}
//                             className="text-red-600 hover:text-red-900 p-1"
//                             title="Delete"
//                             >
//                             <Trash2 className="w-4 h-4" />
//                             </button>
//                         </div>
//                         </td>
//                     </tr>
//                     ))}
//                 </tbody>
//                 </table>
//             </div>
//             </div>
//         </div>
//         )}
//         {activeTab === 'events' && (
//         <div className="space-y-6">
//           {/* Header with Actions */}
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Events</h2>
//             <button
//                 onClick={() => setShowEventModal(true)}
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
//             >
//                 <Plus className="w-4 h-4 mr-2" />
//                 Add Event
//             </button>
//             </div>
//             {/* Search and Filter */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//                 <div className="flex-1">
//                 <div className="relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                     type="text"
//                     placeholder="Search events..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                     />
//                 </div>
//                 </div>
//                 <div>
//                 <select
//                     value={filterStatus}
//                     onChange={(e) => setFilterStatus(e.target.value)}
//                     className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                     <option value="">All Statuses</option>
//                     <option value="upcoming">Upcoming</option>
//                     <option value="ongoing">Ongoing</option>
//                     <option value="completed">Completed</option>
//                 </select>
//                 </div>
//             </div>
//             </div>
//             {/* Events Table */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                     <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Event Title
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Event Type
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Club
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Date
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Status
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Actions
//                     </th>
//                     </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                     {filteredEvents.map((event) => (
//                     <tr key={event._id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{event.title}</div>
//                         <div className="text-sm text-gray-500">{event.description}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {event.club ? event.club.name : 'No club'}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(event.eventDate), 'MMM dd, yyyy')}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">
//                         <span
//                             className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
//                             event.status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
//                             event.status === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
//                             'bg-green-100 text-green-800'
//                             }`}
//                         >
//                             {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
//                         </span>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                             <button
//                             onClick={() => openAttendanceModal(event)}
//                             className="text-green-600 hover:text-green-900 p-1"
//                             title="Mark Attendance"
//                             >
//                             <UserCheck className="w-4 h-4" />
//                             </button>
//                             <button
//                             className="text-yellow-600 hover:text-yellow-900 p-1"
//                             title="Edit"
//                             >
//                             <Edit className="w-4 h-4" />
//                             </button>
//                             <button
//                             onClick={() => handleDeleteEvent(event._id)}
//                             className="text-red-600 hover:text-red-900 p-1"
//                             title="Delete"
//                             >
//                             <Trash2 className="w-4 h-4" />
//                             </button>
//                         </div>
//                         </td>
//                     </tr>
//                     ))}
//                 </tbody>
//                 </table>
//             </div>
//             </div>
//         </div>
//         )}
//         {activeTab === 'users' && (
//         <div className="space-y-6">
//             {/* Header with Actions */}
//             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//             <h2 className="text-xl font-semibold text-gray-900">Manage Users</h2>
//             </div>
//             {/* Search and Filter */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
//             <div className="flex flex-col md:flex-row gap-4">
//                 <div className="flex-1">
//                 <div className="relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                     type="text"
//                     placeholder="Search users..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                     />
//                 </div>
//                 </div>
//                 <div>
//                 <select
//                     value={filterRole}
//                     onChange={(e) => setFilterRole(e.target.value)}
//                     className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                     <option value="">All Roles</option>
//                     {userRoles.map(role => (
//                     <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
//                     ))}
//                 </select>
//                 </div>
//             </div>
//             </div>
//             {/* Users Table */}
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//             <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                     <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Name
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Username
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Email
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Role
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Joined
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Actions
//                     </th>
//                     </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                     {filteredUsers.map((user) => (
//                     <tr key={user._id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap">
//                         <div className="text-sm font-medium text-gray-900">{user.name}</div>
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {user.username}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {user.email}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(user.createdAt), 'MMM dd, yyyy')}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
//                         <div className="flex items-center justify-end space-x-2">
//                             <button
//                             onClick={() => openUserModal(user)}
//                             className="text-blue-600 hover:text-blue-900 p-1"
//                             title="View Details"
//                             >
//                             <Eye className="w-4 h-4" />
//                             </button>
//                             <button
//                             className="text-yellow-600 hover:text-yellow-900 p-1"
//                             title="Edit"
//                             >
//                             <Edit className="w-4 h-4" />
//                             </button>
//                             {user._id !== userId && (
//                             <button
//                                 onClick={() => handleDeleteUser(user._id)}
//                                 className="text-red-600 hover:text-red-900 p-1"
//                                 title="Delete"
//                             >
//                                 <Trash2 className="w-4 h-4" />
//                             </button>
//                             )}
//                         </div>
//                         </td>
//                     </tr>
//                     ))}
//                 </tbody>
//                 </table>
//             </div>
//             </div>
//         </div>
//         )}
//         {activeTab === 'analytics' && (
//         <div className="space-y-6">
//             <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
//             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <p className="text-gray-700">Analytics features coming soon!</p>
//             </div>
//         </div>
//         )}
//         )}
//         {/* Create Club Modal */}
//         {showClubModal && (
//         <Modal title="Create New Club" onClose={() => { setShowClubModal(false); resetClubForm(); }}>
//             <form onSubmit={handleCreateClub} className="space-y-4">
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Club Name</label>
//                 <input
//                 type="text"
//                 value={clubForm.name}
//                 onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Description</label>
//                 <textarea
//                 value={clubForm.description}
//                 onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Category</label>
//                 <select
//                 value={clubForm.category}
//                 onChange={(e) => setClubForm({ ...clubForm, category: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select Category</option>
//                 {categories.map(category => (
//                     <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Coordinator</label>
//                 <select
//                 value={clubForm.coordinatorId}
//                 onChange={(e) => setClubForm({ ...clubForm, coordinatorId: e.target.value })}
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select Coordinator (optional)</option>
//                 {users.filter(u => u.role === 'teacher' || u.role === 'admin').map(user => (
//                     <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
//                 ))}
//                 </select>
//             </div>
//             <div className="flex items-center space-x-4">
//                 <button
//                 type="submit"
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                 Create Club
//                 </button>
//                 <button
//                 type="button"
//                 onClick={() => { setShowClubModal(false); resetClubForm(); }}
//                 className="text-gray-600 hover:text-gray-900"
//                 >
//                 Cancel
//                 </button>
//             </div>
//             </form>
//         </Modal>
//         )}
//         {/* Create Event Modal */}
//         {showEventModal && (
//         <Modal title="Create New Event" onClose={() => { setShowEventModal(false); resetEventForm(); }}>
//             <form onSubmit={handleCreateEvent} className="space-y-4">
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Title</label>
//                 <input
//                 type="text"
//                 value={eventForm.title}
//                 onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Description</label>
//                 <textarea
//                 value={eventForm.description}
//                 onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Type</label>
//                 <select
//                 value={eventForm.eventType}
//                 onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select Event Type</option>
//                 {eventTypes.map(type => (
//                     <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Club</label>
//                 <select
//                 value={eventForm.clubId}
//                 onChange={(e) => setEventForm({ ...eventForm, clubId: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 >
//                 <option value="">Select Club</option>
//                 {clubs.map(club => (
//                     <option key={club._id} value={club._id}>{club.name}</option>
//                 ))}
//                 </select>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Event Date</label>
//                 <input
//                 type="date"
//                 value={eventForm.eventDate}
//                 onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })}
//                 required
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div>
//                 <label className="block text-sm font-medium text-gray-700">Max Participants</label>
//                 <input
//                 type="number"
//                 value={eventForm.maxParticipants}
//                 onChange={(e) => setEventForm({ ...eventForm, maxParticipants: parseInt(e.target.value) })}
//                 required
//                 min="1"
//                 className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                 />
//             </div>
//             <div className="flex items-center space-x-4">
//                 <button
//                 type="submit"
//                 className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//                 >
//                 Create Event
//                 </button>
//                 <button
//                 type="button"
//                 onClick={() => { setShowEventModal(false); resetEventForm(); }}
