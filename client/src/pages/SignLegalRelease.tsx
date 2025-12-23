import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Divider,
} from '@mui/material';
import { DigitalSignature } from '../components/DigitalSignature';
import { legalReleaseService } from '../services/legalRelease.service';
import { useAuth } from '../context/AuthContext';

export const SignLegalRelease: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, refreshUser } = useAuth();
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!signature) {
      setError('Please provide your signature');
      return;
    }

    if (!firebaseUser) {
      setError('You must be logged in to sign the release');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Convert signature data URL to blob
      const response = await fetch(signature);
      const blob = await response.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });

      // Upload signature
      const signatureUrl = await legalReleaseService.uploadSignature(file, firebaseUser.uid);

      // Create legal release
      const release = await legalReleaseService.createLegalRelease(
        firebaseUser.uid,
        'volunteer',
        {
          signatureImageUrl: signatureUrl,
          signedDigitally: true,
        }
      );

      // Sign the legal release
      await legalReleaseService.signLegalRelease(release.id, signatureUrl);

      // Refresh user data
      await refreshUser();

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign legal release');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="md">
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
            Volunteer Legal Release
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Before you can participate as a volunteer, you must agree to our legal terms and
            conditions.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Terms and Conditions
            </Typography>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: 'grey.50',
                maxHeight: 300,
                overflowY: 'auto',
                border: '1px solid',
                borderColor: 'grey.300',
              }}
            >
              <Typography variant="body2" paragraph>
                <strong>Volunteer Waiver and Release Agreement</strong>
              </Typography>
              <Typography variant="body2" paragraph>
                I, the undersigned volunteer, hereby acknowledge and agree to the following terms
                and conditions:
              </Typography>
              <Typography variant="body2" component="div">
                <ol>
                  <li>
                    I understand that my volunteer work may involve certain risks and hazards.
                  </li>
                  <li>
                    I voluntarily assume all risks associated with my volunteer activities.
                  </li>
                  <li>
                    I release and hold harmless the organization, its officers, directors,
                    employees, and agents from any and all liability, claims, or demands.
                  </li>
                  <li>
                    I agree to follow all safety guidelines and instructions provided by the
                    organization.
                  </li>
                  <li>
                    I understand that the organization does not provide insurance coverage for
                    volunteers.
                  </li>
                  <li>
                    I certify that I am physically and mentally capable of performing the volunteer
                    work.
                  </li>
                  <li>
                    I agree to comply with all applicable laws and regulations during my volunteer
                    activities.
                  </li>
                </ol>
              </Typography>
            </Paper>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <DigitalSignature onSignatureChange={setSignature} />
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            By signing above, I acknowledge that I have read and understood the terms and
            conditions of this Volunteer Waiver and Release Agreement.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/login')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading || !signature}
            >
              {loading ? 'Submitting...' : 'Sign and Continue'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
