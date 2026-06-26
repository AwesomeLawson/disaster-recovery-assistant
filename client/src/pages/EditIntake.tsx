import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  TextField,
  Alert,
  Grid,
  Divider,
  CircularProgress,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { workOrderService } from '../services/workOrder.service';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import type { FEMAStatus } from '../types';

export const EditIntake: React.FC = () => {
  const { id: workOrderId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [survivorName, setSurvivorName] = useState('');
  const [survivorPhone, setSurvivorPhone] = useState('');
  const [altContact, setAltContact] = useState('');
  const [altContactPhone, setAltContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [tempAddress, setTempAddress] = useState('');
  const [descriptionOfNeed, setDescriptionOfNeed] = useState('');
  const [source, setSource] = useState('');
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [registeredForFEMA, setRegisteredForFEMA] = useState<FEMAStatus | ''>('');
  const [hasHOInsurance, setHasHOInsurance] = useState<boolean | null>(null);

  useEffect(() => {
    if (!workOrderId) return;
    workOrderService.getWorkOrder(workOrderId)
      .then((a) => {
        setSurvivorName(a.survivorName ?? '');
        setSurvivorPhone(a.survivorPhone ?? '');
        setAltContact(a.altContact ?? '');
        setAltContactPhone(a.altContactPhone ?? '');
        setAddress(a.address ?? '');
        setLatitude(a.latitude);
        setLongitude(a.longitude);
        setTempAddress(a.tempAddress ?? '');
        setDescriptionOfNeed(a.descriptionOfNeed ?? '');
        setSource(a.source ?? '');
        setWorkOrderNumber(a.workOrderNumber ?? '');
        if (a.registeredForFEMA) setRegisteredForFEMA(a.registeredForFEMA);
        if (a.hasHOInsurance != null) setHasHOInsurance(a.hasHOInsurance);
      })
      .catch((err) => setError(err.message || 'Failed to load work order'))
      .finally(() => setLoading(false));
  }, [workOrderId]);

  const handleSave = async () => {
    if (!survivorName || !survivorPhone || !address || !descriptionOfNeed) {
      setError('Survivor name, phone, address, and description of need are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updates: Record<string, any> = {
        survivorName,
        survivorPhone,
        address,
        descriptionOfNeed,
      };
      if (altContact) updates.altContact = altContact; else updates.altContact = null;
      if (altContactPhone) updates.altContactPhone = altContactPhone; else updates.altContactPhone = null;
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
      if (tempAddress) updates.tempAddress = tempAddress; else updates.tempAddress = null;
      if (source) updates.source = source; else updates.source = null;
      if (workOrderNumber) updates.workOrderNumber = workOrderNumber; else updates.workOrderNumber = null;
      if (registeredForFEMA) updates.registeredForFEMA = registeredForFEMA;
      if (hasHOInsurance != null) updates.hasHOInsurance = hasHOInsurance;

      await workOrderService.updateWorkOrder(workOrderId!, updates);
      navigate(`/work-orders/${workOrderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={() => navigate(`/work-orders/${workOrderId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Edit Intake Information</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Survivor Contact</Typography>
        <Divider sx={{ mt: 0.5, mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField required fullWidth label="Survivor Name" value={survivorName}
              onChange={(e) => setSurvivorName(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField required fullWidth label="Survivor Phone" value={survivorPhone}
              onChange={(e) => setSurvivorPhone(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Alt Contact Name (optional)" value={altContact}
              onChange={(e) => setAltContact(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Alt Contact Phone (optional)" value={altContactPhone}
              onChange={(e) => setAltContactPhone(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Property</Typography>
        <Divider sx={{ mt: 0.5, mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <AddressAutocomplete
              required
              value={address}
              onChange={(addr) => { setAddress(addr); setLatitude(undefined); setLongitude(undefined); }}
              onPlaceSelect={({ address: addr, latitude: lat, longitude: lng }) => {
                setAddress(addr); setLatitude(lat); setLongitude(lng);
              }}
              coordinates={latitude != null && longitude != null ? { latitude, longitude } : null}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth label="Temporary Address (optional)" value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              placeholder="Where survivor is staying if displaced" />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>Request Details</Typography>
        <Divider sx={{ mt: 0.5, mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField required fullWidth multiline rows={4} label="Description of Need"
              value={descriptionOfNeed} onChange={(e) => setDescriptionOfNeed(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Source (optional)" value={source}
              onChange={(e) => setSource(e.target.value)} placeholder="e.g. Phone, Walk-in, Referral" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Work Order Number (optional)" value={workOrderNumber}
              onChange={(e) => setWorkOrderNumber(e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 220 }}>Registered for FEMA?</Typography>
              <ToggleButtonGroup exclusive size="small" value={registeredForFEMA}
                onChange={(_e, v) => { if (v !== null) setRegisteredForFEMA(v); }}>
                <ToggleButton value="yes">Yes</ToggleButton>
                <ToggleButton value="no">No</ToggleButton>
                <ToggleButton value="na">N/A</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 220 }}>Has Homeowner's Insurance?</Typography>
              <ToggleButtonGroup exclusive size="small" value={hasHOInsurance}
                onChange={(_e, v) => { if (v !== null) setHasHOInsurance(v); }}>
                <ToggleButton value={true}>Yes</ToggleButton>
                <ToggleButton value={false}>No</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(`/work-orders/${workOrderId}`)} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>
    </Container>
  );
};
