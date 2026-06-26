import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Chip,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ImageList,
  ImageListItem,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import FlagIcon from '@mui/icons-material/Flag';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import GavelIcon from '@mui/icons-material/Gavel';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { workOrderService } from '../services/workOrder.service';
import { eventService } from '../services/event.service';
import { baseCampService } from '../services/baseCamp.service';
import { userService } from '../services/user.service';
import { homeownerReleaseService } from '../services/homeownerRelease.service';
import { useAuth } from '../context/AuthContext';
import type { WorkOrder, WorkOrderStatus, Event, BaseCamp, User, HomeownerRelease } from '../types';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  intake: 'Intake',
  awaitingAssessment: 'Awaiting Assessment',
  assessed: 'Assessed',
  assigned: 'Assigned',
  inProgress: 'In Progress',
  completed: 'Completed',
};

const STATUS_COLORS: Record<WorkOrderStatus, 'default' | 'info' | 'warning' | 'success' | 'primary' | 'secondary' | 'error'> = {
  intake: 'default',
  awaitingAssessment: 'info',
  assessed: 'warning',
  assigned: 'primary',
  inProgress: 'secondary',
  completed: 'success',
};

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

const homeTypeLabel = (v?: string) =>
  ({ stick_built: 'Stick Built', mobile_modular: 'Mobile / Modular', block: 'Block', multi_family: 'Multi-Family' }[v ?? ''] ?? v ?? '—');

const yn = (v?: boolean | null) => v == null ? '—' : v ? 'Yes' : 'No';
const femaLabel = (v?: string) => v === 'yes' ? 'Yes' : v === 'no' ? 'No' : v === 'na' ? 'N/A' : '—';

