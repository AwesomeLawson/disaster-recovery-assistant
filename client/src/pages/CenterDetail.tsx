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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EventIcon from '@mui/icons-material/Event';
import AddIcon from '@mui/icons-material/Add';
import { centerService } from '../services/center.service';
import { eventService } from '../services/event.service';
import { userService } from '../services/user.service';
import { assessmentService } from '../services/assessment.service';
import { workgroupService } from '../services/workgroup.service';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import type { Center, Event, User, Assessment, Workgroup } from '../types';

export const CenterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [center, setCenter] = useState<Center | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [workgroups, setWorkgroups] = useState<Workgroup[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });

  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [addEventDialogOpen, setAddEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (id) {
      loadCenter();
    }
  }, [id]);

  const loadCenter = async () => {
    try {
      setLoading(true);
      const centerData = await centerService.getCenter(id!);
      setCenter(centerData);

      setEditForm({
        name: centerData.name,
        address: centerData.address,
        latitude: centerData.latitude,
        longitude: centerData.longitude,
      });

      const [allEventsData, usersData, assessmentsData, workgroupsData] = await Promise.all([
        eventService.listEvents(),
        userService.listUsers(),
        assessmentService.listAssessments({ centerId: id }),
        workgroupService.listWorkgroups({ centerId: id }),
      ]);

      setAllEvents(allEventsData);
      setAllUsers(usersData);
      setAssessments(assessmentsData);
      setWorkgroups(workgroupsData);

      // Get events associated with this center
      const centerEvents = allEventsData.filter((e) =>
        centerData.eventIds?.includes(e.id)
      );
      setEvents(centerEvents);

      const usersById: Record<string, User> = {};
      usersData.forEach((u) => {
        usersById[u.id] = u;
      });

      const centerLeads = centerData.leadUserIds.map((uid) => usersById[uid]).filter(Boolean);
      setLeads(centerLeads);
    } catch (err: any) {
      setError(err.message || 'Failed to load center');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCenter = async () => {
    if (!center) return;

    try {
      setUpdating(true);
      await centerService.updateCenter(center.id, {
        name: editForm.name,
        address: editForm.address,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
      });
      setEditDialogOpen(false);
      await loadCenter();
    } catch (err: any) {
      setError(err.message || 'Failed to update center');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddLead = async () => {
    if (!center || !selectedUser) return;

    try {
      setUpdating(true);
      await centerService.updateCenter(center.id, {
        leadUserIds: [...center.leadUserIds, selectedUser.id],
      });
      setAddLeadDialogOpen(false);
      setSelectedUser(null);
      await loadCenter();
    } catch (err: any) {
      setError(err.message || 'Failed to add lead');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddEvent = async () => {
    if (!center || !selectedEvent) return;

    try {
      setUpdating(true);
      await eventService.addCenterToEvent(selectedEvent.id, center.id);
      setAddEventDialogOpen(false);
      setSelectedEvent(null);
      await loadCenter();
    } catch (err: any) {
      setError(err.message || 'Failed to add event');
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'inProgress':
        return 'info';
      case 'partiallyCompleted':
        return 'warning';
      case 'needsEscalation':
        return 'error';
      default:
        return 'default';
    }
  };

  const availableLeads = allUsers.filter(
    (u) =>
      (u.roles.includes('workGroupLead') || u.roles.includes('administrator')) &&
      u.roleApprovalStatus === 'approved' &&
      !center?.leadUserIds.includes(u.id)
  );

  const availableEvents = allEvents.filter(
    (e) => !center?.eventIds?.includes(e.id)
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading center...</Typography>
      </Container>
    );
  }

  if (!center) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Center not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/centers')} sx={{ mt: 2 }}>
          Back to Centers
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/centers')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {center.name}
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
              Center Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <LocationOnIcon color="action" sx={{ mr: 1, mt: 0.25 }} />
                  <Typography variant="body1">{center.address}</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Coordinates
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {center.latitude && center.longitude
                    ? `${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`
                    : 'Not specified'}
                </Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {new Date(center.createdAt).toLocaleString()}
            </Typography>
          </Paper>

          {/* Events Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Associated Events ({events.length})</Typography>
              <Button size="small" startIcon={<EventIcon />} onClick={() => setAddEventDialogOpen(true)}>
                Add Event
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {events.length === 0 ? (
              <Typography color="text.secondary">
                No events associated with this center. Add events to track disaster response activities.
              </Typography>
            ) : (
              <List>
                {events.map((event) => (
                  <ListItem
                    key={event.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'grey.300',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar>
                        <EventIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{ cursor: 'pointer', color: 'primary.main' }}
                          onClick={() => navigate(`/events/${event.id}`)}
                        >
                          {event.name}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <Chip label={event.eventType} size="small" sx={{ mr: 1 }} />
                          {event.description && (
                            <Typography variant="caption" color="text.secondary">
                              {event.description}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Cases ({assessments.length})</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => {
                  const params = new URLSearchParams({ centerId: center.id });
                  if (events[0]) params.set('eventId', events[0].id);
                  navigate(`/assessments/create?${params.toString()}`);
                }}
              >
                Open Case
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {assessments.length === 0 ? (
              <Typography color="text.secondary">No cases at this center</Typography>
            ) : (
              <List>
                {assessments.map((assessment) => (
                  <ListItem
                    key={assessment.id}
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
                    onClick={() => navigate(`/assessments/${assessment.id}`)}
                  >
                    <ListItemText
                      primary={assessment.survivorName}
                      secondary={assessment.address}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {assessment.severity && (
                        <Chip
                          label={assessment.severity}
                          size="small"
                          color={getSeverityColor(assessment.severity) as any}
                        />
                      )}
                      {assessment.flaggedForReview && (
                        <Chip label="Flagged" size="small" color="warning" />
                      )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workgroups ({workgroups.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {workgroups.length === 0 ? (
              <Typography color="text.secondary">No workgroups at this center</Typography>
            ) : (
              <List>
                {workgroups.map((workgroup) => (
                  <ListItem
                    key={workgroup.id}
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
                    onClick={() => navigate(`/workgroups/${workgroup.id}`)}
                  >
                    <ListItemText
                      primary={workgroup.name}
                      secondary={`${workgroup.volunteerUserIds.length} volunteers`}
                    />
                    <Chip
                      label={workgroup.taskStatus}
                      size="small"
                      color={getStatusColor(workgroup.taskStatus) as any}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Leads ({leads.length})</Typography>
              <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAddLeadDialogOpen(true)}>
                Add Lead
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {leads.length === 0 ? (
              <Typography color="text.secondary">No leads assigned</Typography>
            ) : (
              <List dense>
                {leads.map((lead) => (
                  <ListItem key={lead.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {lead.email.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={lead.email}
                      secondary={lead.roles.join(', ')}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Edit Center Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Center</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <AddressAutocomplete
                required
                value={editForm.address}
                onChange={(address) =>
                  setEditForm({ ...editForm, address, latitude: undefined, longitude: undefined })
                }
                onPlaceSelect={({ address, latitude, longitude }) =>
                  setEditForm({ ...editForm, address, latitude, longitude })
                }
                coordinates={
                  editForm.latitude != null && editForm.longitude != null
                    ? { latitude: editForm.latitude, longitude: editForm.longitude }
                    : null
                }
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateCenter}
            disabled={updating || !editForm.name.trim() || !editForm.address.trim()}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={addLeadDialogOpen} onClose={() => setAddLeadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Lead to Center</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={availableLeads}
              getOptionLabel={(option) => `${option.email} (${option.roles.join(', ')})`}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              renderInput={(params) => <TextField {...params} label="Select Lead" />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddLeadDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddLead}
            disabled={updating || !selectedUser}
          >
            {updating ? 'Adding...' : 'Add Lead'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Event Dialog */}
      <Dialog open={addEventDialogOpen} onClose={() => setAddEventDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Associate Event with Center</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {availableEvents.length === 0 ? (
              <Typography color="text.secondary">
                No available events. Create an event first from the Events page.
              </Typography>
            ) : (
              <Autocomplete
                options={availableEvents}
                getOptionLabel={(option) => `${option.name} (${option.eventType})`}
                value={selectedEvent}
                onChange={(_, value) => setSelectedEvent(value)}
                renderInput={(params) => <TextField {...params} label="Select Event" />}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddEventDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddEvent}
            disabled={updating || !selectedEvent}
          >
            {updating ? 'Adding...' : 'Add Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
