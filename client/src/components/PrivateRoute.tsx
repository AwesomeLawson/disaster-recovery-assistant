import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Box, Typography } from '@mui/material';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireRoles?: UserRole[];
  requireLegalRelease?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireRoles,
  requireLegalRelease = false,
}) => {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <LoadingSpinner />;
  }

  // Check if legal release is required but not signed
  if (requireLegalRelease && !user.legalReleaseSigned) {
    return <Navigate to="/sign-legal-release" replace />;
  }

  // Check if user has required roles
  if (requireRoles && requireRoles.length > 0) {
    const hasRequiredRole = requireRoles.some((role) => user.roles.includes(role));

    if (!hasRequiredRole) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1">
            You do not have permission to access this page.
          </Typography>
        </Box>
      );
    }
  }

  // Check if user's role is approved
  if (user.roleApprovalStatus !== 'approved') {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Pending Approval
        </Typography>
        <Typography variant="body1">
          Your account is pending approval by an administrator. Please check back later.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
};
