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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import FlagIcon from '@mui/icons-material/Flag';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { assessmentService } from '../services/assessment.service';
import { groupService } from '../services/group.service';
import { centerService } from '../services/center.service';
import { userService } from '../services/user.service';
import { useAuth } from '../context/AuthContext';
import type { Assessment, AssessmentSeverity, Group, Center, User } from '../types';

export const AssessmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [center, setCenter] = useState<Center | null>(null);
  const [assessor, setAssessor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [editForm, setEditForm] = useState({
    damages: '',
    needs: '',
    affectedPeople: 0,
    severity: 'medium' as AssessmentSeverity,
    flagForReview: false,
  });

  useEffect(() => {
    if (id) {
      loadAssessment();
    }
  }, [id]);

  const loadAssessment = async () => {
    try {
      setLoading(true);
      const data = await assessmentService.getAssessment(id!);
      setAssessment(data);

      setEditForm({
        damages: data.damages,
        needs: data.needs,
        affectedPeople: data.affectedPeople,
        severity: data.severity,
        flagForReview: data.flaggedForReview,
      });

      const [groupData, centerData, assessorData] = await Promise.all([
        groupService.getGroup(data.groupId),
        centerService.getCenter(data.centerId),
        userService.getUser(data.assessorId),
      ]);
      setGroup(groupData);
      setCenter(centerData);
      setAssessor(assessorData);
    } catch (err: any) {
      setError(err.message || 'Failed to load assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleReassess = async () => {
    if (!assessment) return;

    try {
      setReassessing(true);

      let newPhotoUrls: string[] = [];
      if (photoFiles.length > 0) {
        newPhotoUrls = await assessmentService.uploadPhotos(photoFiles, assessment.id);
      }

      const updates: Partial<Assessment> = {
        damages: editForm.damages,
        needs: editForm.needs,
        affectedPeople: editForm.affectedPeople,
        severity: editForm.severity,
      };

      if (newPhotoUrls.length > 0) {
        updates.photoUrls = [...assessment.photoUrls, ...newPhotoUrls];
      }

      await assessmentService.reassessment(assessment.id, updates, editForm.flagForReview);

      setEditDialogOpen(false);
      setPhotoFiles([]);
      await loadAssessment();
    } catch (err: any) {
      setError(err.message || 'Failed to update assessment');
    } finally {
      setReassessing(false);
    }
  };

  const handleToggleFlag = async () => {
    if (!assessment) return;

    try {
      await assessmentService.updateAssessment(assessment.id, {
        flaggedForReview: !assessment.flaggedForReview,
      });
      await loadAssessment();
    } catch (err: any) {
      setError(err.message || 'Failed to update flag status');
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

  const canEdit =
    user?.roles.includes('administrator') ||
    user?.roles.includes('assessor') ||
    user?.id === assessment?.assessorId;

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Loading assessment...</Typography>
      </Container>
    );
  }

  if (!assessment) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Assessment not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/assessments')} sx={{ mt: 2 }}>
          Back to Assessments
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/assessments')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {assessment.placeName}
        </Typography>
        {canEdit && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant={assessment.flaggedForReview ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<FlagIcon />}
              onClick={handleToggleFlag}
            >
              {assessment.flaggedForReview ? 'Flagged' : 'Flag for Review'}
            </Button>
            <Button variant="contained" startIcon={<EditIcon />} onClick={() => setEditDialogOpen(true)}>
              Reassess
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
              Assessment Details
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Address
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {assessment.address}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {assessment.latitude && assessment.longitude
                    ? `${assessment.latitude.toFixed(6)}, ${assessment.longitude.toFixed(6)}`
                    : 'Not specified'}
                </Typography>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary">
              Severity
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Chip
                label={assessment.severity.toUpperCase()}
                color={getSeverityColor(assessment.severity) as any}
              />
              {assessment.flaggedForReview && (
                <Chip label="Flagged for Review" color="warning" sx={{ ml: 1 }} />
              )}
            </Box>

            <Typography variant="subtitle2" color="text.secondary">
              Affected People
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {assessment.affectedPeople}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Damages
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {assessment.damages}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Needs
            </Typography>
            <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
              {assessment.needs}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Reassessment Count
            </Typography>
            <Typography variant="body1">{assessment.reassessmentCount}</Typography>
          </Paper>

          {assessment.photoUrls.length > 0 && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Photos ({assessment.photoUrls.length})
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <ImageList cols={3} gap={8}>
                {assessment.photoUrls.map((url, index) => (
                  <ImageListItem key={index}>
                    <img
                      src={url}
                      alt={`Assessment photo ${index + 1}`}
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
              onClick={() => navigate(`/groups/${assessment.groupId}`)}
            >
              {group?.name || assessment.groupId}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Center
            </Typography>
            <Typography
              variant="body1"
              sx={{ mb: 2, cursor: 'pointer', color: 'primary.main' }}
              onClick={() => navigate(`/centers/${assessment.centerId}`)}
            >
              {center?.name || assessment.centerId}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Assessor
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {assessor?.email || assessment.assessorId}
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
              {new Date(assessment.createdAt).toLocaleString()}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary">
              Last Updated
            </Typography>
            <Typography variant="body1">
              {new Date(assessment.updatedAt).toLocaleString()}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Reassess Assessment</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Severity</InputLabel>
                  <Select
                    value={editForm.severity}
                    label="Severity"
                    onChange={(e) =>
                      setEditForm({ ...editForm, severity: e.target.value as AssessmentSeverity })
                    }
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Affected People"
                  value={editForm.affectedPeople}
                  onChange={(e) =>
                    setEditForm({ ...editForm, affectedPeople: parseInt(e.target.value) || 0 })
                  }
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Damages"
                  value={editForm.damages}
                  onChange={(e) => setEditForm({ ...editForm, damages: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Needs"
                  value={editForm.needs}
                  onChange={(e) => setEditForm({ ...editForm, needs: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AddPhotoAlternateIcon />}
                >
                  Add Photos
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files) {
                        setPhotoFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                </Button>
                {photoFiles.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {photoFiles.length} photo(s) selected
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Button
                  variant={editForm.flagForReview ? 'contained' : 'outlined'}
                  color="warning"
                  startIcon={<FlagIcon />}
                  onClick={() => setEditForm({ ...editForm, flagForReview: !editForm.flagForReview })}
                >
                  {editForm.flagForReview ? 'Will Flag for Review' : 'Flag for Review'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={reassessing}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleReassess} disabled={reassessing}>
            {reassessing ? 'Saving...' : 'Save Reassessment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