export const WorkOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [baseCamp, setBaseCamp] = useState<BaseCamp | null>(null);
  const [assessor, setAssessor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [homeownerRelease, setHomeownerRelease] = useState<HomeownerRelease | null>(null);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assessors, setAssessors] = useState<User[]>([]);
  const [assessorsLoading, setAssessorsLoading] = useState(false);
  const [selectedAssessorId, setSelectedAssessorId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (id) loadWorkOrder();
  }, [id]);

  const loadWorkOrder = async () => {
    try {
      setLoading(true);
      const data = await workOrderService.getWorkOrder(id!);
      setWorkOrder(data);

      const [eventData, baseCampData] = await Promise.all([
        data.eventId ? eventService.getEvent(data.eventId) : Promise.resolve(null),
        baseCampService.getBaseCamp(data.baseCampId),
      ]);
      setEvent(eventData);
      setBaseCamp(baseCampData);

      if (data.assessorId) {
        userService.getUser(data.assessorId).then(setAssessor).catch(() => {});
      }
      if (data.homeownerReleaseId) {
        homeownerReleaseService.getHomeownerRelease(data.homeownerReleaseId)
          .then(setHomeownerRelease).catch(() => {});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load work order');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async () => {
    if (!workOrder) return;
    try {
      await workOrderService.updateWorkOrder(workOrder.id, {
        flaggedForReview: !workOrder.flaggedForReview,
      });
      await loadWorkOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to update flag');
    }
  };

  const handleDelete = async () => {
    if (!workOrder) return;
    try {
      setDeleting(true);
      await workOrderService.deleteWorkOrder(workOrder.id);
      navigate('/work-orders');
    } catch (err: any) {
      setError(err.message || 'Failed to delete work order');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewRelease = async () => {
    if (!workOrder?.homeownerReleaseId) return;
    if (homeownerRelease) { setReleaseDialogOpen(true); return; }
    setReleaseLoading(true);
    setReleaseDialogOpen(true);
    try {
      const release = await homeownerReleaseService.getHomeownerRelease(workOrder.homeownerReleaseId);
      setHomeownerRelease(release);
    } catch {
      // error shown inline
    } finally {
      setReleaseLoading(false);
    }
  };

  const handleOpenAssignDialog = async () => {
    setSelectedAssessorId(workOrder?.assessorId ?? '');
    setAssignDialogOpen(true);
    setAssessorsLoading(true);
    try {
      const all = await userService.listUsers({ role: 'assessor' });
      setAssessors(all);
    } catch {
      setAssessors([]);
    } finally {
      setAssessorsLoading(false);
    }
  };

  const handleAssignAssessor = async () => {
    if (!workOrder || !selectedAssessorId) return;
    setAssigning(true);
    try {
      await workOrderService.assignAssessor(workOrder.id, selectedAssessorId);
      setAssignDialogOpen(false);
      await loadWorkOrder();
    } catch (err: any) {
      setError(err.message || 'Failed to assign assessor');
      setAssignDialogOpen(false);
    } finally {
      setAssigning(false);
    }
  };

  const handlePrintRelease = (release: HomeownerRelease) => {
    const signedDate = new Date(release.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const sigImg = (url: string, label: string) =>
      `<div style="margin-bottom:16px;"><p style="margin:0 0 4px;font-size:12px;color:#555;">${label}</p><img src="${url}" style="max-width:280px;border:1px solid #ccc;border-radius:4px;display:block;" /></div>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
<title>Homeowner Release — ${release.homeownerName}</title>
<style>body{font-family:Arial,sans-serif;max-width:780px;margin:40px auto;padding:20px;color:#111;}h2{text-align:center;}hr{border:none;border-top:1px solid #ccc;margin:20px 0;}.box{padding:12px;background:#f5f5f5;border-radius:4px;font-size:13px;line-height:1.8;margin-bottom:16px;}.label{font-size:11px;color:#777;}.row{display:flex;gap:32px;margin-bottom:16px;}.footer{text-align:center;font-size:12px;color:#777;margin-top:24px;}</style>
</head><body>
<h2>Response Homeowner Liability Release</h2>
<p style="text-align:center;font-size:13px;color:#555;">Faith Responders · 3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799</p>
<hr>
<div class="box">
(I/We) testify that (I/We) am the owner/occupant of the listed property and indicate by (my/our) signature(s) below that (I/we) hold the volunteers of the Global Methodist Church, GMC Conferences, Faith Responders and any of its affiliates or their organizations, representatives, agents, service providers, harmless from any damage or injury that may occur on my property, including personal injury. Further (I/We) understand that no warranty or guarantee, express or implied, is provided for work performed on my property. (I/We) the homeowner has taken photos needed for insurance and gives permission for repairs, demolition and/or debris removal.
<br><br>
(I/We) understand that said organization and its affiliates do not have insurance coverage for protection against legal claims or liability damage suites that might arise in their work on (my/our) home and property. Therefore, in consideration of the volunteer services to be rendered to me or my property by the volunteers, I agree, by signing below, to release and to hold harmless the volunteers from Faith Responders, the Global Methodist Church, GMC Conferences and any/all their affiliates from any liability, injury, damages, loss, accident, delay or irregularity related to the volunteers and services as mentioned above. This release binds the undersigned and his/her heirs, representatives, and assignees.
</div>
<div class="row">
  <div><span class="label">Name of Homeowner</span><br><strong>${release.homeownerName}</strong></div>
  <div><span class="label">Phone Number</span><br>${release.phoneNumber}</div>
</div>
<div class="row">
  <div><span class="label">Address of Property</span><br>${release.propertyAddress}</div>
  <div><span class="label">City / State / ZIP</span><br>${release.propertyCityStateZip}</div>
</div>
${sigImg(release.homeownerSignatureUrl, 'Signature of Homeowner')}
${release.coOwnerName ? `<div class="row"><div><span class="label">Name of Co-Owner</span><br><strong>${release.coOwnerName}</strong></div>${release.coOwnerPhone ? `<div><span class="label">Co-Owner Phone</span><br>${release.coOwnerPhone}</div>` : ''}</div>` : ''}
${release.coOwnerSignatureUrl ? sigImg(release.coOwnerSignatureUrl, 'Signature of Co-Owner') : ''}
<hr>
<div class="row">
  <div><span class="label">Faith Responder Rep</span><br><strong>${release.frrRepName}</strong></div>
  <div><span class="label">Phone</span><br>${release.frrPhone}</div>
  <div><span class="label">Date</span><br>${signedDate}</div>
</div>
${sigImg(release.frrWitnessSignatureUrl, 'Signature of FRR Witness')}
<p class="footer">Faith Responders · 3425 Bannerman Road, Suite 105-274 · Tallahassee FL 32312 · 850-363-6799</p>
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) {
    return <Container maxWidth="lg"><Typography>Loading work order...</Typography></Container>;
  }

  if (!workOrder) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error">Work order not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/work-orders')} sx={{ mt: 2 }}>
          Back to Work Orders
        </Button>
      </Container>
    );
  }

  const isAdmin = user?.roles.includes('administrator');
  const isFieldCoordinator = user?.roles.includes('fieldCoordinator');
  const isAssessor = user?.roles.includes('assessor');
  const canManage = isAdmin || isFieldCoordinator || isAssessor;
  const canFieldAssess = isAdmin || isFieldCoordinator || isAssessor;
  const status = workOrder.status ?? 'intake';
  const isAssessed = status !== 'intake' && status !== 'awaitingAssessment';

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3, gap: 2 }}>
        <IconButton onClick={() => navigate('/work-orders')} sx={{ mt: 0.5 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h4">{workOrder.survivorName}</Typography>
            <Chip
              label={STATUS_LABELS[status]}
              color={STATUS_COLORS[status]}
              size="small"
            />
            {workOrder.flaggedForReview && (
              <Chip label="Flagged for Review" color="warning" size="small" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {workOrder.address}
            {workOrder.workOrderNumber && ` · Work Order #${workOrder.workOrderNumber}`}
          </Typography>
        </Box>
        {canManage && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Button
              variant={workOrder.flaggedForReview ? 'contained' : 'outlined'}
              color="warning"
              startIcon={<FlagIcon />}
              size="small"
              onClick={handleToggleFlag}
            >
              {workOrder.flaggedForReview ? 'Flagged' : 'Flag'}
            </Button>
            {isAdmin && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                size="small"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>

          {/* Intake Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Intake Information</Typography>
              {canManage && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => navigate(`/work-orders/${workOrder.id}/edit-intake`)}
                >
                  Edit
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Survivor Name" value={workOrder.survivorName} />
                <InfoField label="Phone" value={workOrder.survivorPhone} />
                {workOrder.altContact && <InfoField label="Alt Contact" value={workOrder.altContact} />}
                {workOrder.altContactPhone && <InfoField label="Alt Phone" value={workOrder.altContactPhone} />}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <InfoField label="Property Address" value={workOrder.address} />
                {workOrder.tempAddress && <InfoField label="Temp Address" value={workOrder.tempAddress} />}
                {workOrder.county && <InfoField label="County" value={workOrder.county} />}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">Description of Need</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {workOrder.descriptionOfNeed}
                  </Typography>
                </Box>
              </Grid>
              {(workOrder.source || workOrder.intakeVolunteerName) && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <InfoField label="Source" value={workOrder.source} />
                    <InfoField label="Intake Volunteer" value={workOrder.intakeVolunteerName} />
                  </Box>
                </Grid>
              )}
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <InfoField label="Registered for FEMA" value={femaLabel(workOrder.registeredForFEMA)} />
                  <InfoField label="Has H/O Insurance" value={workOrder.hasHOInsurance != null ? yn(workOrder.hasHOInsurance) : undefined} />
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Field Assessment */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6">Field Assessment</Typography>
              {canFieldAssess && isAssessed && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  variant="outlined"
                  onClick={() => navigate(`/work-orders/${workOrder.id}/field-assessment`)}
                >
                  Update
                </Button>
              )}
            </Box>
            <Divider sx={{ mb: 2 }} />

            {!isAssessed ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <AssignmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No field assessment yet. An assessor needs to visit the property.
                </Typography>
                {canFieldAssess && (
                  <Button
                    variant="contained"
                    onClick={() => navigate(`/work-orders/${workOrder.id}/field-assessment`)}
                  >
                    Complete Field Assessment
                  </Button>
                )}
              </Box>
            ) : (
              <Grid container spacing={1}>
                {workOrder.placeName && (
                  <Grid size={{ xs: 12 }}>
                    <InfoField label="Property / Place Name" value={workOrder.placeName} />
                  </Grid>
                )}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Severity</Typography>
                    <Chip
                      label={workOrder.severity?.toUpperCase() ?? '—'}
                      color={
                        workOrder.severity === 'critical' ? 'error' :
                        workOrder.severity === 'high' ? 'warning' :
                        workOrder.severity === 'medium' ? 'info' : 'default'
                      }
                      size="small"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <InfoField label="People Affected" value={workOrder.affectedPeople} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Damages</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {workOrder.damages}
                    </Typography>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" display="block">Needs</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {workOrder.needs}
                    </Typography>
                  </Box>
                </Grid>
                {workOrder.accessConcerns && (
                  <Grid size={{ xs: 12 }}>
                    <InfoField label="Access Concerns" value={workOrder.accessConcerns} />
                  </Grid>
                )}
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Occupancy &amp; Household</Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <InfoField label="Currently Occupied" value={yn(workOrder.currentlyOccupied)} />
                    <InfoField label="# Occupants" value={workOrder.numberOfOccupants} />
                    <InfoField label="Under 18" value={workOrder.householdUnder18} />
                    <InfoField label="Ages 19–64" value={workOrder.household19to64} />
                    <InfoField label="Ages 65+" value={workOrder.household65plus} />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Property</Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <InfoField label="Primary Residence" value={yn(workOrder.isPrimaryResidence)} />
                    <InfoField label="Habitable" value={yn(workOrder.isHabitable)} />
                    <InfoField label="Survivor Owns Property" value={yn(workOrder.survivorOwnsProperty)} />
                    <InfoField label="Home Type" value={homeTypeLabel(workOrder.homeType)} />
                    {workOrder.ownerName && <InfoField label="Owner Name" value={workOrder.ownerName} />}
                    {workOrder.ownerPhone && <InfoField label="Owner Phone" value={workOrder.ownerPhone} />}
                  </Box>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" sx={{ mb: 1, mt: 1 }}>Insurance &amp; FEMA</Typography>
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <InfoField label="Has H/O Insurance" value={yn(workOrder.hasHOInsurance)} />
                    {workOrder.hasHOInsurance && <InfoField label="Insurance Contacted" value={yn(workOrder.insuranceContacted)} />}
                    <InfoField label="Registered for FEMA" value={femaLabel(workOrder.registeredForFEMA)} />
                  </Box>
                </Grid>
                {workOrder.reassessmentCount > 0 && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" color="text.secondary">
                      Reassessment count: {workOrder.reassessmentCount}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </Paper>

          {/* Photos */}
          {workOrder.photoUrls?.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>Photos ({workOrder.photoUrls.length})</Typography>
              <Divider sx={{ mb: 2 }} />
              <ImageList cols={3} gap={8}>
                {workOrder.photoUrls.map((url, index) => (
                  <ImageListItem key={index}>
                    <img src={url} alt={`Photo ${index + 1}`} loading="lazy"
                      style={{ borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => window.open(url, '_blank')} />
                  </ImageListItem>
                ))}
              </ImageList>
            </Paper>
          )}

          {/* Forms */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <GavelIcon fontSize="small" color="action" />
              <Typography variant="h6">Forms</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>Homeowner Release</Typography>
                {workOrder.homeownerReleaseId && homeownerRelease?.signedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Signed {new Date(homeownerRelease.signedAt).toLocaleString()}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {workOrder.homeownerReleaseId ? (
                  <>
                    <Chip label="Signed" color="success" size="small" />
                    <Button size="small" variant="outlined" onClick={handleViewRelease}>View</Button>
                  </>
                ) : (
                  <>
                    <Chip label="Not signed" color="default" size="small" />
                    {canManage && (
                      <Button size="small" variant="contained"
                        onClick={() => navigate(`/work-orders/${workOrder.id}/homeowner-release`)}>
                        Sign
                      </Button>
                    )}
                  </>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Assignment</Typography>
            <Divider sx={{ mb: 2 }} />
            <InfoField label="Event" value={event?.name ?? (workOrder.eventId ? workOrder.eventId : 'No event assigned')} />
            <InfoField label="Base Camp" value={baseCamp?.name ?? workOrder.baseCampId} />
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" display="block">Assessor</Typography>
              <Typography variant="body2">
                {assessor ? `${assessor.firstName} ${assessor.lastName}` : workOrder.assessorId ? workOrder.assessorId : 'Unassigned'}
              </Typography>
            </Box>
            {(isAdmin || isFieldCoordinator) && (
              <Button size="small" variant="outlined" onClick={handleOpenAssignDialog} sx={{ mt: 0.5 }}>
                Assign Assessor
              </Button>
            )}
          </Paper>

          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Timeline</Typography>
            <Divider sx={{ mb: 2 }} />
            <InfoField label="Work Order Opened" value={new Date(workOrder.createdAt).toLocaleString()} />
            <InfoField label="Last Updated" value={new Date(workOrder.updatedAt).toLocaleString()} />
          </Paper>
        </Grid>
      </Grid>

      {/* Homeowner Release Dialog */}
      <Dialog open={releaseDialogOpen} onClose={() => setReleaseDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Homeowner Liability Release
          {homeownerRelease && (
            <Button startIcon={<PrintIcon />} variant="outlined" size="small" onClick={() => handlePrintRelease(homeownerRelease)}>
              Print
            </Button>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {releaseLoading && <Typography>Loading...</Typography>}
          {homeownerRelease && (() => {
            const r = homeownerRelease;
            const signedDate = new Date(r.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            return (
              <>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                  Faith Responders · 3425 Bannerman Road, Suite 105-274 · Tallahassee, FL 32312 · 850-363-6799
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 3 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
                    (I/We) testify that (I/We) am the owner/occupant of the listed property and indicate by
                    (my/our) signature(s) below that (I/we) hold the volunteers of the Global Methodist Church,
                    GMC Conferences, Faith Responders and any of its affiliates or their organizations,
                    representatives, agents, service providers, harmless from any damage or injury that may occur
                    on my property, including personal injury. Further (I/We) understand that no warranty or
                    guarantee, express or implied, is provided for work performed on my property. (I/We) the
                    homeowner has taken photos needed for insurance and gives permission for repairs, demolition
                    and/or debris removal.
                  </Typography>
                  <Typography variant="body2" sx={{ lineHeight: 1.8, mt: 1.5 }}>
                    (I/We) understand that said organization and its affiliates do not have insurance coverage for
                    protection against legal claims or liability damage suites that might arise in their work on
                    (my/our) home and property. Therefore, in consideration of the volunteer services to be
                    rendered to me or my property by the volunteers, I agree, by signing below, to release and to
                    hold harmless the volunteers from Faith Responders, the Global Methodist Church, GMC
                    Conferences and any/all their affiliates from any liability, injury, damages, loss, accident,
                    delay or irregularity related to the volunteers and services as mentioned above. This release
                    binds the undersigned and his/her heirs, representatives, and assignees.
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Name of Homeowner</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.homeownerName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                    <Typography variant="body2">{r.phoneNumber}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Address of Property</Typography>
                    <Typography variant="body2">{r.propertyAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">City / State / ZIP</Typography>
                    <Typography variant="body2">{r.propertyCityStateZip}</Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>Signature of Homeowner</Typography>
                <Box component="img" src={r.homeownerSignatureUrl} alt="Homeowner signature"
                  sx={{ maxWidth: 280, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 2, display: 'block' }} />
                {(r.coOwnerName || r.coOwnerSignatureUrl) && (
                  <>
                    {r.coOwnerName && (
                      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 1 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Name of Co-Owner</Typography>
                          <Typography variant="body2" fontWeight={600}>{r.coOwnerName}</Typography>
                        </Box>
                        {r.coOwnerPhone && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">Co-Owner Phone</Typography>
                            <Typography variant="body2">{r.coOwnerPhone}</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                    {r.coOwnerSignatureUrl && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>Signature of Co-Owner</Typography>
                        <Box component="img" src={r.coOwnerSignatureUrl} alt="Co-owner signature"
                          sx={{ maxWidth: 280, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 2, display: 'block' }} />
                      </>
                    )}
                  </>
                )}
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: 1 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Faith Responder Rep</Typography>
                    <Typography variant="body2" fontWeight={600}>{r.frrRepName}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Phone</Typography>
                    <Typography variant="body2">{r.frrPhone}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Date</Typography>
                    <Typography variant="body2">{signedDate}</Typography>
                  </Box>
                </Box>
                <Typography variant="subtitle2" gutterBottom>Signature of FRR Witness</Typography>
                <Box component="img" src={r.frrWitnessSignatureUrl} alt="FRR witness signature"
                  sx={{ maxWidth: 280, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, mb: 2, display: 'block' }} />
              </>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReleaseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Work Order?</DialogTitle>
        <DialogContent>
          <Typography>
            Permanently delete the work order for <strong>{workOrder.survivorName}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Assessor Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Assign Assessor</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {assessorsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Assessor</InputLabel>
                <Select
                  value={selectedAssessorId}
                  label="Assessor"
                  onChange={(e) => setSelectedAssessorId(e.target.value)}
                >
                  {assessors.length === 0 && (
                    <MenuItem value="" disabled>No assessors found</MenuItem>
                  )}
                  {assessors.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} — {a.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)} disabled={assigning}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignAssessor}
            disabled={assigning || !selectedAssessorId || assessorsLoading}
          >
            {assigning ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
