import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
} from '@mui/material';
import { assessmentService } from '../services/assessment.service';
import { centerService } from '../services/center.service';
import { groupService } from '../services/group.service';
import type { AssessmentSeverity, Center, Group } from '../types';

export const CreateAssessment: React.FC = () => {
  const navigate = useNavigate();
  const [centers, setCenters] = useState<Center[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    placeName: '',
    address: '',
    centerId: '',
    groupId: '',
    damages: '',
    needs: '',
    affectedPeople: 0,
    severity: 'medium' as AssessmentSeverity,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [centersData, groupsData] = await Promise.all([
        centerService.listCenters(),
        groupService.listGroups(),
      ]);
      setCenters(centersData);
      setGroups(groupsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotoFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create assessment first
      const assessment = await assessmentService.createAssessment(formData);

      // Upload photos if any
      if (photoFiles.length > 0) {
        const photoUrls = await assessmentService.uploadPhotos(photoFiles, assessment.id);
        await assessmentService.updateAssessment(assessment.id, { photoUrls });
      }

      navigate('/assessments');
    } catch (err: any) {
      setError(err.message || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Assessment
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                label="Place Name"
                value={formData.placeName}
                onChange={(e) => setFormData({ ...formData, placeName: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                label="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              <FormControl fullWidth required>
                <InputLabel>Center</InputLabel>
                <Select
                  value={formData.centerId}
                  label="Center"
                  onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                >
                  {centers.map((center) => (
                    <MenuItem key={center.id} value={center.id}>
                      {center.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                label="Damages Description"
                multiline
                rows={3}
                value={formData.damages}
                onChange={(e) => setFormData({ ...formData, damages: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                label="Needs Description"
                multiline
                rows={3}
                value={formData.needs}
                onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                type="number"
                label="Number of Affected People"
                value={formData.affectedPeople}
                onChange={(e) =>
                  setFormData({ ...formData, affectedPeople: parseInt(e.target.value) || 0 })
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Severity</InputLabel>
                <Select
                  value={formData.severity}
                  label="Severity"
                  onChange={(e) =>
                    setFormData({ ...formData, severity: e.target.value as AssessmentSeverity })
                  }
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Button variant="outlined" component="label" fullWidth>
                Upload Photos (Optional)
                <input type="file" hidden multiple accept="image/*" onChange={handlePhotoChange} />
              </Button>
              {photoFiles.length > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {photoFiles.length} file(s) selected
                </Typography>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/assessments')}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Assessment'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};
