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
              Thank you for signing up!
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your registration and legal release have been received. Here's what happens next:
            </Typography>
            <Box sx={{ textAlign: 'left', mb: 2 }}>
              {[
                'Our team will contact you to schedule a background check.',
                'Once the background check is complete, an administrator will review and approve your application.',
                'You\'ll receive an email confirming your approval along with logistics details.',
              ].map((step, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{ minWidth: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, mt: '1px' }}>
                    {i + 1}
                  </Box>
                  <Typography variant="body2" color="text.secondary">{step}</Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              If you have any questions in the meantime, please contact your event coordinator.
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
