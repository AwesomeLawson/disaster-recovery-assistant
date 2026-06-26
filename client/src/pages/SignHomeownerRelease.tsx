import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Divider,
  TextField,
  CircularProgress,
} from '@mui/material';
import { DigitalSignature } from '../components/DigitalSignature';
import { homeownerReleaseService } from '../services/homeownerRelease.service';
import { workOrderService } from '../services/workOrder.service';
import { useAuth } from '../context/AuthContext';
import type { WorkOrder } from '../types';

export const SignHomeownerRelease: React.FC = () => {
  const { id: workOrderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(true);

  const [homeownerName, setHomeownerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cityStateZip, setCityStateZip] = useState('');

  const [showCoOwner, setShowCoOwner] = useState(false);
  const [coOwnerName, setCoOwnerName] = useState('');
  const [coOwnerPhone, setCoOwnerPhone] = useState('');
  const [coOwnerSig, setCoOwnerSig] = useState<string | null>(null);

  const [frrRepName, setFrrRepName] = useState('');
  const [frrPhone, setFrrPhone] = useState('');
  const [frrDate, setFrrDate] = useState(new Date().toISOString().split('T')[0]);

  const [homeownerSig, setHomeownerSig] = useState<string | null>(null);
  const [frrWitnessSig, setFrrWitnessSig] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const extractCityStateZip = (address: string): string => {
    const parts = address.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) return '';
    const withoutStreet = parts.slice(1);
    const last = withoutStreet[withoutStreet.length - 1];
    // Drop trailing country segment (no digits = not a ZIP-containing part)
    return (/\d/.test(last) ? withoutStreet : withoutStreet.slice(0, -1)).join(', ');
  };

  useEffect(() => {
    if (!workOrderId) return;
    workOrderService.getWorkOrder(workOrderId).then((a) => {
      setWorkOrder(a);
      setHomeownerName(a.survivorName || '');
      setPhoneNumber(a.survivorPhone || '');
      if (a.address) setCityStateZip(extractCityStateZip(a.address));
    }).catch(() => {
      setError('Failed to load work order');
    }).finally(() => setLoadingWorkOrder(false));
  }, [workOrderId]);

  useEffect(() => {
    if (user) {
      setFrrRepName(`${user.firstName} ${user.lastName}`);
      setFrrPhone(user.phoneNumber || '');
    }
  }, [user]);

  const coOwnerValid = !showCoOwner || (!!coOwnerName.trim() && !!coOwnerPhone.trim() && !!coOwnerSig);

  const canSubmit =
    !!homeownerName.trim() &&
    !!phoneNumber.trim() &&
    !!cityStateZip.trim() &&
    !!frrRepName.trim() &&
    !!frrPhone.trim() &&
    !!homeownerSig &&
    !!frrWitnessSig &&
    coOwnerValid;

  const blobFromDataUrl = async (dataUrl: string, filename: string): Promise<File> => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
  };

  const handleSubmit = async () => {
    if (!canSubmit || !workOrderId) return;
    setError('');
    setSubmitting(true);
    try {
      const [homeownerFile, frrFile] = await Promise.all([
        blobFromDataUrl(homeownerSig!, 'homeowner.png'),
        blobFromDataUrl(frrWitnessSig!, 'frr.png'),
      ]);

      const [homeownerUrl, frrUrl] = await Promise.all([
        homeownerReleaseService.uploadSignature(homeownerFile, workOrderId, 'homeowner'),
        homeownerReleaseService.uploadSignature(frrFile, workOrderId, 'frrWitness'),
      ]);

      let coOwnerUrl: string | undefined;
      if (showCoOwner && coOwnerSig) {
        const coOwnerFile = await blobFromDataUrl(coOwnerSig, 'coowner.png');
        coOwnerUrl = await homeownerReleaseService.uploadSignature(coOwnerFile, workOrderId, 'coOwner');
      }

      await homeownerReleaseService.createHomeownerRelease({
        workOrderId,
        homeownerName: homeownerName.trim(),
        phoneNumber: phoneNumber.trim(),
        propertyAddress: workOrder?.address || '',
        propertyCityStateZip: cityStateZip.trim(),
        ...(showCoOwner ? { coOwnerName: coOwnerName.trim(), coOwnerPhone: coOwnerPhone.trim() } : {}),
        frrRepName: frrRepName.trim(),
        frrPhone: frrPhone.trim(),
        homeownerSignatureUrl: homeownerUrl,
        ...(coOwnerUrl ? { coOwnerSignatureUrl: coOwnerUrl } : {}),
        frrWitnessSignatureUrl: frrUrl,
      });

      navigate(`/work-orders/${workOrderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit release');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWorkOrder) {
    return (
      <Container maxWidth="md" sx={{ mt: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ my: 6 }}>
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 } }}>

          <Typography variant="h5" fontWeight={700} align="center" gutterBottom>
            Response Homeowner Liability Release
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Faith Responders · 3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799
          </Typography>

          <Divider sx={{ mb: 3 }} />

          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
            <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
              (I/We) testify that (I/We) am the owner/occupant of the listed property and indicate by (my/our)
              signature(s) below that (I/we) hold the volunteers of the Global Methodist Church, GMC Conferences,
              Faith Responders and any of its affiliates or their organizations, representatives, agents, service
              providers, harmless from any damage or injury that may occur on my property, including personal injury.
              Further (I/We) understand that no warranty or guarantee, express or implied, is provided for work
              performed on my property. (I/We) the homeowner has taken photos needed for insurance and gives
              permission for repairs, demolition and/or debris removal.
            </Typography>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mt: 2 }}>
              (I/We) understand that said organization and its affiliates do not have insurance coverage for
              protection against legal claims or liability damage suites that might arise in their work on (my/our)
              home and property. Therefore, in consideration of the volunteer services to be rendered to me or my
              property by the volunteers, I agree, by signing below, to release and to hold harmless the volunteers
              from Faith Responders, the Global Methodist Church, GMC Conferences and any/all their affiliates from
              any liability, injury, damages, loss, accident, delay or irregularity related to the volunteers and
              services as mentioned above. This release binds the undersigned and his/her heirs, representatives,
              and assignees.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Homeowner info */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Homeowner Information</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Name of Homeowner"
              value={homeownerName}
              onChange={(e) => setHomeownerName(e.target.value)}
              required
              sx={{ flex: '1 1 260px' }}
            />
            <TextField
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              sx={{ flex: '1 1 180px' }}
            />
          </Box>
          <TextField
            fullWidth
            label="Address of Property"
            value={workOrder?.address || ''}
            disabled
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="City / State / ZIP"
            value={cityStateZip}
            onChange={(e) => setCityStateZip(e.target.value)}
            required
            sx={{ mb: 3 }}
          />

          {/* Homeowner signature */}
          <Typography variant="subtitle2" gutterBottom>
            Signature of Homeowner <span style={{ color: 'red' }}>*</span>
          </Typography>
          <DigitalSignature onSignatureChange={setHomeownerSig} />

          {/* Co-owner */}
          <Box sx={{ mt: 2, mb: 1 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setShowCoOwner((v) => !v);
                setCoOwnerName('');
                setCoOwnerPhone('');
                setCoOwnerSig(null);
              }}
            >
              {showCoOwner ? 'Remove Co-Owner' : 'Add Co-Owner'}
            </Button>
          </Box>
          {showCoOwner && (
            <Box sx={{ mb: 2, pl: 0 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField
                  label="Name of Co-Owner"
                  value={coOwnerName}
                  onChange={(e) => setCoOwnerName(e.target.value)}
                  required
                  sx={{ flex: '1 1 260px' }}
                />
                <TextField
                  label="Co-Owner Phone"
                  value={coOwnerPhone}
                  onChange={(e) => setCoOwnerPhone(e.target.value)}
                  required
                  sx={{ flex: '1 1 180px' }}
                />
              </Box>
              <Typography variant="subtitle2" gutterBottom>
                Signature of Co-Owner <span style={{ color: 'red' }}>*</span>
              </Typography>
              <DigitalSignature onSignatureChange={setCoOwnerSig} />
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* FRR Rep */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>Faith Responder Representative</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Faith Responder Rep"
              value={frrRepName}
              onChange={(e) => setFrrRepName(e.target.value)}
              required
              sx={{ flex: '1 1 260px' }}
            />
            <TextField
              label="Phone Number"
              value={frrPhone}
              onChange={(e) => setFrrPhone(e.target.value)}
              required
              sx={{ flex: '1 1 180px' }}
            />
            <TextField
              label="Date"
              type="date"
              value={frrDate}
              onChange={(e) => setFrrDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
              sx={{ flex: '1 1 160px' }}
            />
          </Box>

          <Typography variant="subtitle2" gutterBottom>
            Signature of FRR Witness <span style={{ color: 'red' }}>*</span>
          </Typography>
          <DigitalSignature onSignatureChange={setFrrWitnessSig} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate(`/work-orders/${workOrderId}`)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={submitting || !canSubmit}>
              {submitting ? 'Submitting...' : 'Sign and Save'}
            </Button>
          </Box>

        </Paper>
      </Box>
    </Container>
  );
};
