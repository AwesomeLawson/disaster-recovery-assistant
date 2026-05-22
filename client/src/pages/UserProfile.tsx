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
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import type { CommunicationPreference, AvailabilityRange } from '../types';

export const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    communicationPreference: 'email' as CommunicationPreference,
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    organization: '',
  });
  const [editAvailability, setEditAvailability] = useState<{ start: string; end: string }[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    userService.listOrganizations().then(setOrganizations).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber,
        communicationPreference: user.communicationPreference,
        addressStreet: user.address?.street || '',
        addressCity: user.address?.city || '',
        addressState: user.address?.state || '',
        addressZip: user.address?.zip || '',
        organization: user.organization || '',
      });
      setEditAvailability(
        (user.availability || []).map((r) => ({
          start: new Date(r.start).toISOString().split('T')[0],
          end: new Date(r.end).toISOString().split('T')[0],
        }))
      );
    }
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      setUpdating(true);
      const hasAddress = editForm.addressStreet || editForm.addressCity || editForm.addressState || editForm.addressZip;
      const availabilityRanges: AvailabilityRange[] = editAvailability
        .filter((r) => r.start && r.end)
        .map((r) => ({ start: new Date(r.start).getTime(), end: new Date(r.end).getTime() }));
      await userService.updateUserProfile(user.id, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        phoneNumber: editForm.phoneNumber,
        communicationPreference: editForm.communicationPreference,
        address: hasAddress
          ? { street: editForm.addressStreet, city: editForm.addressCity, state: editForm.addressState, zip: editForm.addressZip }
          : undefined,
        organization: editForm.organization.trim() || undefined,
        availability: availabilityRanges.length ? availabilityRanges : undefined,
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
      case 'volunteer':
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
                  First Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.firstName}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Name
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.lastName}
                </Typography>
              </Grid>
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

            {user.address && (user.address.street || user.address.city) && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {[user.address.street, user.address.city, user.address.state, user.address.zip]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              </>
            )}

            {user.organization && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Church / Organization
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {user.organization}
                </Typography>
              </>
            )}

            {user.availability && user.availability.length > 0 && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Availability
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {user.availability.map((r, i) => (
                    <Chip
                      key={i}
                      label={`${new Date(r.start).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}`}
                      size="small"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </>
            )}

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
            <Box sx={{ mb: 2 }}>
              <Chip
                label={user.legalReleaseSigned ? 'Signed' : 'Not Signed'}
                color={user.legalReleaseSigned ? 'success' : 'warning'}
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Background Check
            </Typography>
            <Box>
              <Chip
                label={user.lastBackgroundCheck ? new Date(user.lastBackgroundCheck).toLocaleDateString() : 'Not on file'}
                color={user.lastBackgroundCheck ? 'success' : 'default'}
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
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                required
                label="First Name"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              />
              <TextField
                fullWidth
                required
                label="Last Name"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              label="Phone Number"
              value={editForm.phoneNumber}
              onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Address (optional)
            </Typography>
            <TextField
              fullWidth
              label="Street"
              value={editForm.addressStreet}
              onChange={(e) => setEditForm({ ...editForm, addressStreet: e.target.value })}
              sx={{ mb: 1 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="City"
                value={editForm.addressCity}
                onChange={(e) => setEditForm({ ...editForm, addressCity: e.target.value })}
              />
              <TextField
                sx={{ width: 100 }}
                label="State"
                value={editForm.addressState}
                onChange={(e) => setEditForm({ ...editForm, addressState: e.target.value })}
              />
              <TextField
                sx={{ width: 120 }}
                label="ZIP"
                value={editForm.addressZip}
                onChange={(e) => setEditForm({ ...editForm, addressZip: e.target.value })}
              />
            </Box>

            <Autocomplete
              freeSolo
              options={organizations}
              value={editForm.organization}
              onInputChange={(_, val) => setEditForm({ ...editForm, organization: val })}
              renderInput={(params) => (
                <TextField {...params} fullWidth label="Church / Organization (optional)" sx={{ mb: 2 }} />
              )}
            />

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  Availability (optional)
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setEditAvailability((p) => [...p, { start: '', end: '' }])}>
                  Add Range
                </Button>
              </Box>
              {editAvailability.map((range, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField
                    size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                    value={range.start}
                    onChange={(e) => setEditAvailability((p) => p.map((r, j) => j === i ? { ...r, start: e.target.value } : r))}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                    inputProps={{ min: range.start }}
                    value={range.end}
                    onChange={(e) => setEditAvailability((p) => p.map((r, j) => j === i ? { ...r, end: e.target.value } : r))}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => setEditAvailability((p) => p.filter((_, j) => j !== i))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            disabled={updating || !editForm.phoneNumber.trim() || !editForm.firstName.trim() || !editForm.lastName.trim()}
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
