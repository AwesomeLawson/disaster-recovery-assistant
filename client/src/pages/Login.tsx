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
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

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

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError('');
    setSocialLoading(provider);

    try {
      const firebaseUser = provider === 'google'
        ? await authService.loginWithGoogle()
        : await authService.loginWithFacebook();

      // Check if user profile exists in Firestore
      try {
        await userService.getUser(firebaseUser.uid);
        // Profile exists, go to dashboard
        navigate('/dashboard');
      } catch (profileError: any) {
        // Profile doesn't exist (first-time social login)
        if (profileError?.code === 'functions/not-found') {
          // Redirect to complete profile page
          navigate('/complete-profile');
        } else {
          throw profileError;
        }
      }
    } catch (err: any) {
      // Handle specific Firebase auth errors
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, don't show error
        return;
      }
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(err.message || `Failed to sign in with ${provider}`);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
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
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
              sx={{ mb: 1 }}
            >
              {socialLoading === 'google' ? 'Signing in...' : 'Continue with Google'}
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<FacebookIcon />}
              onClick={() => handleSocialLogin('facebook')}
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
              {socialLoading === 'facebook' ? 'Signing in...' : 'Continue with Facebook'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link component={RouterLink} to="/register" variant="body2">
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
