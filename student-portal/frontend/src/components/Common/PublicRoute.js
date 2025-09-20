import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PublicRoute = ({ 
  children, 
  restricted = true,
  redirectTo = '/dashboard'
}) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // If route is restricted and user is authenticated, redirect
  if (restricted && isAuthenticated) {
    // Check if there's a redirect location from login attempt
    const from = location.state?.from?.pathname || redirectTo;
    return <Navigate to={from} replace />;
  }

  // If user is not authenticated or route is not restricted, render the component
  return children;
};

export default PublicRoute;