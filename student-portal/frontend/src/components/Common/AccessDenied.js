import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Home, Mail } from 'lucide-react';

const AccessDenied = ({ 
  userRole = 'user', 
  requiredRoles = [], 
  message = 'You do not have permission to access this page.',
  showContactInfo = true 
}) => {
  const navigate = useNavigate();

  const getRoleDisplayName = (role) => {
    const roleNames = {
      student: 'Student',
      teacher: 'Teacher',
      admin: 'Administrator',
    };
    return roleNames[role] || role;
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-20 w-20 bg-red-100 rounded-full mb-6">
          <Shield className="h-10 w-10 text-red-600" />
        </div>

        {/* Error Code */}
        <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
        
        {/* Main Message */}
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Access Denied
        </h2>
        
        {/* Description */}
        <p className="text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>

        {/* Role Information */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="text-sm text-gray-500 mb-2">
            Your current role:
          </div>
          <div className="text-lg font-semibold text-blue-600 mb-3">
            {getRoleDisplayName(userRole)}
          </div>
          
          {requiredRoles.length > 0 && (
            <>
              <div className="text-sm text-gray-500 mb-2">
                Required role{requiredRoles.length > 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {requiredRoles.map((role, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                  >
                    {getRoleDisplayName(role)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Link>
        </div>

        {/* Contact Information */}
        {showContactInfo && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              Need access to this feature?
            </p>
            <div className="flex items-center justify-center text-sm text-blue-600">
              <Mail className="w-4 h-4 mr-1" />
              Contact your administrator
            </div>
          </div>
        )}

        {/* Additional Help */}
        <div className="mt-6 text-xs text-gray-500">
          <p>
            If you believe this is an error, please contact the system administrator.
          </p>
          <p className="mt-1">
            Error Code: 403 - Forbidden Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;