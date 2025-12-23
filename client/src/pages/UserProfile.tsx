import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Chip,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import type { CommunicationPreference } from '../types';

export const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    phoneNumber: '',
    communicationPreference: 'email' as CommunicationPreference,
  });

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setEditForm({
        phoneNumber: user.phoneNumber,
        communicationPreference: user.communicationPreference,
      });
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setUpdating(true);
      await userService.updateUserProfile(user.id, {
        phoneNumber: editForm.phoneNumber,
        communicationPreference: editForm.communicationPreference,
      });
      await refreshUser();
      setEditDialogOpen(false);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setUpdating(true);
      await authService.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordDialogOpen(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccess('Password changed successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setUpdating(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'error';
      case 'assessor':
        return 'primary';
      case 'workGroupLead':
        return 'secondary';
      case 'worker':
        return 'info';
      case 'thirdParty':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  if (!user) {
    return (
      <Container maxWidth="md">
        <Typography>Loading profile...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/dashboard')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          My Profile
        </Typography>
        <Button variant="outlined" startIcon={<LockIcon />} onClick={() => setPasswordDialogOpen(true)}>
          Change Password
        </Button>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditDialogOpen(true)}>
          Edit
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Account Information
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.email}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Phone Number
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.phoneNumber}
                </Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary">
              Communication Preference
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, textTransform: 'capitalize' }}>
              {user.communicationPreference}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Account Created
            </Typography>
            <Typography variant="body1">
              {new Date(user.createdAt).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Roles & Status
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Approval Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={user.roleApprovalStatus}
                color={getStatusColor(user.roleApprovalStatus) as any}
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Roles
            </Typography>
            <Box sx={{ mb: 2 }}>
              {user.roles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No roles assigned
                </Typography>
              ) : (
                user.roles.map((role) => (
                  <Chip
                    key={role}
                    label={role}
                    color={getRoleColor(role) as any}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))
              )}
            </Box>

            {user.requestedRoles && user.requestedRoles.length > 0 && user.roleApprovalStatus === 'pending' && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Pending Role Requests
                </Typography>
                <Box>
                  {user.requestedRoles.map((role) => (
                    <Chip
                      key={`req-${role}`}
                      label={role}
                      variant="outlined"
                      color="warning"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Compliance
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Legal Release
            </Typography>
            <Box>
              <Chip
                label={user.legalReleaseSigned ? 'Signed' : 'Not Signed'}
                color={user.legalReleaseSigned ? 'success' : 'warning'}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Profile Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Profile</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Phone Number"
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Communication Preference</InputLabel>
              <Select
                value={editForm.communicationPreference}
                label="Communication Preference"
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    communicationPreference: e.target.value as CommunicationPreference,
                  })
                }
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            disabled={updating || !editForm.phoneNumber.trim()}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              error={
                passwordForm.confirmPassword.length > 0 &&
                passwordForm.newPassword !== passwordForm.confirmPassword
              }
              helperText={
                passwordForm.confirmPassword.length > 0 &&
                passwordForm.newPassword !== passwordForm.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPasswordDialogOpen(false);
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            }}
            disabled={updating}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={
              updating ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword
            }
          >
            {updating ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
