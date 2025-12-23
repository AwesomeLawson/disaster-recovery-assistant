import React, { useState } from 'react';
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
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import type { UserRole, CommunicationPreference } from '../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference>('email');
  const [requestedRoles, setRequestedRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const availableRoles: { value: UserRole; label: string }[] = [
    { value: 'assessor', label: 'Assessor' },
    { value: 'workGroupLead', label: 'Work Group Lead' },
    { value: 'worker', label: 'Worker' },
  ];

  const handleRoleToggle = (role: UserRole) => {
    setRequestedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (requestedRoles.length === 0) {
      setError('Please select at least one role');
      return;
    }

    setLoading(true);

    try {
      // Create Firebase auth user
      await authService.register(email, password);

      // Register user profile
      await userService.registerUser({
        email,
        phoneNumber,
        communicationPreference,
        requestedRoles,
      });

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

      // Social sign-up always goes to complete profile page
      navigate('/complete-profile');
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
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
            Create Account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={() => handleSocialSignUp('google')}
              disabled={loading || socialLoading !== null}
              sx={{ mb: 1 }}
            >
              {socialLoading === 'google' ? 'Signing up...' : 'Sign up with Google'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<FacebookIcon />}
              onClick={() => handleSocialSignUp('facebook')}
              disabled={loading || socialLoading !== null}
              sx={{
                mb: 2,
                backgroundColor: '#1877F2',
                color: 'white',
                borderColor: '#1877F2',
                '&:hover': {
                  backgroundColor: '#166FE5',
                  borderColor: '#166FE5',
                },
                '&:disabled': {
                  backgroundColor: '#1877F2',
                  opacity: 0.7,
                },
              }}
            >
              {socialLoading === 'facebook' ? 'Signing up...' : 'Sign up with Facebook'}
            </Button>

            <Divider sx={{ my: 2 }}>or sign up with email</Divider>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
