import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Divider,
} from '@mui/material';
import { assessmentService } from '../services/assessment.service';
import { centerService } from '../services/center.service';
import { eventService } from '../services/event.service';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import type { Center, Event } from '../types';

export const CreateAssessment: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [centers, setCenters] = useState<Center[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    survivorName: '',
    survivorPhone: '',
    altContact: '',
    altContactPhone: '',
    address: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    tempAddress: '',
    descriptionOfNeed: '',
    source: '',
    caseNumber: '',
    centerId: searchParams.get('centerId') ?? '',
    eventId: searchParams.get('eventId') ?? '',
  });

  useEffect(() => {
    Promise.all([centerService.listCenters(), eventService.listEvents()])
      .then(([centersData, eventsData]) => {
        setCenters(centersData);
        setEvents(eventsData);
      })
      .catch((err) => setError(err.message || 'Failed to load data'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        survivorName: formData.survivorName,
        survivorPhone: formData.survivorPhone,
        address: formData.address,
        descriptionOfNeed: formData.descriptionOfNeed,
        centerId: formData.centerId,
      };
      if (formData.altContact) payload.altContact = formData.altContact;
      if (formData.altContactPhone) payload.altContactPhone = formData.altContactPhone;
      if (formData.latitude !== undefined) payload.latitude = formData.latitude;
      if (formData.longitude !== undefined) payload.longitude = formData.longitude;
      if (formData.tempAddress) payload.tempAddress = formData.tempAddress;
      if (formData.source) payload.source = formData.source;
      if (formData.caseNumber) payload.caseNumber = formData.caseNumber;
      if (formData.eventId) payload.eventId = formData.eventId;

      const assessment = await assessmentService.createAssessment(payload as any);
      navigate(`/assessments/${assessment.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to open case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>Open New Case</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Capture the survivor's contact information and initial description of need. An assessor will complete the field assessment on-site.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>

            {/* Survivor Contact */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600}>Survivor Contact</Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                label="Survivor Name"
                value={formData.survivorName}
                onChange={(e) => setFormData({ ...formData, survivorName: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                label="Survivor Phone"
                value={formData.survivorPhone}
                onChange={(e) => setFormData({ ...formData, survivorPhone: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Alt Contact Name (optional)"
                value={formData.altContact}
                onChange={(e) => setFormData({ ...formData, altContact: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Alt Contact Phone (optional)"
                value={formData.altContactPhone}
                onChange={(e) => setFormData({ ...formData, altContactPhone: e.target.value })}
              />
            </Grid>

            {/* Property */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>Property</Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <AddressAutocomplete
                required
                value={formData.address}
                onChange={(address) =>
                  setFormData({ ...formData, address, latitude: undefined, longitude: undefined })
                }
                onPlaceSelect={({ address, latitude, longitude }) =>
                  setFormData({ ...formData, address, latitude, longitude })
                }
                coordinates={
                  formData.latitude != null && formData.longitude != null
                    ? { latitude: formData.latitude, longitude: formData.longitude }
                    : null
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Temporary Address (optional)"
                value={formData.tempAddress}
                onChange={(e) => setFormData({ ...formData, tempAddress: e.target.value })}
                placeholder="Where survivor is staying if displaced"
              />
            </Grid>

            {/* Request Details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>Request Details</Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Description of Need"
                value={formData.descriptionOfNeed}
                onChange={(e) => setFormData({ ...formData, descriptionOfNeed: e.target.value })}
                placeholder="Brief description of the damage and what assistance is needed"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Source (optional)"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g. Phone, Walk-in, Referral"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Case Number (optional)"
                value={formData.caseNumber}
                onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
              />
            </Grid>

            {/* Assignment */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>Assignment</Typography>
              <Divider sx={{ mt: 0.5, mb: 2 }} />
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
                    <MenuItem key={center.id} value={center.id}>{center.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Event (Optional)</InputLabel>
                <Select
                  value={formData.eventId}
                  label="Event (Optional)"
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {events.map((event) => (
                    <MenuItem key={event.id} value={event.id}>{event.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => navigate('/assessments')}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={loading}>
                  {loading ? 'Opening...' : 'Open Case'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};
