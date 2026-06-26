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
import { userEventDataService } from '../services/userEventData.service';
import type { UserRole, CommunicationPreference, Event, TshirtSize } from '../types';

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
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventAvailability, setEventAvailability] = useState<Record<string, { start: string; end: string }[]>>({});
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference>('email');
  const [tshirtSize, setTshirtSize] = useState<TshirtSize | ''>('');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [preFilledNotice, setPreFilledNotice] = useState(false);

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

  useEffect(() => {
    if (!firebaseUser?.email) return;
    userService.lookupPreApprovedUser(firebaseUser.email).then((found) => {
      if (found) {
        setFirstName((prev) => prev || found.firstName);
        setLastName((prev) => prev || found.lastName);
        setPhoneNumber((prev) => prev || found.phoneNumber);
        setPreFilledNotice(true);
      }
    }).catch(() => {});
  }, [firebaseUser?.email]);

  const availableRoles: { value: UserRole; label: string }[] = [
    { value: 'assessor', label: 'Assessor' },
    { value: 'fieldCoordinator', label: 'Field Coordinator' },
    { value: 'baseCampHost', label: 'Base Camp Host' },
    { value: 'workGroupLead', label: 'Team Leader' },
    { value: 'volunteer', label: 'Volunteer' },
    { value: 'secChaplain', label: 'SEC/Chaplain' },
  ];

  const handleRoleToggle = (role: UserRole) => {
    setRequestedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleEventToggle = (eventId: string) => {
    setSelectedEventIds((prev) => {
      if (prev.includes(eventId)) {
        setEventAvailability((ea) => { const next = { ...ea }; delete next[eventId]; return next; });
        return prev.filter((id) => id !== eventId);
      }
      setEventAvailability((ea) => ({ ...ea, [eventId]: [] }));
      return [...prev, eventId];
    });
  };

  const addEventRange = (eventId: string) => {
    setEventAvailability((ea) => ({ ...ea, [eventId]: [...(ea[eventId] ?? []), { start: '', end: '' }] }));
  };

  const removeEventRange = (eventId: string, index: number) => {
    setEventAvailability((ea) => ({ ...ea, [eventId]: (ea[eventId] ?? []).filter((_, i) => i !== index) }));
  };

  const updateEventRange = (eventId: string, index: number, field: 'start' | 'end', value: string) => {
    setEventAvailability((ea) => ({
      ...ea,
      [eventId]: (ea[eventId] ?? []).map((r, i) => i === index ? { ...r, [field]: value } : r),
    }));
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
    for (const eventId of selectedEventIds) {
      const ranges = eventAvailability[eventId] ?? [];
      for (const range of ranges) {
        if (!range.start || !range.end) {
          setError('Please complete all availability date ranges or remove incomplete ones');
          return;
        }
        if (range.start > range.end) {
          setError('Availability end date must be after start date');
          return;
        }
      }
    }

    setProfileSubmitted(true);
    setLoading(true);

    const hasAddress = addressStreet || addressCity || addressState || addressZip;
    const address = hasAddress
      ? { street: addressStreet, city: addressCity, state: addressState, zip: addressZip }
      : undefined;

    try {
      await userService.registerUser({
        email: firebaseUser.email || '',
        firstName,
        lastName,
        phoneNumber,
        address,
        organization: organization.trim() || undefined,
        eventIds: selectedEventIds.length ? selectedEventIds : undefined,
        communicationPreference,
        requestedRoles,
        tshirtSize: tshirtSize || undefined,
      });

      // Save per-event availability records
      const availabilityEntries = selectedEventIds
        .map((eventId) => ({ eventId, ranges: eventAvailability[eventId] ?? [] }))
        .filter(({ ranges }) => ranges.length > 0);

      await Promise.all(
        availabilityEntries.map(({ eventId, ranges }) =>
          userEventDataService.setAvailability(
            eventId,
            ranges.map((r) => ({ start: new Date(r.start).getTime(), end: new Date(r.end).getTime() }))
          )
        )
      );

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
          {preFilledNotice && (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPreFilledNotice(false)}>
              We found your information on file — fields have been pre-filled. Please review and update as needed.
            </Alert>
          )}

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

            {/* T-shirt size */}
            <FormControl fullWidth margin="normal">
              <InputLabel>T-Shirt Size (optional)</InputLabel>
              <Select value={tshirtSize} label="T-Shirt Size (optional)" onChange={(e) => setTshirtSize(e.target.value as TshirtSize | '')}>
                <MenuItem value=""><em>Prefer not to say</em></MenuItem>
                <MenuItem value="S">Small</MenuItem>
                <MenuItem value="M">Medium</MenuItem>
                <MenuItem value="L">Large</MenuItem>
                <MenuItem value="XL">Extra Large</MenuItem>
                <MenuItem value="2XL">2X</MenuItem>
                <MenuItem value="3XL">3X</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {/* Events + per-event availability */}
            {events.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <FormLabel component="legend" sx={{ mb: 1 }}>Events I'm Responding To (optional)</FormLabel>
                {events.map((ev) => {
                  const checked = selectedEventIds.includes(ev.id);
                  const ranges = eventAvailability[ev.id] ?? [];
                  return (
                    <Box key={ev.id} sx={{ mb: checked ? 1.5 : 0.5 }}>
                      <FormControlLabel
                        control={<Checkbox checked={checked} onChange={() => handleEventToggle(ev.id)} />}
                        label={`${ev.name}${ev.description ? ` — ${ev.description}` : ''}`}
                      />
                      {checked && (
                        <Box sx={{ ml: 4, pl: 1, borderLeft: '2px solid', borderColor: 'primary.light' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                              My available dates for this event (optional)
                            </Typography>
                            <Button size="small" startIcon={<AddIcon />} onClick={() => addEventRange(ev.id)}>
                              Add Dates
                            </Button>
                          </Box>
                          {ranges.map((range, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                              <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                                value={range.start} onChange={(e) => updateEventRange(ev.id, i, 'start', e.target.value)} sx={{ flex: 1 }} />
                              <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                                inputProps={{ min: range.start }}
                                value={range.end} onChange={(e) => updateEventRange(ev.id, i, 'end', e.target.value)} sx={{ flex: 1 }} />
                              <IconButton size="small" onClick={() => removeEventRange(ev.id, i)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ))}
                          {ranges.length === 0 && (
                            <Typography variant="caption" color="text.secondary">
                              No dates added — you can add them later from your dashboard.
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

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
