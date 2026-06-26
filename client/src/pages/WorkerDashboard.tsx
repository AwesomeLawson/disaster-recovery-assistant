import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useAuth } from '../context/AuthContext';
import { workgroupService } from '../services/workgroup.service';
import { eventService } from '../services/event.service';
import { userEventDataService } from '../services/userEventData.service';
import type { Workgroup, Event, UserEventData } from '../types';

export const WorkerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [myWorkgroups, setMyWorkgroups] = useState<Workgroup[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [events, setEvents] = useState<Event[]>([]);
  const [myEventData, setMyEventData] = useState<UserEventData[]>([]);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [editRanges, setEditRanges] = useState<{ start: string; end: string }[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [allWorkgroups, allEvents, eventData] = await Promise.all([
        workgroupService.listWorkgroups(),
        eventService.listEvents(),
        userEventDataService.listMine(),
      ]);
      setMyWorkgroups(allWorkgroups.filter((w) => w.volunteerUserIds.includes(user?.id || '')));
      setEvents(allEvents);
      setMyEventData(eventData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const myEvents = events.filter((e) => (user?.eventIds || []).includes(e.id));

  const openEditDialog = (eventId: string) => {
    const data = myEventData.find((d) => d.eventId === eventId);
    setEditRanges(
      (data?.submittedAvailability ?? []).map((r) => ({
        start: new Date(r.start).toISOString().split('T')[0],
        end: new Date(r.end).toISOString().split('T')[0],
      }))
    );
    setEditEventId(eventId);
    setEditError('');
    setEditDialogOpen(true);
  };

  const handleSaveAvailability = async () => {
    if (!editEventId) return;
    for (const r of editRanges) {
      if (!r.start || !r.end) {
        setEditError('Please complete all date ranges or remove incomplete ones');
        return;
      }
      if (r.start > r.end) {
        setEditError('End date must be after start date');
        return;
      }
    }
    setEditSaving(true);
    setEditError('');
    try {
      await userEventDataService.setAvailability(
        editEventId,
        editRanges.map((r) => ({ start: new Date(r.start).getTime(), end: new Date(r.end).getTime() }))
      );
      setEditDialogOpen(false);
      setMyEventData(await userEventDataService.listMine());
    } catch (err: any) {
      setEditError(err.message || 'Failed to save availability');
    } finally {
      setEditSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'inProgress': return 'primary';
      case 'needsEscalation': return 'error';
      case 'partiallyCompleted': return 'warning';
      default: return 'default';
    }
  };

  const activeWorkgroups = myWorkgroups.filter((w) => w.taskStatus !== 'completed');
  const completedWorkgroups = myWorkgroups.filter((w) => w.taskStatus === 'completed');
  const editEventName = events.find((e) => e.id === editEventId)?.name ?? '';

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Volunteer Dashboard</Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {user?.firstName} {user?.lastName}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Tasks</Typography>
              </Box>
              <Typography variant="h3">{activeWorkgroups.length}</Typography>
            </CardContent>
            <CardActions>
              <Button size="small" onClick={() => navigate('/workgroups')}>View All</Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WorkIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Completed</Typography>
              </Box>
              <Typography variant="h3">{completedWorkgroups.length}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* My Availability */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarMonthIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">My Availability</Typography>
            </Box>
            {myEvents.length === 0 ? (
              <Typography color="text.secondary">
                You're not signed up for any events yet. Contact an administrator to be added to an event.
              </Typography>
            ) : (
              myEvents.map((ev) => {
                const data = myEventData.find((d) => d.eventId === ev.id);
                const submitted = data?.submittedAvailability ?? [];
                const confirmed = data?.confirmedDates ?? [];
                return (
                  <Box key={ev.id} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>{ev.name}</Typography>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => openEditDialog(ev.id)}>
                        Edit Availability
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          My Available Dates
                        </Typography>
                        {submitted.length === 0 ? (
                          <Typography variant="body2" color="text.secondary">None submitted</Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {submitted.map((r, i) => (
                              <Chip
                                key={i}
                                label={`${new Date(r.start).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      {confirmed.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Confirmed Dates
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {confirmed.map((r, i) => (
                              <Chip
                                key={i}
                                label={`${new Date(r.start).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}`}
                                size="small"
                                color="success"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })
            )}
          </Paper>
        </Grid>

        {/* Active Assignments */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>My Active Assignments</Typography>
            {activeWorkgroups.length === 0 ? (
              <Typography color="text.secondary">
                No active assignments. Check back later for new work opportunities.
              </Typography>
            ) : (
              <List>
                {activeWorkgroups.map((workgroup) => (
                  <ListItem
                    key={workgroup.id}
                    sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                    onClick={() => navigate(`/workgroups/${workgroup.id}`)}
                  >
                    <ListItemText
                      primary={workgroup.name}
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" component="span">{workgroup.taskDescription}</Typography>
                          <Box sx={{ mt: 0.5 }}>
                            <Chip label={workgroup.taskStatus} size="small" color={getStatusColor(workgroup.taskStatus) as any} sx={{ mr: 1 }} />
                            <Chip label={`${workgroup.progressNotes.length} updates`} size="small" variant="outlined" />
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {completedWorkgroups.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Recently Completed</Typography>
              <List>
                {completedWorkgroups.slice(0, 5).map((workgroup) => (
                  <ListItem
                    key={workgroup.id}
                    sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' } }}
                    onClick={() => navigate(`/workgroups/${workgroup.id}`)}
                  >
                    <ListItemText primary={workgroup.name} secondary={workgroup.taskDescription} />
                    <Chip label="Completed" size="small" color="success" />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Availability — {editEventName}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add the date ranges when you're available to serve at this event.
            </Typography>
            {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
            {editRanges.map((range, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  size="small"
                  type="date"
                  label="From"
                  InputLabelProps={{ shrink: true }}
                  value={range.start}
                  onChange={(e) => setEditRanges((prev) => prev.map((r, j) => j === i ? { ...r, start: e.target.value } : r))}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="date"
                  label="To"
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: range.start }}
                  value={range.end}
                  onChange={(e) => setEditRanges((prev) => prev.map((r, j) => j === i ? { ...r, end: e.target.value } : r))}
                  sx={{ flex: 1 }}
                />
                <IconButton size="small" onClick={() => setEditRanges((prev) => prev.filter((_, j) => j !== i))}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setEditRanges((prev) => [...prev, { start: '', end: '' }])}
              sx={{ mt: 1 }}
            >
              Add Dates
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={editSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveAvailability} disabled={editSaving}>
            {editSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
