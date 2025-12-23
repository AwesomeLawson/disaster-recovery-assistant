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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
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
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { workgroupService } from '../services/workgroup.service';
import { groupService } from '../services/group.service';
import { centerService } from '../services/center.service';
import { userService } from '../services/user.service';
import { assessmentService } from '../services/assessment.service';
import { escalationService } from '../services/escalation.service';
import { useAuth } from '../context/AuthContext';
import type { Workgroup, WorkgroupTaskStatus, Group, Center, User, Assessment, EscalationFormData } from '../types';

export const WorkgroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workgroup, setWorkgroup] = useState<Workgroup | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [center, setCenter] = useState<Center | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [lead, setLead] = useState<User | null>(null);
  const [workers, setWorkers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<WorkgroupTaskStatus>('notStarted');
  const [statusNote, setStatusNote] = useState('');
  const [statusPhotos, setStatusPhotos] = useState<File[]>([]);
  const [updating, setUpdating] = useState(false);

  const [addWorkerDialogOpen, setAddWorkerDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<User | null>(null);

  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [escalationType, setEscalationType] = useState<'assessor' | 'administrative' | 'thirdParty'>('administrative');

  useEffect(() => {
    if (id) {
      loadWorkgroup();
    }
  }, [id]);

  const loadWorkgroup = async () => {
    try {
      setLoading(true);
      const data = await workgroupService.getWorkgroup(id!);
      setWorkgroup(data);
      setNewStatus(data.taskStatus);

      const [groupData, centerData, assessmentData, allUsersData] = await Promise.all([
        groupService.getGroup(data.groupId),
        centerService.getCenter(data.centerId),
        assessmentService.getAssessment(data.assessmentId),
        userService.listUsers(),
      ]);

      setGroup(groupData);
      setCenter(centerData);
      setAssessment(assessmentData);
      setAllUsers(allUsersData);

      const usersById: Record<string, User> = {};
      allUsersData.forEach((u) => {
        usersById[u.id] = u;
      });
      setUsersMap(usersById);

      setLead(usersById[data.leadUserId] || null);
      setWorkers(data.workerUserIds.map((uid) => usersById[uid]).filter(Boolean));
    } catch (err: any) {
      setError(err.message || 'Failed to load workgroup');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!workgroup) return;

    try {
      setUpdating(true);

      let photoUrls: string[] | undefined;
      if (statusPhotos.length > 0) {
        photoUrls = await workgroupService.uploadPhotos(statusPhotos, workgroup.id);
      }

      await workgroupService.updateWorkgroupStatus(
        workgroup.id,
        newStatus,
        statusNote || undefined,
        photoUrls
      );

      setStatusDialogOpen(false);
      setStatusNote('');
      setStatusPhotos([]);
      await loadWorkgroup();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddWorker = async () => {
    if (!workgroup || !selectedWorker) return;

    try {
      setUpdating(true);
      await workgroupService.addWorkerToWorkgroup(workgroup.id, selectedWorker.id);
      setAddWorkerDialogOpen(false);
      setSelectedWorker(null);
      await loadWorkgroup();
    } catch (err: any) {
      setError(err.message || 'Failed to add worker');
    } finally {
      setUpdating(false);
    }
  };

  const handleEscalate = async () => {
    if (!workgroup || !escalationReason.trim()) return;

    try {
      setUpdating(true);
      const escalationData: EscalationFormData = {
        workgroupId: workgroup.id,
        centerId: workgroup.centerId,
        groupId: workgroup.groupId,
        type: escalationType,
        reason: escalationReason,
        assessmentId: workgroup.assessmentId,
      };
      await escalationService.createEscalation(escalationData);

      if (newStatus !== 'needsEscalation') {
        await workgroupService.updateWorkgroupStatus(workgroup.id, 'needsEscalation');
      }

      setEscalateDialogOpen(false);
      setEscalationReason('');
      await loadWorkgroup();
    } catch (err: any) {
      setError(err.message || 'Failed to create escalation');
    } finally {
      setUpdating(false);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'notStarted':
        return 'Not Started';
      case 'inProgress':
        return 'In Progress';
      case 'partiallyCompleted':
        return 'Partially Completed';
      case 'completed':
        return 'Completed';
      case 'needsEscalation':
        return 'Needs Escalation';
      default:
        return status;
    }
  };

  const canManage =
    user?.roles.includes('administrator') ||
    user?.roles.includes('workGroupLead') ||
    user?.id === workgroup?.leadUserId;

  const availableWorkers = allUsers.filter(
    (u) =>
      (u.roles.includes('worker') || u.roles.includes('workGroupLead')) &&
      !workgroup?.workerUserIds.includes(u.id) &&
      u.id !== workgroup?.leadUserId
  );

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading workgroup...</Typography>
      </Container>
    );
  }

  if (!workgroup) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Workgroup not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/workgroups')} sx={{ mt: 2 }}>
          Back to Workgroups
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/workgroups')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {workgroup.name}
        </Typography>
        {canManage && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={() => setStatusDialogOpen(true)}>
              Update Status
            </Button>
            <Button variant="outlined" color="error" onClick={() => setEscalateDialogOpen(true)}>
              Escalate
            </Button>
          </Box>
        )}
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
              Task Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={getStatusLabel(workgroup.taskStatus)}
                color={getStatusColor(workgroup.taskStatus) as any}
              />
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Task Description
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {workgroup.taskDescription}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Related Assessment
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
              onClick={() => navigate(`/assessments/${workgroup.assessmentId}`)}
            >
              {assessment?.placeName || workgroup.assessmentId}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Progress Notes</Typography>
              {canManage && (
                <Button
                  size="small"
                  startIcon={<NoteAddIcon />}
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Add Note
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            {workgroup.progressNotes.length === 0 ? (
              <Typography color="text.secondary">No progress notes yet</Typography>
            ) : (
              <List>
                {workgroup.progressNotes.map((note, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar>{usersMap[note.userId]?.email?.charAt(0).toUpperCase() || '?'}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={note.note}
                      secondary={
                        <>
                          {usersMap[note.userId]?.email || note.userId} -{' '}
                          {new Date(note.timestamp).toLocaleString()}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          {workgroup.photoUrls.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Photos ({workgroup.photoUrls.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <ImageList cols={3} gap={8}>
                {workgroup.photoUrls.map((url, index) => (
                  <ImageListItem key={index}>
                    <img
                      src={url}
                      alt={`Workgroup photo ${index + 1}`}
                      loading="lazy"
                      style={{ borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => window.open(url, '_blank')}
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </Paper>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Team</Typography>
              {canManage && (
                <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAddWorkerDialogOpen(true)}>
                  Add Worker
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Lead
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 1, width: 32, height: 32 }}>
                {lead?.email?.charAt(0).toUpperCase() || '?'}
              </Avatar>
              <Typography variant="body1">{lead?.email || workgroup.leadUserId}</Typography>
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Workers ({workers.length})
            </Typography>
            {workers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No workers assigned
              </Typography>
            ) : (
              <List dense>
                {workers.map((worker) => (
                  <ListItem key={worker.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {worker.email.charAt(0).toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary={worker.email} />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Assignment Info
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Group
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
              onClick={() => navigate(`/groups/${workgroup.groupId}`)}
            >
              {group?.name || workgroup.groupId}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Center
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
              onClick={() => navigate(`/centers/${workgroup.centerId}`)}
            >
              {center?.name || workgroup.centerId}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Timeline
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {new Date(workgroup.createdAt).toLocaleString()}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body1">
              {new Date(workgroup.updatedAt).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value as WorkgroupTaskStatus)}
              >
                <MenuItem value="notStarted">Not Started</MenuItem>
                <MenuItem value="inProgress">In Progress</MenuItem>
                <MenuItem value="partiallyCompleted">Partially Completed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="needsEscalation">Needs Escalation</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Progress Note (optional)"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />}>
              Add Photos
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setStatusPhotos(Array.from(e.target.files));
                  }
                }}
              />
            </Button>
            {statusPhotos.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {statusPhotos.length} photo(s) selected
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleStatusUpdate} disabled={updating}>
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Worker Dialog */}
      <Dialog open={addWorkerDialogOpen} onClose={() => setAddWorkerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Worker</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={availableWorkers}
              getOptionLabel={(option) => option.email}
              value={selectedWorker}
              onChange={(_, value) => setSelectedWorker(value)}
              renderInput={(params) => <TextField {...params} label="Select Worker" />}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddWorkerDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAddWorker}
            disabled={updating || !selectedWorker}
          >
            {updating ? 'Adding...' : 'Add Worker'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalate Dialog */}
      <Dialog open={escalateDialogOpen} onClose={() => setEscalateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Escalation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Escalation Type</InputLabel>
              <Select
                value={escalationType}
                label="Escalation Type"
                onChange={(e) => setEscalationType(e.target.value as any)}
              >
                <MenuItem value="assessor">Assessor Reassessment</MenuItem>
                <MenuItem value="administrative">Administrative Support</MenuItem>
                <MenuItem value="thirdParty">Third Party Support</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Reason for Escalation"
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateDialogOpen(false)} disabled={updating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleEscalate}
            disabled={updating || !escalationReason.trim()}
          >
            {updating ? 'Creating...' : 'Create Escalation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
