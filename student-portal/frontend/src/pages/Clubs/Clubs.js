import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, 
  Filter, 
  Users, 
  Calendar,
  // MapPin removed (unused)
  Mail,
  Phone,
  Plus,
  Star,
  ChevronRight,
  Grid,
  List,
  TrendingUp,
  Award,
  Heart,
  Eye
} from 'lucide-react';
import { CardSkeleton } from '../../components/Common/LoadingSpinner';

const Clubs = () => {
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [filteredClubs, setFilteredClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [sortBy, setSortBy] = useState('name'); // name, members, newest

  const categories = [
    { value: '', label: 'All Categories', icon: '🏛️', color: 'bg-gray-100' },
    { value: 'technical', label: 'Technical', icon: '💻', color: 'bg-blue-100' },
    { value: 'cultural', label: 'Cultural', icon: '🎭', color: 'bg-purple-100' },
    { value: 'sports', label: 'Sports', icon: '⚽', color: 'bg-green-100' },
    { value: 'academic', label: 'Academic', icon: '📚', color: 'bg-yellow-100' },
    { value: 'social', label: 'Social', icon: '🤝', color: 'bg-pink-100' },
    { value: 'arts', label: 'Arts', icon: '🎨', color: 'bg-indigo-100' }
  ];

  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'members', label: 'Most Members' },
    { value: 'newest', label: 'Newest First' },
    { value: 'popular', label: 'Most Popular' }
  ];

  useEffect(() => {
    fetchClubs();
  }, []);

  useEffect(() => {
    filterAndSortClubs();
  }, [clubs, searchTerm, selectedCategory, sortBy]);

  const fetchClubs = async () => {
    try {
      const response = await axios.get('/api/clubs');
      setClubs(response.data);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortClubs = () => {
    let filtered = clubs;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(club => club.category === selectedCategory);
    }

    // Sort clubs
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'members':
          return (b.members?.length || 0) - (a.members?.length || 0);
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'popular':
          return (b.statistics?.totalMembers || 0) - (a.statistics?.totalMembers || 0);
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredClubs(filtered);
  };

  // getCategoryInfo removed (unused)

  const isUserMember = (club) => {
    return club.members?.some(member => member.user._id === user._id || member.user === user._id);
  };

  // getMemberCount removed (unused)

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discover Clubs</h1>
          <p className="text-gray-600">Find and join clubs that match your interests</p>
        </div>
        
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="mt-4 lg:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Club
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search clubs by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="lg:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="lg:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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

      {/* Category Chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        {categories.map(category => {
          const clubCount = category.value 
            ? clubs.filter(club => club.category === category.value).length
            : clubs.length;
          
          return (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
              <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                {clubCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{clubs.length}</div>
          <div className="text-sm text-gray-600">Total Clubs</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {clubs.filter(club => isUserMember(club)).length}
          </div>
          <div className="text-sm text-gray-600">Joined</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {categories.length - 1}
          </div>
          <div className="text-sm text-gray-600">Categories</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {clubs.filter(club => club.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
      </div>

      {/* Results */}
      {filteredClubs.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No clubs found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory 
              ? 'Try adjusting your search or filter criteria' 
              : 'There are no clubs available at the moment'
            }
          </p>
          {(searchTerm || selectedCategory) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-gray-600">
              Showing {filteredClubs.length} of {clubs.length} clubs
            </p>
          </div>

          {/* Clubs Grid/List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club) => (
                <ClubCard key={club._id} club={club} isUserMember={isUserMember(club)} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredClubs.map((club) => (
                <ClubListItem key={club._id} club={club} isUserMember={isUserMember(club)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Club Card Component for Grid View
const ClubCard = ({ club, isUserMember }) => {
  const getCategoryInfo = (category) => {
    const categories = {
      'technical': { icon: '💻', color: 'bg-blue-100 text-blue-800' },
      'cultural': { icon: '🎭', color: 'bg-purple-100 text-purple-800' },
      'sports': { icon: '⚽', color: 'bg-green-100 text-green-800' },
      'academic': { icon: '📚', color: 'bg-yellow-100 text-yellow-800' },
      'social': { icon: '🤝', color: 'bg-pink-100 text-pink-800' },
      'arts': { icon: '🎨', color: 'bg-indigo-100 text-indigo-800' }
    };
    return categories[category] || { icon: '🏛️', color: 'bg-gray-100 text-gray-800' };
  };

  const categoryInfo = getCategoryInfo(club.category);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Club Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{categoryInfo.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                {club.name}
              </h3>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color} mt-1`}>
                {club.category}
              </span>
            </div>
          </div>
          {isUserMember && (
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-500 fill-current" />
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {club.description}
        </p>

        {/* Club Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {club.members?.length || 0} members
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {club.statistics?.totalEvents || 0} events
          </div>
          <div className="flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            {club.statistics?.averageRating || 0}/5
          </div>
        </div>

        {/* Coordinator Info */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 mb-1">Coordinator</p>
          <p className="text-sm font-medium text-gray-900">
            {club.coordinator?.name || 'Not assigned'}
          </p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-gray-50 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            <Mail className="w-3 h-3 mr-1" />
            <span className="truncate">{club.contactInfo?.email}</span>
          </div>
          {club.contactInfo?.phone && (
            <div className="flex items-center">
              <Phone className="w-3 h-3 mr-1" />
              {club.contactInfo.phone}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-4">
        <Link
          to={`/clubs/${club._id}`}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center group-hover:bg-blue-700"
        >
          <Eye className="w-4 h-4 mr-2" />
          View Details
          <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
    </div>
  );
};

// Club List Item Component for List View
const ClubListItem = ({ club, isUserMember }) => {
  const getCategoryInfo = (category) => {
    const categories = {
      'technical': { icon: '💻', color: 'bg-blue-100 text-blue-800' },
      'cultural': { icon: '🎭', color: 'bg-purple-100 text-purple-800' },
      'sports': { icon: '⚽', color: 'bg-green-100 text-green-800' },
      'academic': { icon: '📚', color: 'bg-yellow-100 text-yellow-800' },
      'social': { icon: '🤝', color: 'bg-pink-100 text-pink-800' },
      'arts': { icon: '🎨', color: 'bg-indigo-100 text-indigo-800' }
    };
    return categories[category] || { icon: '🏛️', color: 'bg-gray-100 text-gray-800' };
  };

  const categoryInfo = getCategoryInfo(club.category);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="text-3xl">{categoryInfo.icon}</div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
              {isUserMember && (
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryInfo.color}`}>
                {club.category}
              </span>
            </div>
            
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {club.description}
            </p>
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                {club.members?.length || 0} members
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {club.statistics?.totalEvents || 0} events
              </div>
              <div className="flex items-center">
                <Award className="w-4 h-4 mr-1" />
                {club.statistics?.averageRating || 0}/5 rating
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {club.coordinator?.name || 'No coordinator'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isUserMember && (
            <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <Heart className="w-4 h-4 mr-1" />
              Member
            </div>
          )}
          
          <Link
            to={`/clubs/${club._id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Clubs;