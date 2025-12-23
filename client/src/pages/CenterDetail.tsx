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
import { centerService } from '../services/center.service';
import { groupService } from '../services/group.service';
import { userService } from '../services/user.service';
import { assessmentService } from '../services/assessment.service';
import { workgroupService } from '../services/workgroup.service';
import type { Center, Group, User, Assessment, Workgroup } from '../types';

export const CenterDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [center, setCenter] = useState<Center | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
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
    latitude: '',
    longitude: '',
  });

  const [addLeadDialogOpen, setAddLeadDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
        latitude: centerData.latitude?.toString() || '',
        longitude: centerData.longitude?.toString() || '',
      });

      const [groupData, usersData, assessmentsData, workgroupsData] = await Promise.all([
        groupService.getGroup(centerData.groupId),
        userService.listUsers(),
        assessmentService.listAssessments({ centerId: id }),
        workgroupService.listWorkgroups({ centerId: id }),
      ]);

      setGroup(groupData);
      setAllUsers(usersData);
      setAssessments(assessmentsData);
      setWorkgroups(workgroupsData);

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
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : undefined,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : undefined,
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
              Group
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
              onClick={() => navigate(`/groups/${center.groupId}`)}
            >
              {group?.name || center.groupId}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Created
            </Typography>
            <Typography variant="body1">
              {new Date(center.createdAt).toLocaleString()}
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Assessments ({assessments.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {assessments.length === 0 ? (
              <Typography color="text.secondary">No assessments at this center</Typography>
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
                      primary={assessment.placeName}
                      secondary={assessment.address}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={assessment.severity}
                        size="small"
                        color={getSeverityColor(assessment.severity) as any}
                      />
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
                      secondary={`${workgroup.workerUserIds.length} workers`}
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
            <TextField
              fullWidth
              label="Address"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Latitude (optional)"
                  type="number"
                  value={editForm.latitude}
                  onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                  inputProps={{ step: 'any' }}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  fullWidth
                  label="Longitude (optional)"
                  type="number"
                  value={editForm.longitude}
                  onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                  inputProps={{ step: 'any' }}
                />
              </Grid>
            </Grid>
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
    </Container>
  );
};
