import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import type { CommunicationPreference } from '../types';
import SearchIcon from '@mui/icons-material/Search';
import { userService } from '../services/user.service';
import type { User, UserRole } from '../types';

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'assessor', label: 'Assessor' },
  { value: 'workGroupLead', label: 'Work Group Lead' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'thirdParty', label: 'Third Party' },
];

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([]);
  const [editingProfile, setEditingProfile] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    communicationPreference: 'email' as CommunicationPreference,
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
  });
  const [saving, setSaving] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ creationTime: string; lastSignInTime: string; providers: string[] } | null>(null);
  const [authInfoLoading, setAuthInfoLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.listUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(term) ||
          u.phoneNumber.includes(term) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.roleApprovalStatus === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.roles.includes(roleFilter as UserRole));
    }

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, roleFilter, users]);

  const handleApproveUser = async (user: User, approve: boolean) => {
    try {
      await userService.approveUserRole(user.id, approve, user.requestedRoles || []);
      await loadUsers();
      setDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
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

  const openUserDialog = async (user: User) => {
    setSelectedUser(user);
    setEditingRoles([...user.roles]);
    setEditingProfile({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.phoneNumber || '',
      communicationPreference: user.communicationPreference || 'email',
      addressStreet: user.address?.street || '',
      addressCity: user.address?.city || '',
      addressState: user.address?.state || '',
      addressZip: user.address?.zip || '',
    });
    setAuthInfo(null);
    setDialogOpen(true);
    setAuthInfoLoading(true);
    try {
      const info = await userService.getUserAuthInfo(user.id);
      setAuthInfo(info);
    } catch {
      // non-fatal — auth info just won't show
    } finally {
      setAuthInfoLoading(false);
    }
  };

  const handleRoleToggle = (role: UserRole) => {
    setEditingRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const hasAddress = editingProfile.addressStreet || editingProfile.addressCity || editingProfile.addressState || editingProfile.addressZip;
      await Promise.all([
        userService.updateUserProfile(selectedUser.id, {
          firstName: editingProfile.firstName,
          lastName: editingProfile.lastName,
          phoneNumber: editingProfile.phoneNumber,
          communicationPreference: editingProfile.communicationPreference,
          address: hasAddress
            ? { street: editingProfile.addressStreet, city: editingProfile.addressCity, state: editingProfile.addressState, zip: editingProfile.addressZip }
            : undefined,
        }),
        userService.updateUserRoles(selectedUser.id, editingRoles),
      ]);
      await loadUsers();
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading users...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">User Management</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleFilter}
              label="Role"
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <MenuItem value="all">All Roles</MenuItem>
              <MenuItem value="administrator">Administrator</MenuItem>
              <MenuItem value="assessor">Assessor</MenuItem>
              <MenuItem value="workGroupLead">Work Group Lead</MenuItem>
              <MenuItem value="volunteer">Volunteer</MenuItem>
              <MenuItem value="thirdParty">Third Party</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {filteredUsers.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'No users match your filters'
              : 'No users found'}
          </Typography>
        ) : (
          <List>
            {filteredUsers.map((user) => (
              <ListItem
                key={user.id}
                sx={{
                  border: '1px solid',
                  borderColor: 'grey.300',
                  borderRadius: 1,
                  mb: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'grey.50',
                  },
                }}
                onClick={() => openUserDialog(user)}
              >
                <ListItemText
                  primary={`${user.firstName} ${user.lastName}`}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        {user.email} &bull; {user.phoneNumber}
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={user.roleApprovalStatus}
                          size="small"
                          color={getStatusColor(user.roleApprovalStatus) as any}
                          sx={{ mr: 1 }}
                        />
                        {user.roles.map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            size="small"
                            color={getRoleColor(role) as any}
                            variant="outlined"
                            sx={{ mr: 0.5 }}
                          />
                        ))}
                        {user.requestedRoles && user.requestedRoles.length > 0 && user.roleApprovalStatus === 'pending' && (
                          <>
                            <Typography variant="caption" sx={{ mx: 1 }}>
                              Requested:
                            </Typography>
                            {user.requestedRoles.map((role) => (
                              <Chip
                                key={`req-${role}`}
                                label={role}
                                size="small"
                                variant="outlined"
                                color="warning"
                                sx={{ mr: 0.5 }}
                              />
                            ))}
                          </>
                        )}
                      </Box>
                    </Box>
                  }
                />
                {user.roleApprovalStatus === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveUser(user, true);
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApproveUser(user, false);
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedUser && (
          <>
            <DialogTitle>User Details</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="First Name"
                    value={editingProfile.firstName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, firstName: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Last Name"
                    value={editingProfile.lastName}
                    onChange={(e) => setEditingProfile({ ...editingProfile, lastName: e.target.value })}
                  />
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.email}
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Phone Number"
                  value={editingProfile.phoneNumber}
                  onChange={(e) => setEditingProfile({ ...editingProfile, phoneNumber: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Communication Preference</InputLabel>
                  <Select
                    value={editingProfile.communicationPreference}
                    label="Communication Preference"
                    onChange={(e) => setEditingProfile({ ...editingProfile, communicationPreference: e.target.value as CommunicationPreference })}
                  >
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  size="small"
                  label="Street"
                  value={editingProfile.addressStreet}
                  onChange={(e) => setEditingProfile({ ...editingProfile, addressStreet: e.target.value })}
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="City"
                    value={editingProfile.addressCity}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressCity: e.target.value })}
                  />
                  <TextField
                    size="small"
                    sx={{ width: 90 }}
                    label="State"
                    value={editingProfile.addressState}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressState: e.target.value })}
                  />
                  <TextField
                    size="small"
                    sx={{ width: 110 }}
                    label="ZIP"
                    value={editingProfile.addressZip}
                    onChange={(e) => setEditingProfile({ ...editingProfile, addressZip: e.target.value })}
                  />
                </Box>

                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedUser.roleApprovalStatus}
                  size="small"
                  color={getStatusColor(selectedUser.roleApprovalStatus) as any}
                  sx={{ mb: 2 }}
                />

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Roles
                </Typography>
                <FormGroup row>
                  {ALL_ROLES.map(({ value, label }) => (
                    <FormControlLabel
                      key={value}
                      control={
                        <Checkbox
                          checked={editingRoles.includes(value)}
                          onChange={() => handleRoleToggle(value)}
                          size="small"
                        />
                      }
                      label={label}
                      sx={{ minWidth: 160 }}
                    />
                  ))}
                </FormGroup>
                <Divider sx={{ my: 2 }} />

                {selectedUser.requestedRoles && selectedUser.requestedRoles.length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Requested Roles
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {selectedUser.requestedRoles.map((role) => (
                        <Chip
                          key={`req-${role}`}
                          label={role}
                          size="small"
                          variant="outlined"
                          color="warning"
                          sx={{ mr: 0.5 }}
                        />
                      ))}
                    </Box>
                  </>
                )}

                <Typography variant="subtitle2" color="text.secondary">
                  Legal Release Signed
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.legalReleaseSigned ? 'Yes' : 'No'}
                </Typography>

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Account Activity
                </Typography>
                {authInfoLoading ? (
                  <Typography variant="body2" color="text.secondary">Loading…</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Profile Created</Typography>
                      <Typography variant="body2">{new Date(selectedUser.createdAt).toLocaleString()}</Typography>
                    </Box>
                    {authInfo && (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Auth Account Created</Typography>
                          <Typography variant="body2">{new Date(authInfo.creationTime).toLocaleString()}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Last Sign-In</Typography>
                          <Typography variant="body2">{new Date(authInfo.lastSignInTime).toLocaleString()}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">Sign-In Method</Typography>
                          <Typography variant="body2">
                            {authInfo.providers.map((p) =>
                              p === 'password' ? 'Email/Password' :
                              p === 'google.com' ? 'Google' :
                              p === 'facebook.com' ? 'Facebook' : p
                            ).join(', ')}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              {selectedUser.roleApprovalStatus === 'pending' && (
                <>
                  <Button
                    color="error"
                    onClick={() => handleApproveUser(selectedUser, false)}
                    disabled={saving}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleApproveUser(selectedUser, true)}
                    disabled={saving}
                  >
                    Approve
                  </Button>
                </>
              )}
              <Box sx={{ flex: 1 }} />
              <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || !editingProfile.firstName.trim() || !editingProfile.lastName.trim()}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
