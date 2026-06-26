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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { DigitalSignature } from '../components/DigitalSignature';
import { legalReleaseService } from '../services/legalRelease.service';
import { useAuth } from '../context/AuthContext';

const SECTIONS: { id: string; text: string }[] = [
  {
    id: 'travel',
    text: 'I have chosen to travel to the designated disaster response or recovery area to perform cleanup, response or recovery construction work designed to assist homeowners impacted by a disaster.',
  },
  {
    id: 'compliance',
    text: 'I acknowledge and agree that, in the event of a local disaster, any actions I take while representing or operating under the name of Faith Responders shall bind me, and any individual, organization, or church I am affiliated with for the purposes of such service, to full compliance with all safety protocols, procedures, rules, and regulations established by Faith Responders.',
  },
  {
    id: 'notification',
    text: 'I further acknowledge and agree that Faith Responders must be notified of, and made aware of, any actions, engagement, or response activities undertaken by me or on my behalf while operating under its name or authority.',
  },
  {
    id: 'physicalRisk',
    text: 'I understand that this work entails a risk of physical injury and often involves hard physical labor, heavy lifting, and other strenuous activity, and that some activities may take place on or while using equipment and/or on ladders. I certify that I am in good health and physically able to perform this work. I also certify that I understand and agree to follow the safety protocols for on-site work and in using the equipment needed for this work.',
  },
  {
    id: 'accommodations',
    text: 'In the event that I require accommodations, I acknowledge and agree that Faith Responders, the Global Methodist Church, the host site, and any associated church are not responsible or liable for my personal belongings or property, nor are they obligated to provide secure storage, lock-up facilities, or security for any items I bring. I agree to hold harmless and release Faith Responders and its affiliates from any liability for theft, loss, or damage to my property, regardless of the source or cause.',
  },
  {
    id: 'conductRules',
    text: 'I further acknowledge that I am required to comply with all rules, policies, and regulations governing the accommodations in effect at the time of my stay. I understand and agree that no alcoholic beverages, smoking, or firearms are permitted at any housing location or on church property.',
  },
  {
    id: 'confidentiality',
    text: 'I understand the need for confidentiality and will not discuss, photograph or otherwise disclose identifying information about the occupants of the home or location I am working on without prior permission from the homeowner and Faith Responders. This includes any references to names, addresses or other identifiable information. This also includes postings to social media, Facebook or church marketing.',
  },
  {
    id: 'photoPermission',
    text: 'I grant permission to Faith Responders, its representatives, staff and partnering organizations to photograph, film or otherwise record my image, likeness, voice or statements during any Faith Responders events, outreach, deployment, training or activity. I authorize Faith Responders to use these photos, videos and recordings for ministry purposes including but not limited to social media, Facebook, email, fundraising, volunteer recruitment, website or printed materials. I understand these images may be used without compensation and may be edited, modified, or combined with other media.',
  },
];

export const SignLegalRelease: React.FC = () => {
  const navigate = useNavigate();
  const { firebaseUser, user, refreshUser } = useAuth();
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const allAcknowledged = SECTIONS.every((s) => acknowledged[s.id]);
  const canSubmit = allAcknowledged && !!signature;

  const toggleAck = (id: string) =>
    setAcknowledged((prev) => ({ ...prev, [id]: !prev[id] }));

  const fullName = user ? `${user.firstName} ${user.lastName}` : firebaseUser?.displayName || '';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!firebaseUser) {
      setError('You must be logged in to sign the release');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch(signature!);
      const blob = await response.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const signatureUrl = await legalReleaseService.uploadSignature(file, firebaseUser.uid);
      const release = await legalReleaseService.createLegalRelease(firebaseUser.uid, 'volunteer', {
        signatureImageUrl: signatureUrl,
        signedDigitally: true,
      });
      await legalReleaseService.signLegalRelease(release.id, signatureUrl);
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
      <Box sx={{ my: 6 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 } }}>

          {/* Header */}
          <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
            Individual Release of Liability
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Faith Responders Disaster Relief and Recovery Agency, a ministry partner of the Florida Conference of the GMC
            <br />
            3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Please read before signing</strong>, as this constitutes an agreement as a volunteer and the
            understanding of your working relationship with Faith Responders Disaster Relief and Recovery Agency.
          </Typography>

          {fullName && (
            <Typography variant="body1" sx={{ mt: 2, mb: 3 }}>
              I, <strong>{fullName}</strong>, acknowledge and state the following:
            </Typography>
          )}

          {/* Sections with acknowledgment checkboxes */}
          {SECTIONS.map((section, index) => (
            <Box
              key={section.id}
              sx={{
                mb: 2,
                p: 2,
                border: '1px solid',
                borderColor: acknowledged[section.id] ? 'success.main' : 'grey.300',
                borderRadius: 1,
                bgcolor: acknowledged[section.id] ? 'success.50' : 'grey.50',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
            >
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                <Box component="span" sx={{ fontWeight: 600, mr: 1 }}>
                  {index + 1}.
                </Box>
                {section.text}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={!!acknowledged[section.id]}
                    onChange={() => toggleAck(section.id)}
                    size="small"
                    color="success"
                  />
                }
                label={
                  <Typography variant="body2" color={acknowledged[section.id] ? 'success.dark' : 'text.secondary'}>
                    I acknowledge and agree to the above
                  </Typography>
                }
              />
            </Box>
          ))}

          <Divider sx={{ my: 3 }} />

          {/* Final release paragraph */}
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
            <Typography variant="body2">
              I{fullName ? <>, <strong> {fullName}</strong>,</> : null} hereby release, discharge, indemnify and forever
              hold Faith Responders, the Global Methodist Church, its affiliates and any other related disaster response
              agency, together with its officers, agents, servants and employees, harmless from any and all causes of
              action arising from my participation in this project, including travel or lodging associated therewith, or
              any damages which may be caused by their own negligence.
            </Typography>
          </Box>

          {firebaseUser ? (
            <>
              {!allAcknowledged && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please acknowledge all {SECTIONS.length} sections above before signing.
                </Alert>
              )}

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              {/* Signature */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Signature</Typography>
                <DigitalSignature onSignatureChange={setSignature} />
              </Box>

              {/* Date / contact info row */}
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Date</Typography>
                  <Typography variant="body2">{today}</Typography>
                </Box>
                {firebaseUser.email && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Email</Typography>
                    <Typography variant="body2">{firebaseUser.email}</Typography>
                  </Box>
                )}
                {user?.phoneNumber && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2">{user.phoneNumber}</Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate('/login')} disabled={loading}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleSubmit} disabled={loading || !canSubmit}>
                  {loading ? 'Submitting...' : 'Sign and Continue'}
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              This is a read-only preview.{' '}
              <Button size="small" onClick={() => navigate('/register')} sx={{ ml: 1 }}>
                Register
              </Button>
              <Button size="small" onClick={() => navigate('/login')} sx={{ ml: 0.5 }}>
                Sign In
              </Button>
            </Alert>
          )}

          <Typography
            variant="body2"
            align="center"
            fontStyle="italic"
            color="text.secondary"
            sx={{ mt: 4 }}
          >
            "The only thing that matters is faith expressing itself through love" — Galatians 5:6 (NIV)
          </Typography>
          <Typography variant="caption" align="center" display="block" color="text.secondary">
            THANK YOU FOR SERVING!
          </Typography>

        </Paper>
      </Box>
    </Container>
  );
};
