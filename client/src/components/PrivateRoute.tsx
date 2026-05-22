import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Box, Typography, Paper, Button } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

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
  const { firebaseUser, user, loading, userLoadComplete } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userLoadComplete) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Main app routes: enforce legal release then approval before granting access
  if (requireLegalRelease) {
    if (!user.legalReleaseSigned) {
      return <Navigate to="/sign-legal-release" replace />;
    }

    if (user.roleApprovalStatus !== 'approved') {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.50',
            p: 2,
          }}
        >
          <Paper elevation={3} sx={{ p: 5, maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom fontWeight={600}>
              You're all signed up!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Thank you for registering with Faith Responders. Your application has been received and
              is currently under review by our team.
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We'll reach out to you soon once your request has been reviewed. In the meantime, if you
              have any questions please contact your event coordinator.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { window.location.href = '/login'; }}
              sx={{ mt: 1 }}
            >
              Back to Sign In
            </Button>
          </Paper>
        </Box>
      );
    }
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

  return <>{children}</>;
};
