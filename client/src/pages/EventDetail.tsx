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
import { eventService } from '../services/event.service';
import { centerService } from '../services/center.service';
import { userService } from '../services/user.service';
import { assessmentService } from '../services/assessment.service';
import { AssessmentMap } from '../components/AssessmentMap';
import type { Event, Center, User, Assessment } from '../types';

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [, setUsers] = useState<User[]>([]);
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
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const [eventData, centersData, usersData] = await Promise.all([
        eventService.getEvent(id!),
        centerService.listCenters(id),
        userService.listUsers(),
      ]);

      setEvent(eventData);
      setCenters(centersData);
      setAllUsers(usersData);

      setEditForm({
        name: eventData.name,
        eventType: eventData.eventType,
        description: eventData.description || '',
      });

      const usersById: Record<string, User> = {};
      usersData.forEach((u) => {
        usersById[u.id] = u;
      });
      setUsers(usersData);

      const eventMembers = eventData.userIds.map((uid) => usersById[uid]).filter(Boolean);
      setMembers(eventMembers);
    } catch (err: any) {
      setError(err.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }

    // Load assessments separately so a failure here doesn't block the event from rendering
    assessmentService.listAssessments({ eventId: id })
      .then(setAssessments)
      .catch(() => {});
  };

  const handleUpdateEvent = async () => {
    if (!event) return;

    try {
      setUpdating(true);
      await eventService.updateEvent(event.id, {
        name: editForm.name,
        eventType: editForm.eventType,
        description: editForm.description || undefined,
      });
      setEditDialogOpen(false);
      await loadEvent();
    } catch (err: any) {
      setError(err.message || 'Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMember = async () => {
    if (!event || !selectedUser) return;

    try {
      setUpdating(true);
      await eventService.addUserToEvent(event.id, selectedUser.id);
      setAddMemberDialogOpen(false);
      setSelectedUser(null);
      await loadEvent();
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
    (u) => u.roleApprovalStatus === 'approved' && !event?.userIds.includes(u.id)
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading event...</Typography>
      </Container>
    );
  }

  if (!event) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Event not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/events')} sx={{ mt: 2 }}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/events')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {event.name}
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
              Event Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Event Type
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={event.eventType}
                color={getEventTypeColor(event.eventType) as any}
              />
            </Box>

            {event.description && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {event.description}
                </Typography>
              </>
            )}

            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {new Date(event.createdAt).toLocaleString()}
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
              <Typography color="text.secondary">No centers associated with this event</Typography>
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
              <Typography color="text.secondary">No members assigned to this event</Typography>
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

        {/* Assessment Map - full width */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Assessment Map ({assessments.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <AssessmentMap assessments={assessments} />
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Event Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
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
            onClick={handleUpdateEvent}
            disabled={updating || !editForm.name.trim() || !editForm.eventType.trim()}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onClose={() => setAddMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member to Event</DialogTitle>
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
