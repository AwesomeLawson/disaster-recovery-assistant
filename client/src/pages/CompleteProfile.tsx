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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import type { UserRole, CommunicationPreference } from '../types';

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
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference>('email');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileSubmitted, setProfileSubmitted] = useState(false);

  const availableRoles: { value: UserRole; label: string }[] = [
    { value: 'assessor', label: 'Assessor' },
    { value: 'workGroupLead', label: 'Work Group Lead' },
    { value: 'volunteer', label: 'Volunteer' },
  ];

  // Redirect if user already has a profile (skip if we just submitted — we'll navigate manually)
  useEffect(() => {
    if (user && !profileSubmitted) {
      navigate('/dashboard');
    }
  }, [user, navigate, profileSubmitted]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!firebaseUser) {
      navigate('/login');
    }
  }, [firebaseUser, navigate]);

  const handleRoleToggle = (role: UserRole) => {
    setRequestedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
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

    setProfileSubmitted(true);
    setLoading(true);

    const hasAddress = addressStreet || addressCity || addressState || addressZip;
    const address = hasAddress
      ? { street: addressStreet, city: addressCity, state: addressState, zip: addressZip }
      : undefined;

    try {
      // Register user profile with email from Firebase Auth
      await userService.registerUser({
        email: firebaseUser.email || '',
        firstName,
        lastName,
        phoneNumber,
        address,
        communicationPreference,
        requestedRoles,
      });

      // Doc is now in Firestore — force AuthContext to load it before navigating
      await refreshUser();
      navigate('/sign-legal-release');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!firebaseUser) {
    return null;
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
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

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Signed in as: <strong>{firebaseUser.email}</strong>
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="firstName"
                label="First Name"
                name="firstName"
                autoComplete="given-name"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="lastName"
                label="Last Name"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Box>
            <TextField
              margin="normal"
              required
              fullWidth
              id="phoneNumber"
              label="Phone Number"
              name="phoneNumber"
              autoComplete="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>
              Address (optional)
            </Typography>
            <TextField
              margin="dense"
              fullWidth
              id="addressStreet"
              label="Street"
              name="addressStreet"
              autoComplete="address-line1"
              value={addressStreet}
              onChange={(e) => setAddressStreet(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                margin="dense"
                fullWidth
                id="addressCity"
                label="City"
                name="addressCity"
                autoComplete="address-level2"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
              />
              <TextField
                margin="dense"
                sx={{ width: 100 }}
                id="addressState"
                label="State"
                name="addressState"
                autoComplete="address-level1"
                value={addressState}
                onChange={(e) => setAddressState(e.target.value)}
              />
              <TextField
                margin="dense"
                sx={{ width: 120 }}
                id="addressZip"
                label="ZIP"
                name="addressZip"
                autoComplete="postal-code"
                value={addressZip}
                onChange={(e) => setAddressZip(e.target.value)}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <FormControl fullWidth margin="normal">
              <InputLabel id="communication-preference-label">Communication Preference</InputLabel>
              <Select
                labelId="communication-preference-label"
                id="communication-preference"
                value={communicationPreference}
                label="Communication Preference"
                onChange={(e) => setCommunicationPreference(e.target.value as CommunicationPreference)}
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </Select>
            </FormControl>

            <FormControl component="fieldset" sx={{ mt: 2 }}>
              <FormLabel component="legend">Requested Roles (select at least one)</FormLabel>
              <FormGroup>
                {availableRoles.map((role) => (
                  <FormControlLabel
                    key={role.value}
                    control={
                      <Checkbox
                        checked={requestedRoles.includes(role.value)}
                        onChange={() => handleRoleToggle(role.value)}
                      />
                    }
                    label={role.label}
                  />
                ))}
              </FormGroup>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Completing Profile...' : 'Complete Profile'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
