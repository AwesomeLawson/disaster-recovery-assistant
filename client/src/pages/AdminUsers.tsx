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
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { userService } from '../services/user.service';
import type { User, UserRole } from '../types';

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
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.phoneNumber.includes(searchTerm)
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
      case 'worker':
        return 'info';
      case 'thirdParty':
        return 'default';
      default:
        return 'default';
    }
  };

  const openUserDialog = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
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
            placeholder="Search by email or phone..."
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
              <MenuItem value="worker">Worker</MenuItem>
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
                  primary={user.email}
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" component="span">
                        Phone: {user.phoneNumber}
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
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.email}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Phone Number
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.phoneNumber}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Communication Preference
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.communicationPreference}
                </Typography>

                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={selectedUser.roleApprovalStatus}
                  size="small"
                  color={getStatusColor(selectedUser.roleApprovalStatus) as any}
                  sx={{ mb: 2 }}
                />

                <Typography variant="subtitle2" color="text.secondary">
                  Current Roles
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {selectedUser.roles.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No roles assigned
                    </Typography>
                  ) : (
                    selectedUser.roles.map((role) => (
                      <Chip
                        key={role}
                        label={role}
                        size="small"
                        color={getRoleColor(role) as any}
                        sx={{ mr: 0.5 }}
                      />
                    ))
                  )}
                </Box>

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

                <Typography variant="subtitle2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedUser.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              {selectedUser.roleApprovalStatus === 'pending' && (
                <>
                  <Button
                    color="error"
                    onClick={() => handleApproveUser(selectedUser, false)}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleApproveUser(selectedUser, true)}
                  >
                    Approve
                  </Button>
                </>
              )}
              <Button onClick={() => setDialogOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};
