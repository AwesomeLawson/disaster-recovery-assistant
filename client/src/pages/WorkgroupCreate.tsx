import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { workgroupService } from '../services/workgroup.service';
import { eventService } from '../services/event.service';
import { baseCampService } from '../services/baseCamp.service';
import { userService } from '../services/user.service';
import { workOrderService } from '../services/workOrder.service';
import { useAuth } from '../context/AuthContext';
import type { Event, BaseCamp, User, WorkOrder, WorkgroupFormData } from '../types';

export const WorkgroupCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedWorkOrderId = searchParams.get('workOrderId');

  const [events, setEvents] = useState<Event[]>([]);
  const [baseCamps, setBaseCamps] = useState<BaseCamp[]>([]);
  const [filteredBaseCamps, setFilteredBaseCamps] = useState<BaseCamp[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableVolunteers, setAvailableWorkers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<WorkgroupFormData>({
    name: '',
    baseCampId: '',
    eventId: '',
    leadUserId: '',
    volunteerUserIds: [],
    workOrderId: '',
    taskDescription: '',
  });

  const [selectedVolunteers, setSelectedWorkers] = useState<User[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.eventId) {
      const eventBaseCamps = baseCamps.filter((c) => formData.eventId && c.eventIds.includes(formData.eventId));
      setFilteredBaseCamps(eventBaseCamps);

      if (!eventBaseCamps.find((c) => c.id === formData.baseCampId)) {
        setFormData((prev) => ({ ...prev, baseCampId: '', workOrderId: '' }));
      }
    } else {
      // Show all base camps when no event is selected
      setFilteredBaseCamps(baseCamps);
    }
  }, [formData.eventId, baseCamps]);

  useEffect(() => {
    if (formData.baseCampId) {
      const baseCampWorkOrders = workOrders.filter((a) => a.baseCampId === formData.baseCampId);
      setFilteredWorkOrders(baseCampWorkOrders);

      if (!baseCampWorkOrders.find((a) => a.id === formData.workOrderId)) {
        setFormData((prev) => ({ ...prev, workOrderId: '' }));
      }
    } else if (formData.eventId) {
      const eventWorkOrders = workOrders.filter((a) => a.eventId === formData.eventId);
      setFilteredWorkOrders(eventWorkOrders);
    } else {
      setFilteredWorkOrders(workOrders);
    }
  }, [formData.baseCampId, formData.eventId, workOrders]);

  useEffect(() => {
    const workers = users.filter(
      (u) =>
        (u.roles.includes('volunteer') || u.roles.includes('workGroupLead')) &&
        u.roleApprovalStatus === 'approved'
    );
    setAvailableWorkers(workers);
  }, [users]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [eventsData, baseCampsData, workOrdersData, usersData] = await Promise.all([
        eventService.listEvents(),
        baseCampService.listBaseCamps(),
        workOrderService.listWorkOrders(),
        userService.listUsers(),
      ]);

      setEvents(eventsData);
      setBaseCamps(baseCampsData);
      setWorkOrders(workOrdersData);
      setUsers(usersData);

      // Set current user as lead if they are a workGroupLead
      if (user?.roles.includes('workGroupLead') || user?.roles.includes('administrator')) {
        setFormData((prev) => ({ ...prev, leadUserId: user.id }));
      }

      // Handle preselected work order
      if (preselectedWorkOrderId) {
        const workOrder = workOrdersData.find((a: WorkOrder) => a.id === preselectedWorkOrderId);
        if (workOrder) {
          setFormData((prev) => ({
            ...prev,
            workOrderId: workOrder.id,
            eventId: workOrder.eventId || '',
            baseCampId: workOrder.baseCampId,
            name: `Workgroup for ${workOrder.survivorName}`,
          }));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.baseCampId) {
      setError('Base camp is required');
      return;
    }
    if (!formData.workOrderId) {
      setError('Work order is required');
      return;
    }
    if (!formData.leadUserId) {
      setError('Lead is required');
      return;
    }
    if (!formData.taskDescription.trim()) {
      setError('Task description is required');
      return;
    }

    try {
      setSubmitting(true);
      const workgroup = await workgroupService.createWorkgroup({
        ...formData,
        volunteerUserIds: selectedVolunteers.map((w) => w.id),
      });
      navigate(`/workgroups/${workgroup.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create workgroup');
    } finally {
      setSubmitting(false);
    }
  };

  const leads = users.filter(
    (u) =>
      (u.roles.includes('workGroupLead') || u.roles.includes('administrator')) &&
      u.roleApprovalStatus === 'approved'
  );

  if (loading) {
    return (
      <Container maxWidth="md">
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/workgroups')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">Create Workgroup</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Workgroup Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Event (Optional)</InputLabel>
                <Select
                  value={formData.eventId}
                  label="Event (Optional)"
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>
                      {event.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Base Camp</InputLabel>
                <Select
                  value={formData.baseCampId}
                  label="Base Camp"
                  onChange={(e) => setFormData({ ...formData, baseCampId: e.target.value })}
                >
                  {filteredBaseCamps.map((baseCamp) => (
                    <MenuItem key={baseCamp.id} value={baseCamp.id}>
                      {baseCamp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required>
                <InputLabel>Work Order</InputLabel>
                <Select
                  value={formData.workOrderId}
                  label="Work Order"
                  onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}
                >
                  {filteredWorkOrders.map((workOrder) => (
                    <MenuItem key={workOrder.id} value={workOrder.id}>
                      {workOrder.survivorName} — {workOrder.address}{workOrder.severity ? ` (${workOrder.severity})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Task Description"
                value={formData.taskDescription}
                onChange={(e) => setFormData({ ...formData, taskDescription: e.target.value })}
                required
                placeholder="Describe the work that needs to be done..."
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Lead</InputLabel>
                <Select
                  value={formData.leadUserId}
                  label="Lead"
                  onChange={(e) => setFormData({ ...formData, leadUserId: e.target.value })}
                >
                  {leads.map((lead) => (
                    <MenuItem key={lead.id} value={lead.id}>
                      {lead.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete
                multiple
                options={availableVolunteers.filter((w) => w.id !== formData.leadUserId)}
                getOptionLabel={(option) => option.email}
                value={selectedVolunteers}
                onChange={(_, value) => setSelectedWorkers(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Volunteers (optional)" placeholder="Select volunteers" />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={option.email}
                      size="small"
                    />
                  ))
                }
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/workgroups')} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Workgroup'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};
