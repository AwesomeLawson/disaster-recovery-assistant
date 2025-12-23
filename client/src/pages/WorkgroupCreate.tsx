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
import { groupService } from '../services/group.service';
import { centerService } from '../services/center.service';
import { userService } from '../services/user.service';
import { assessmentService } from '../services/assessment.service';
import { useAuth } from '../context/AuthContext';
import type { Group, Center, User, Assessment, WorkgroupFormData } from '../types';

export const WorkgroupCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedAssessmentId = searchParams.get('assessmentId');

  const [groups, setGroups] = useState<Group[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<Center[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableWorkers, setAvailableWorkers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<WorkgroupFormData>({
    name: '',
    centerId: '',
    groupId: '',
    leadUserId: '',
    workerUserIds: [],
    assessmentId: '',
    taskDescription: '',
  });

  const [selectedWorkers, setSelectedWorkers] = useState<User[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (formData.groupId) {
      const groupCenters = centers.filter((c) => c.groupId === formData.groupId);
      setFilteredCenters(groupCenters);

      if (!groupCenters.find((c) => c.id === formData.centerId)) {
        setFormData((prev) => ({ ...prev, centerId: '', assessmentId: '' }));
      }
    } else {
      setFilteredCenters([]);
    }
  }, [formData.groupId, centers]);

  useEffect(() => {
    if (formData.centerId) {
      const centerAssessments = assessments.filter((a) => a.centerId === formData.centerId);
      setFilteredAssessments(centerAssessments);

      if (!centerAssessments.find((a) => a.id === formData.assessmentId)) {
        setFormData((prev) => ({ ...prev, assessmentId: '' }));
      }
    } else if (formData.groupId) {
      const groupAssessments = assessments.filter((a) => a.groupId === formData.groupId);
      setFilteredAssessments(groupAssessments);
    } else {
      setFilteredAssessments([]);
    }
  }, [formData.centerId, formData.groupId, assessments]);

  useEffect(() => {
    const workers = users.filter(
      (u) =>
        (u.roles.includes('worker') || u.roles.includes('workGroupLead')) &&
        u.roleApprovalStatus === 'approved'
    );
    setAvailableWorkers(workers);
  }, [users]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [groupsData, centersData, assessmentsData, usersData] = await Promise.all([
        groupService.listGroups(),
        centerService.listCenters(),
        assessmentService.listAssessments(),
        userService.listUsers(),
      ]);

      setGroups(groupsData);
      setCenters(centersData);
      setAssessments(assessmentsData);
      setUsers(usersData);

      // Set current user as lead if they are a workGroupLead
      if (user?.roles.includes('workGroupLead') || user?.roles.includes('administrator')) {
        setFormData((prev) => ({ ...prev, leadUserId: user.id }));
      }

      // Handle preselected assessment
      if (preselectedAssessmentId) {
        const assessment = assessmentsData.find((a) => a.id === preselectedAssessmentId);
        if (assessment) {
          setFormData((prev) => ({
            ...prev,
            assessmentId: assessment.id,
            groupId: assessment.groupId,
            centerId: assessment.centerId,
            name: `Workgroup for ${assessment.placeName}`,
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
    if (!formData.groupId) {
      setError('Group is required');
      return;
    }
    if (!formData.centerId) {
      setError('Center is required');
      return;
    }
    if (!formData.assessmentId) {
      setError('Assessment is required');
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
        workerUserIds: selectedWorkers.map((w) => w.id),
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
              <FormControl fullWidth required>
                <InputLabel>Group</InputLabel>
                <Select
                  value={formData.groupId}
                  label="Group"
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required disabled={!formData.groupId}>
                <InputLabel>Center</InputLabel>
                <Select
                  value={formData.centerId}
                  label="Center"
                  onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                >
                  {filteredCenters.map((center) => (
                    <MenuItem key={center.id} value={center.id}>
                      {center.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth required disabled={!formData.groupId}>
                <InputLabel>Assessment</InputLabel>
                <Select
                  value={formData.assessmentId}
                  label="Assessment"
                  onChange={(e) => setFormData({ ...formData, assessmentId: e.target.value })}
                >
                  {filteredAssessments.map((assessment) => (
                    <MenuItem key={assessment.id} value={assessment.id}>
                      {assessment.placeName} - {assessment.address} ({assessment.severity})
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
                options={availableWorkers.filter((w) => w.id !== formData.leadUserId)}
                getOptionLabel={(option) => option.email}
                value={selectedWorkers}
                onChange={(_, value) => setSelectedWorkers(value)}
                renderInput={(params) => (
                  <TextField {...params} label="Workers (optional)" placeholder="Select workers" />
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
