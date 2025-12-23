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
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/user.service';
import type { UserRole, CommunicationPreference } from '../types';

export const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference>('email');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const availableRoles: { value: UserRole; label: string }[] = [
    { value: 'assessor', label: 'Assessor' },
    { value: 'workGroupLead', label: 'Work Group Lead' },
    { value: 'worker', label: 'Worker' },
  ];

  // Redirect if user already has a profile
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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

    if (requestedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);

    try {
      // Register user profile with email from Firebase Auth
      await userService.registerUser({
        email: firebaseUser.email || '',
        phoneNumber,
        communicationPreference,
        requestedRoles,
      });

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
            <TextField
              margin="normal"
              required
              fullWidth
              id="phoneNumber"
              label="Phone Number"
              name="phoneNumber"
              autoComplete="tel"
              autoFocus
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
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
