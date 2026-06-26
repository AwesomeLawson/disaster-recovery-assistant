import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  Link,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import HandymanIcon from '@mui/icons-material/Handyman';
import FoodBankIcon from '@mui/icons-material/FoodBank';
import HomeRepairServiceIcon from '@mui/icons-material/HomeRepairService';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

const VOLUNTEER_ACTIVITIES = [
  { icon: <FoodBankIcon fontSize="small" />, label: 'Meal preparation' },
  { icon: <HandymanIcon fontSize="small" />, label: 'Debris cleanup & chainsaw work' },
  { icon: <HomeRepairServiceIcon fontSize="small" />, label: 'Home repairs' },
  { icon: <VolunteerActivismIcon fontSize="small" />, label: 'Family & community recovery support' },
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google') => {
    setError('');
    setSocialLoading(provider);
    try {
      const firebaseUser = await authService.loginWithGoogle();
      try {
        await userService.getUser(firebaseUser.uid);
        navigate('/dashboard');
      } catch (profileError: any) {
        if (profileError?.code === 'functions/not-found') {
          navigate('/complete-profile');
        } else {
          throw profileError;
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') return;
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(err.message || 'Failed to sign in with Google');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left panel — mission / branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: '0 0 480px',
          bgcolor: '#1C2B5A',
          color: '#fff',
          p: 6,
        }}
      >
        {/* Logo */}
        <Box>
          <Box sx={{ bgcolor: '#fff', display: 'inline-block', borderRadius: 2, px: 2, py: 1, mb: 5 }}>
            <img src="/logo.png" alt="Faith Responders" style={{ height: 52, display: 'block' }} />
          </Box>

          <Typography variant="h4" fontWeight={700} sx={{ mb: 2, lineHeight: 1.3 }}>
            Sharing the restorative love of God
          </Typography>
          <Typography variant="body1" sx={{ color: '#B8C8E8', mb: 4, lineHeight: 1.8 }}>
            Faith Responders is a volunteer coordination platform — a
            501(c)(3) nonprofit empowering congregations to provide disaster relief and
            recovery to families in need.
          </Typography>

          {/* Volunteer activities */}
          <Typography variant="overline" sx={{ color: '#F2C230', letterSpacing: 2, mb: 2, display: 'block' }}>
            Volunteers serve through
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {VOLUNTEER_ACTIVITIES.map(({ icon, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: '#F2C230' }}>{icon}</Box>
                <Typography variant="body2" sx={{ color: '#D0DDF5' }}>{label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Scripture quote */}
        <Box sx={{ borderLeft: '3px solid #F2C230', pl: 2, mt: 4 }}>
          <Typography variant="body2" sx={{ color: '#B8C8E8', fontStyle: 'italic', lineHeight: 1.7 }}>
            "The only thing that counts is faith expressing itself through love."
          </Typography>
          <Typography variant="caption" sx={{ color: '#F2C230', mt: 0.5, display: 'block' }}>
            Galatians 5:6
          </Typography>
        </Box>
      </Box>

      {/* Right panel — sign-in form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 3,
          py: 6,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 420 }}>
          {/* Mobile-only logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 4 }}>
            <img src="/logo.png" alt="Faith Responders" style={{ height: 64 }} />
          </Box>

          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" fontWeight={800} color="primary" gutterBottom>
              Faith Responders
            </Typography>
            <Typography component="h2" variant="h6" fontWeight={600} gutterBottom>
              Sign In
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Access the Faith Responders volunteer coordination platform.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
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
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading || socialLoading !== null}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Divider sx={{ my: 2 }}>or</Divider>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={() => handleSocialLogin('google')}
                disabled={loading || socialLoading !== null}
                sx={{ mb: 2 }}
              >
                {socialLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Link component={RouterLink} to="/register" variant="body2">
                  Don't have an account? Sign Up
                </Link>
              </Box>
            </Box>
          </Paper>

          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 3 }}>
            Faith Responders · Tallahassee, FL · 850-363-6799
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
