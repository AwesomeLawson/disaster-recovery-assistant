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
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { assessmentService } from '../services/assessment.service';
import type { Assessment, AssessmentSeverity, HomeType, FEMAStatus } from '../types';

function YNToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_e, v) => { if (v !== null) onChange(v); }}
    >
      <ToggleButton value={true}>Yes</ToggleButton>
      <ToggleButton value={false}>No</ToggleButton>
    </ToggleButtonGroup>
  );
}

export const FieldAssessment: React.FC = () => {
  const { id: assessmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // On-site findings
  const [placeName, setPlaceName] = useState('');
  const [damages, setDamages] = useState('');
  const [needs, setNeeds] = useState('');
  const [affectedPeople, setAffectedPeople] = useState('');
  const [severity, setSeverity] = useState<AssessmentSeverity>('medium');
  const [flaggedForReview, setFlaggedForReview] = useState(false);

  // Occupancy & Household
  const [currentlyOccupied, setCurrentlyOccupied] = useState(false);
  const [numberOfOccupants, setNumberOfOccupants] = useState('');
  const [householdUnder18, setHouseholdUnder18] = useState('');
  const [household19to64, setHousehold19to64] = useState('');
  const [household65plus, setHousehold65plus] = useState('');

  // Property
  const [isPrimaryResidence, setIsPrimaryResidence] = useState(true);
  const [isHabitable, setIsHabitable] = useState(false);
  const [survivorOwnsProperty, setSurvivorOwnsProperty] = useState(true);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [homeType, setHomeType] = useState<HomeType>('stick_built');

  // Insurance & FEMA
  const [hasHOInsurance, setHasHOInsurance] = useState(false);
  const [insuranceContacted, setInsuranceContacted] = useState(false);
  const [registeredForFEMA, setRegisteredForFEMA] = useState<FEMAStatus>('no');

  // Access
  const [accessConcerns, setAccessConcerns] = useState('');

  // Photos
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!assessmentId) return;
    assessmentService.getAssessment(assessmentId)
      .then((a) => {
        setAssessment(a);
        // Pre-populate from existing data if re-assessing
        if (a.placeName) setPlaceName(a.placeName);
        else if (a.survivorName) setPlaceName(`${a.survivorName} Residence`);
        if (a.damages) setDamages(a.damages);
        if (a.needs) setNeeds(a.needs);
        if (a.affectedPeople != null) setAffectedPeople(String(a.affectedPeople));
        if (a.severity) setSeverity(a.severity);
        if (a.flaggedForReview) setFlaggedForReview(a.flaggedForReview);
        if (a.currentlyOccupied != null) setCurrentlyOccupied(a.currentlyOccupied);
        if (a.numberOfOccupants != null) setNumberOfOccupants(String(a.numberOfOccupants));
        if (a.householdUnder18 != null) setHouseholdUnder18(String(a.householdUnder18));
        if (a.household19to64 != null) setHousehold19to64(String(a.household19to64));
        if (a.household65plus != null) setHousehold65plus(String(a.household65plus));
        if (a.isPrimaryResidence != null) setIsPrimaryResidence(a.isPrimaryResidence);
        if (a.isHabitable != null) setIsHabitable(a.isHabitable);
        if (a.survivorOwnsProperty != null) setSurvivorOwnsProperty(a.survivorOwnsProperty);
        if (a.ownerName) setOwnerName(a.ownerName);
        if (a.ownerPhone) setOwnerPhone(a.ownerPhone);
        if (a.homeType) setHomeType(a.homeType);
        if (a.hasHOInsurance != null) setHasHOInsurance(a.hasHOInsurance);
        if (a.insuranceContacted != null) setInsuranceContacted(a.insuranceContacted);
        if (a.registeredForFEMA) setRegisteredForFEMA(a.registeredForFEMA);
        if (a.accessConcerns) setAccessConcerns(a.accessConcerns);
        if (a.photoUrls?.length) setExistingPhotoUrls(a.photoUrls);
      })
      .catch((err) => setError(err.message || 'Failed to load case'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  const addPhotos = (files: FileList) => {
    const fileArr = Array.from(files);
    setNewPhotoFiles((prev) => [...prev, ...fileArr]);
    setPreviewUrls((prev) => [...prev, ...fileArr.map((f) => URL.createObjectURL(f))]);
  };

  const removeNewPhoto = (i: number) => {
    URL.revokeObjectURL(previewUrls[i]);
    setNewPhotoFiles((prev) => prev.filter((_, j) => j !== i));
    setPreviewUrls((prev) => prev.filter((_, j) => j !== i));
  };

  const removeExistingPhoto = (i: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async () => {
    if (!damages || !needs || !affectedPeople || !severity) {
      setError('Damages, needs, number of people affected, and severity are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      let uploadedUrls: string[] = [];
      if (newPhotoFiles.length > 0) {
        uploadedUrls = await assessmentService.uploadPhotos(newPhotoFiles, assessmentId!);
      }
      const allPhotoUrls = [...existingPhotoUrls, ...uploadedUrls];

      const payload: Record<string, any> = {
        assessmentId: assessmentId!,
        damages,
        needs,
        affectedPeople: parseInt(affectedPeople),
        severity,
        flaggedForReview,
        currentlyOccupied,
        isPrimaryResidence,
        isHabitable,
        survivorOwnsProperty,
        homeType,
        hasHOInsurance,
        registeredForFEMA,
      };
      if (placeName) payload.placeName = placeName;
      if (numberOfOccupants) payload.numberOfOccupants = parseInt(numberOfOccupants);
      if (householdUnder18) payload.householdUnder18 = parseInt(householdUnder18);
      if (household19to64) payload.household19to64 = parseInt(household19to64);
      if (household65plus) payload.household65plus = parseInt(household65plus);
      if (!survivorOwnsProperty && ownerName) payload.ownerName = ownerName;
      if (!survivorOwnsProperty && ownerPhone) payload.ownerPhone = ownerPhone;
      if (hasHOInsurance) payload.insuranceContacted = insuranceContacted;
      if (accessConcerns) payload.accessConcerns = accessConcerns;
      if (allPhotoUrls.length > 0) payload.photoUrls = allPhotoUrls;

      await assessmentService.completeFieldAssessment(payload as any);
      navigate(`/assessments/${assessmentId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save field assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  const totalPhotos = existingPhotoUrls.length + newPhotoFiles.length;
  const isReassessment = assessment?.status === 'assessed';

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={() => navigate(`/assessments/${assessmentId}`)}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5">
            {isReassessment ? 'Update Field Assessment' : 'Complete Field Assessment'}
          </Typography>
          {assessment && (
            <Typography variant="body2" color="text.secondary">
              {assessment.survivorName} — {assessment.address}
            </Typography>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* On-Site Findings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>On-Site Findings</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Property / Place Name (optional)"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="e.g. Smith Residence"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              label="Damages"
              value={damages}
              onChange={(e) => setDamages(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              required
              fullWidth
              multiline
              rows={4}
              label="Needs (equipment, tasks, scope of work)"
              value={needs}
              onChange={(e) => setNeeds(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              required
              fullWidth
              type="number"
              label="People Affected"
              value={affectedPeople}
              onChange={(e) => setAffectedPeople(e.target.value)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth required>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severity}
                label="Severity"
                onChange={(e) => setSeverity(e.target.value as AssessmentSeverity)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Access Concerns (optional)"
              value={accessConcerns}
              onChange={(e) => setAccessConcerns(e.target.value)}
              placeholder="Dogs, gated entry, hazards, etc."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Occupancy & Household */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Occupancy &amp; Household</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>Currently Occupied?</Typography>
              <YNToggle value={currentlyOccupied} onChange={setCurrentlyOccupied} />
            </Box>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="number" label="# of Occupants" value={numberOfOccupants}
              onChange={(e) => setNumberOfOccupants(e.target.value)} inputProps={{ min: 0 }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="number" label="Under 18" value={householdUnder18}
              onChange={(e) => setHouseholdUnder18(e.target.value)} inputProps={{ min: 0 }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="number" label="Ages 19–64" value={household19to64}
              onChange={(e) => setHousehold19to64(e.target.value)} inputProps={{ min: 0 }} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth type="number" label="Ages 65+" value={household65plus}
              onChange={(e) => setHousehold65plus(e.target.value)} inputProps={{ min: 0 }} />
          </Grid>
        </Grid>
      </Paper>

      {/* Property Information */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Property Information</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 160 }}>Primary Residence?</Typography>
              <YNToggle value={isPrimaryResidence} onChange={setIsPrimaryResidence} />
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 160 }}>Habitable?</Typography>
              <YNToggle value={isHabitable} onChange={setIsHabitable} />
            </Box>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 160 }}>Survivor Owns Property?</Typography>
              <YNToggle value={survivorOwnsProperty} onChange={setSurvivorOwnsProperty} />
            </Box>
          </Grid>
          {!survivorOwnsProperty && (
            <>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Property Owner Name" value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Property Owner Phone" value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)} />
              </Grid>
            </>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Home Type</InputLabel>
              <Select value={homeType} label="Home Type"
                onChange={(e) => setHomeType(e.target.value as HomeType)}>
                <MenuItem value="stick_built">Stick Built</MenuItem>
                <MenuItem value="mobile_modular">Mobile / Modular</MenuItem>
                <MenuItem value="block">Block</MenuItem>
                <MenuItem value="multi_family">Multi-Family</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Insurance & FEMA */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Insurance &amp; FEMA</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ minWidth: 220 }}>Has Homeowner's Insurance?</Typography>
              <YNToggle value={hasHOInsurance} onChange={setHasHOInsurance} />
            </Box>
          </Grid>
          {hasHOInsurance && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ minWidth: 220 }}>Insurance Contacted?</Typography>
                <YNToggle value={insuranceContacted} onChange={setInsuranceContacted} />
              </Box>
            </Grid>
          )}
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
        </Grid>
      </Paper>

      {/* Photos */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Photos</Typography>
        <Divider sx={{ mb: 2 }} />

        {totalPhotos > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            {existingPhotoUrls.map((url, i) => (
              <Box key={`existing-${i}`} sx={{ position: 'relative' }}>
                <Box component="img" src={url} onClick={() => window.open(url, '_blank')}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', display: 'block' }} />
                <IconButton size="small" onClick={() => removeExistingPhoto(i)}
                  sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20,
                    bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}>
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            ))}
            {previewUrls.map((url, i) => (
              <Box key={`new-${i}`} sx={{ position: 'relative' }}>
                <Box component="img" src={url}
                  sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, display: 'block', opacity: 0.75 }} />
                <IconButton size="small" onClick={() => removeNewPhoto(i)}
                  sx={{ position: 'absolute', top: -8, right: -8, width: 20, height: 20,
                    bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } }}>
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" component="label" startIcon={<AddPhotoAlternateIcon />} disabled={submitting}>
            Add Photos
            <input type="file" hidden multiple accept="image/*"
              onChange={(e) => { if (e.target.files?.length) addPhotos(e.target.files); (e.target as HTMLInputElement).value = ''; }} />
          </Button>
          {totalPhotos > 0 && (
            <Typography variant="caption" color="text.secondary">
              {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
              {newPhotoFiles.length > 0 && ` · ${newPhotoFiles.length} pending upload`}
            </Typography>
          )}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={() => navigate(`/assessments/${assessmentId}`)} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting
            ? (newPhotoFiles.length > 0 ? 'Uploading photos...' : 'Saving...')
            : isReassessment ? 'Update Assessment' : 'Complete Field Assessment'}
        </Button>
      </Box>
    </Container>
  );
};
