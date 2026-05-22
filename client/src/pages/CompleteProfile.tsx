import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Divider,
  IconButton,
  Autocomplete,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import { eventService } from '../services/event.service';
import type { UserRole, CommunicationPreference, AvailabilityRange, Event } from '../types';

export const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, user, refreshUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [organization, setOrganization] = useState('');
  const [availability, setAvailability] = useState<{ start: string; end: string }[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference>('email');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);

  useEffect(() => {
    eventService.listEvents().then(setEvents).catch(() => {});
    userService.listOrganizations().then(setOrganizations).catch(() => {});
  }, []);

  useEffect(() => {
    if (user && !profileSubmitted) navigate('/dashboard');
  }, [user, navigate, profileSubmitted]);

  useEffect(() => {
    if (!firebaseUser) navigate('/login');
  }, [firebaseUser, navigate]);

  const availableRoles: { value: UserRole; label: string }[] = [
    { value: 'assessor', label: 'Assessor' },
    { value: 'fieldCoordinator', label: 'Field Coordinator' },
    { value: 'baseCampHost', label: 'Base Camp Host' },
    { value: 'workGroupLead', label: 'Work Group Lead' },
    { value: 'volunteer', label: 'Volunteer' },
  ];

  const handleRoleToggle = (role: UserRole) => {
    setRequestedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleEventToggle = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const addAvailabilityRange = () => {
    setAvailability((prev) => [...prev, { start: '', end: '' }]);
  };

  const removeAvailabilityRange = (index: number) => {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAvailabilityRange = (index: number, field: 'start' | 'end', value: string) => {
    setAvailability((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firebaseUser) {
      setError('You must be signed in to complete your profile');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    if (requestedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }
    for (const range of availability) {
      if (!range.start || !range.end) {
        setError('Please complete all availability date ranges or remove incomplete ones');
        return;
      }
      if (range.start > range.end) {
        setError('Availability end date must be after start date');
        return;
      }
    }

    setProfileSubmitted(true);
    setLoading(true);

    const hasAddress = addressStreet || addressCity || addressState || addressZip;
    const address = hasAddress
      ? { street: addressStreet, city: addressCity, state: addressState, zip: addressZip }
      : undefined;

    const availabilityRanges: AvailabilityRange[] = availability.map((r) => ({
      start: new Date(r.start).getTime(),
      end: new Date(r.end).getTime(),
    }));

    try {
      await userService.registerUser({
        email: firebaseUser.email || '',
        firstName,
        lastName,
        phoneNumber,
        address,
        organization: organization.trim() || undefined,
        availability: availabilityRanges.length ? availabilityRanges : undefined,
        eventIds: selectedEventIds.length ? selectedEventIds : undefined,
        communicationPreference,
        requestedRoles,
      });
      await refreshUser();
      navigate('/sign-legal-release');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseUser) return null;

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Faith Responders
          </Typography>
          <Typography component="h2" variant="h6" align="center" gutterBottom>
            Complete Your Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Welcome! Please provide a few more details to complete your registration.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Signed in as: <strong>{firebaseUser.email}</strong>
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* Name */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField margin="normal" required fullWidth label="First Name" autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <TextField margin="normal" required fullWidth label="Last Name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Box>

            {/* Contact */}
            <TextField margin="normal" required fullWidth label="Phone Number" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />

            {/* Organization */}
            <Autocomplete
              freeSolo
              options={organizations}
              value={organization}
              onInputChange={(_, val) => setOrganization(val)}
              renderInput={(params) => (
                <TextField {...params} margin="normal" fullWidth label="Church / Organization (optional)" autoComplete="organization" />
              )}
            />

            {/* Address */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
              Address (optional)
            </Typography>
            <TextField margin="dense" fullWidth label="Street" autoComplete="address-line1" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField margin="dense" fullWidth label="City" autoComplete="address-level2" value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
              <TextField margin="dense" sx={{ width: 100 }} label="State" autoComplete="address-level1" value={addressState} onChange={(e) => setAddressState(e.target.value)} />
              <TextField margin="dense" sx={{ width: 120 }} label="ZIP" autoComplete="postal-code" value={addressZip} onChange={(e) => setAddressZip(e.target.value)} />
            </Box>

            {/* Communication preference */}
            <FormControl fullWidth margin="normal">
              <InputLabel>Communication Preference</InputLabel>
              <Select value={communicationPreference} label="Communication Preference" onChange={(e) => setCommunicationPreference(e.target.value as CommunicationPreference)}>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {/* Events */}
            {events.length > 0 && (
              <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                <FormLabel component="legend">Events I'm Responding To (optional)</FormLabel>
                <FormGroup>
                  {events.map((ev) => (
                    <FormControlLabel
                      key={ev.id}
                      control={<Checkbox checked={selectedEventIds.includes(ev.id)} onChange={() => handleEventToggle(ev.id)} />}
                      label={`${ev.name}${ev.description ? ` — ${ev.description}` : ''}`}
                    />
                  ))}
                </FormGroup>
              </FormControl>
            )}

            {/* Availability */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FormLabel sx={{ flex: 1 }}>Availability (optional)</FormLabel>
                <Button size="small" startIcon={<AddIcon />} onClick={addAvailabilityRange}>
                  Add Date Range
                </Button>
              </Box>
              {availability.map((range, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                  <TextField
                    size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                    value={range.start} onChange={(e) => updateAvailabilityRange(i, 'start', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                    inputProps={{ min: range.start }}
                    value={range.end} onChange={(e) => updateAvailabilityRange(i, 'end', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <IconButton size="small" onClick={() => removeAvailabilityRange(i)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Roles */}
            <FormControl component="fieldset" sx={{ mt: 1 }}>
              <FormLabel component="legend">Requested Roles (select at least one)</FormLabel>
              <FormGroup>
                {availableRoles.map((role) => (
                  <FormControlLabel
                    key={role.value}
                    control={<Checkbox checked={requestedRoles.includes(role.value)} onChange={() => handleRoleToggle(role.value)} />}
                    label={role.label}
                  />
                ))}
              </FormGroup>
            </FormControl>

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
              {loading ? 'Completing Profile...' : 'Complete Profile'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
