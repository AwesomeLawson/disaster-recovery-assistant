import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Autocomplete,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { groupService } from '../services/group.service';
import { centerService } from '../services/center.service';
import { userService } from '../services/user.service';
import type { Group, Center, User } from '../types';

export const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    eventType: '',
    description: '',
  });

  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (id) {
      loadGroup();
    }
  }, [id]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const [groupData, centersData, usersData] = await Promise.all([
        groupService.getGroup(id!),
        centerService.listCenters(id),
        userService.listUsers(),
      ]);

      setGroup(groupData);
      setCenters(centersData);
      setAllUsers(usersData);

      setEditForm({
        name: groupData.name,
        eventType: groupData.eventType,
        description: groupData.description || '',
      });

      const usersById: Record<string, User> = {};
      usersData.forEach((u) => {
        usersById[u.id] = u;
      });
      setUsers(usersData);

      const groupMembers = groupData.userIds.map((uid) => usersById[uid]).filter(Boolean);
      setMembers(groupMembers);
    } catch (err: any) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!group) return;

    try {
      setUpdating(true);
      await groupService.updateGroup(group.id, {
        name: editForm.name,
        eventType: editForm.eventType,
        description: editForm.description || undefined,
      });
      setEditDialogOpen(false);
      await loadGroup();
    } catch (err: any) {
      setError(err.message || 'Failed to update group');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (!group || !selectedUser) return;

    try {
      setUpdating(true);
      await groupService.addUserToGroup(group.id, selectedUser.id);
      setAddMemberDialogOpen(false);
      setSelectedUser(null);
      await loadGroup();
    } catch (err: any) {
      setError(err.message || 'Failed to add member');
    } finally {
      setUpdating(false);
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'hurricane':
        return 'error';
      case 'flood':
        return 'info';
      case 'tornado':
        return 'warning';
      case 'earthquake':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const availableUsers = allUsers.filter(
    (u) => u.roleApprovalStatus === 'approved' && !group?.userIds.includes(u.id)
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading group...</Typography>
      </Container>
    );
  }

  if (!group) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Group not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/groups')} sx={{ mt: 2 }}>
          Back to Groups
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/groups')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {group.name}
        </Typography>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditDialogOpen(true)}>
          Edit
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Event Type
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={group.eventType}
                color={getEventTypeColor(group.eventType) as any}
              />
            </Box>

            {group.description && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {group.description}
                </Typography>
              </>
            )}

            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {new Date(group.createdAt).toLocaleString()}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Centers ({centers.length})</Typography>
              <Button
                size="small"
                startIcon={<LocationCityIcon />}
                onClick={() => navigate('/centers')}
              >
                Manage Centers
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {centers.length === 0 ? (
              <Typography color="text.secondary">No centers in this group</Typography>
            ) : (
              <List>
                {centers.map((center) => (
                  <ListItem
                    key={center.id}
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
                    onClick={() => navigate(`/centers/${center.id}`)}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <LocationCityIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={center.name}
                      secondary={center.address}
                    />
                    <Chip label={`${center.leadUserIds.length} leads`} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Members ({members.length})</Typography>
              <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAddMemberDialogOpen(true)}>
                Add Member
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {members.length === 0 ? (
              <Typography color="text.secondary">No members in this group</Typography>
            ) : (
              <List dense>
                {members.map((member) => (
                  <ListItem key={member.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {member.email.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.email}
                      secondary={member.roles.join(', ')}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Event Type"
              value={editForm.eventType}
              onChange={(e) => setEditForm({ ...editForm, eventType: e.target.value })}
              placeholder="e.g., Hurricane, Flood, Tornado"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description (optional)"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateGroup}
            disabled={updating || !editForm.name.trim() || !editForm.eventType.trim()}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to Group</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={availableUsers}
              getOptionLabel={(option) => `${option.email} (${option.roles.join(', ')})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              renderInput={(params) => <TextField {...params} label="Select User" />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemberDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddMember}
            disabled={updating || !selectedUser}
          >
            {updating ? 'Adding...' : 'Add Member'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
