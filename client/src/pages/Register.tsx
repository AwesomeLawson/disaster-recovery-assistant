import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Link,
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
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { eventService } from '../services/event.service';
import { useAuth } from '../context/AuthContext';
import type { UserRole, CommunicationPreference, AvailabilityRange, Event, TshirtSize } from '../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const [tshirtSize, setTshirtSize] = useState<TshirtSize | ''>('');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [preFilledNotice, setPreFilledNotice] = useState(false);

  const [events, setEvents] = useState<Event[]>([]);
  const [organizations, setOrganizations] = useState<string[]>([]);

  useEffect(() => {
    eventService.listEvents().then(setEvents).catch(() => {});
    userService.listOrganizations().then(setOrganizations).catch(() => {});
  }, []);

  const availableRoles: { value: UserRole; label: string; description: string }[] = [
    { value: 'assessor', label: 'Assessor', description: 'Initial evaluation of damage and determination of needs' },
    { value: 'fieldCoordinator', label: 'Field Coordinator', description: 'Receives assessments, sets job priority, assigns teams, and verifies completion' },
    { value: 'baseCampHost', label: 'Basecamp Host', description: 'Coordinates the base camp schedule, housing, meals, and incoming/outgoing groups' },
    { value: 'workGroupLead', label: 'Team Leader', description: 'Point of contact coordinating travel, logistics, and supervision of on-site work' },
    { value: 'volunteer', label: 'Volunteer', description: 'Helps with field work, donations management, base camp support, and other needs' },
    { value: 'secChaplain', label: 'SEC/Chaplain', description: 'Provides spiritual and emotional care support for the team, survivors, and community' },
  ];

  const handleEmailBlur = async () => {
    if (!email.trim()) return;
    try {
      const found = await userService.lookupPreApprovedUser(email);
      if (found) {
        if (!firstName) setFirstName(found.firstName);
        if (!lastName) setLastName(found.lastName);
        if (!phoneNumber) setPhoneNumber(found.phoneNumber);
        setPreFilledNotice(true);
      }
    } catch {
      // silently ignore lookup failures
    }
  };

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

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
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
      await authService.register(email, password);
      await userService.registerUser({
        email,
        firstName,
        lastName,
        phoneNumber,
        address,
        organization: organization.trim() || undefined,
        availability: availabilityRanges.length ? availabilityRanges : undefined,
        eventIds: selectedEventIds.length ? selectedEventIds : undefined,
        communicationPreference,
        requestedRoles,
        tshirtSize: tshirtSize || undefined,
      });
      await refreshUser();
      navigate('/sign-legal-release');
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'facebook') => {
    setError('');
    setSocialLoading(provider);
    try {
      provider === 'google'
        ? await authService.loginWithGoogle()
        : await authService.loginWithFacebook();
      navigate('/complete-profile');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(err.message || `Failed to sign up with ${provider}`);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Faith Responders
          </Typography>
          <Typography component="h2" variant="h6" align="center" gutterBottom>
            Create Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {preFilledNotice && (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPreFilledNotice(false)}>
              We found your information on file — fields have been pre-filled. Please review and update as needed.
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Button
              fullWidth variant="outlined" startIcon={<GoogleIcon />}
              onClick={() => handleSocialSignUp('google')}
              disabled={loading || socialLoading !== null} sx={{ mb: 1 }}
            >
              {socialLoading === 'google' ? 'Signing up...' : 'Sign up with Google'}
            </Button>
            <Button
              fullWidth variant="outlined" startIcon={<FacebookIcon />}
              onClick={() => handleSocialSignUp('facebook')}
              disabled={loading || socialLoading !== null}
              sx={{ mb: 2, backgroundColor: '#1877F2', color: 'white', borderColor: '#1877F2',
                '&:hover': { backgroundColor: '#166FE5', borderColor: '#166FE5' },
                '&:disabled': { backgroundColor: '#1877F2', opacity: 0.7 } }}
            >
              {socialLoading === 'facebook' ? 'Signing up...' : 'Sign up with Facebook'}
            </Button>
            <Divider sx={{ my: 2 }}>or sign up with email</Divider>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* Name */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField margin="normal" required fullWidth label="First Name" autoComplete="given-name" autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <TextField margin="normal" required fullWidth label="Last Name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Box>

            {/* Contact */}
            <TextField margin="normal" required fullWidth label="Email Address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={handleEmailBlur} />
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

            {/* Password */}
            <TextField margin="normal" required fullWidth label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <TextField margin="normal" required fullWidth label="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />

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
                    control={
                      <Checkbox
                        checked={requestedRoles.includes(role.value)}
                        onChange={() => handleRoleToggle(role.value)}
                        sx={{ mt: '2px', alignSelf: 'flex-start' }}
                      />
                    }
                    label={
                      <Box sx={{ pt: '9px', pb: 1 }}>
                        <Typography variant="body2" fontWeight={500}>{role.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{role.description}</Typography>
                      </Box>
                    }
                    sx={{ alignItems: 'flex-start', mb: 0 }}
                  />
                ))}
              </FormGroup>
            </FormControl>

            <Button
              type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}
              disabled={loading || socialLoading !== null}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign In
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
