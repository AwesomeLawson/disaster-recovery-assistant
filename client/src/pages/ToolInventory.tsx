import React, { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Chip,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  Tooltip,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BuildIcon from '@mui/icons-material/Build';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { useAuth } from '../context/AuthContext';
import { baseCampService } from '../services/baseCamp.service';
import {
  toolService,
  type SuggestedToolItem,
  type CreateToolInput,
} from '../services/tool.service';
import type { BaseCamp, Tool, ToolCondition, ToolLending } from '../types';

const CONDITION_OPTIONS: { value: ToolCondition; label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }[] = [
  { value: 'new', label: 'New', color: 'success' },
  { value: 'good', label: 'Good', color: 'success' },
  { value: 'fair', label: 'Fair', color: 'info' },
  { value: 'needs_repair', label: 'Needs Repair', color: 'warning' },
  { value: 'broken', label: 'Broken', color: 'error' },
];

function conditionMeta(c: ToolCondition) {
  return CONDITION_OPTIONS.find((o) => o.value === c) || CONDITION_OPTIONS[1];
}

function formatDate(ts?: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
}

interface ToolFormState {
  name: string;
  description: string;
  category: string;
  condition: ToolCondition;
  quantity: number;
  file: File | null;
  existingPhotoUrl?: string;
  existingPhotoPath?: string;
}

const EMPTY_FORM: ToolFormState = {
  name: '',
  description: '',
  category: '',
  condition: 'good',
  quantity: 1,
  file: null,
};

export const ToolInventory: React.FC = () => {
  const { user } = useAuth();
  const canWrite =
    !!user && (user.roles.includes('administrator') || user.roles.includes('baseCampHost'));
  const isAdmin = !!user && user.roles.includes('administrator');

  const [baseCamps, setBaseCamps] = useState<BaseCamp[]>([]);
  const [selectedBaseCampId, setSelectedBaseCampId] = useState<string>('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Add/Edit dialog
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [toolDialogOpen, setToolDialogOpen] = useState(false);
  const [toolForm, setToolForm] = useState<ToolFormState>(EMPTY_FORM);
  const [toolSaving, setToolSaving] = useState(false);
  const [toolDialogError, setToolDialogError] = useState('');

  // Check-out dialog
  const [checkOutTool, setCheckOutTool] = useState<Tool | null>(null);
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutSaving, setCheckOutSaving] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');

  // Return dialog
  const [returnDialogTool, setReturnDialogTool] = useState<Tool | null>(null);
  const [activeLending, setActiveLending] = useState<ToolLending | null>(null);
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnError, setReturnError] = useState('');

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [deleting, setDeleting] = useState(false);

  // History drawer/dialog
  const [historyTool, setHistoryTool] = useState<Tool | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<ToolLending[]>([]);

  // AI scan dialog
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedToolItem[]>([]);
  const [aiSelections, setAiSelections] = useState<Record<number, boolean>>({});
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiAdding, setAiAdding] = useState(false);
  const [aiUploadedPhoto, setAiUploadedPhoto] = useState<{ photoUrl: string; photoPath: string } | null>(null);

  useEffect(() => {
    loadBaseCamps();
  }, [user?.id]);

  useEffect(() => {
    loadTools(selectedBaseCampId);
  }, [selectedBaseCampId]);

  const loadBaseCamps = async () => {
    if (!user) return;
    try {
      const all = await baseCampService.listBaseCamps();
      let visible = all;
      if (!isAdmin) {
        // Restrict base camp host to their assigned camps when present.
        const myCamps = user.baseCampIds || [];
        if (myCamps.length > 0) {
          visible = all.filter((bc) => myCamps.includes(bc.id));
        }
      }
      setBaseCamps(visible);
      if (visible.length > 0 && !selectedBaseCampId) {
        setSelectedBaseCampId(visible[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load base camps');
    }
  };

  const loadTools = async (baseCampId: string) => {
    try {
      setLoading(true);
      const list = await toolService.listTools(baseCampId || undefined);
      setTools(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load tools');
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }, [tools, search]);

  const openCreateDialog = () => {
    setEditingTool(null);
    setToolForm(EMPTY_FORM);
    setToolDialogError('');
    setToolDialogOpen(true);
  };

  const openEditDialog = (tool: Tool) => {
    setEditingTool(tool);
    setToolForm({
      name: tool.name,
      description: tool.description || '',
      category: tool.category || '',
      condition: tool.condition,
      quantity: tool.quantity,
      file: null,
      existingPhotoUrl: tool.photoUrl,
      existingPhotoPath: tool.photoPath,
    });
    setToolDialogError('');
    setToolDialogOpen(true);
  };

  const closeToolDialog = () => {
    if (toolSaving) return;
    setToolDialogOpen(false);
  };

  const handleSaveTool = async () => {
    if (!selectedBaseCampId) {
      setToolDialogError('Pick a base camp first');
      return;
    }
    if (!toolForm.name.trim()) {
      setToolDialogError('Name is required');
      return;
    }
    setToolDialogError('');
    setToolSaving(true);
    try {
      let photoUrl = toolForm.existingPhotoUrl;
      let photoPath = toolForm.existingPhotoPath;
      if (toolForm.file) {
        const uploaded = await toolService.uploadToolPhoto(toolForm.file, selectedBaseCampId);
        photoUrl = uploaded.photoUrl;
        photoPath = uploaded.photoPath;
      }
      if (editingTool) {
        await toolService.updateTool(editingTool.id, {
          name: toolForm.name.trim(),
          description: toolForm.description.trim() || undefined,
          category: toolForm.category.trim() || undefined,
          condition: toolForm.condition,
          quantity: toolForm.quantity,
          photoUrl,
          photoPath,
        });
        setSuccessMsg('Tool updated');
      } else {
        const input: CreateToolInput = {
          baseCampId: selectedBaseCampId,
          name: toolForm.name.trim(),
          description: toolForm.description.trim() || undefined,
          category: toolForm.category.trim() || undefined,
          condition: toolForm.condition,
          quantity: toolForm.quantity,
          photoUrl,
          photoPath,
        };
        await toolService.createTool(input);
        setSuccessMsg('Tool added');
      }
      setToolDialogOpen(false);
      await loadTools(selectedBaseCampId);
    } catch (err: any) {
      setToolDialogError(err.message || 'Failed to save tool');
    } finally {
      setToolSaving(false);
    }
  };

  const handleDeleteTool = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await toolService.deleteTool(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMsg('Tool deleted');
      await loadTools(selectedBaseCampId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete tool');
    } finally {
      setDeleting(false);
    }
  };

  const openCheckOutDialog = (tool: Tool) => {
    setCheckOutTool(tool);
    setBorrowerName('');
    setBorrowerPhone('');
    setExpectedReturnDate('');
    setCheckOutNotes('');
    setCheckOutError('');
  };

  const handleCheckOut = async () => {
    if (!checkOutTool) return;
    if (!borrowerName.trim()) {
      setCheckOutError('Borrower name is required');
      return;
    }
    setCheckOutError('');
    setCheckOutSaving(true);
    try {
      const expectedTs = expectedReturnDate ? new Date(expectedReturnDate).getTime() : undefined;
      await toolService.checkOutTool({
        toolId: checkOutTool.id,
        borrowerName: borrowerName.trim(),
        borrowerPhone: borrowerPhone.trim() || undefined,
        expectedReturnAt: expectedTs,
        notes: checkOutNotes.trim() || undefined,
      });
      setCheckOutTool(null);
      setSuccessMsg('Tool checked out');
      await loadTools(selectedBaseCampId);
    } catch (err: any) {
      setCheckOutError(err.message || 'Failed to check out tool');
    } finally {
      setCheckOutSaving(false);
    }
  };

  const openReturnDialog = async (tool: Tool) => {
    setReturnDialogTool(tool);
    setReturnNotes('');
    setReturnError('');
    setActiveLending(null);
    if (tool.currentLendingId) {
      try {
        const lendings = await toolService.listToolLendings({ toolId: tool.id, activeOnly: true });
        setActiveLending(lendings[0] || null);
      } catch {
        // best-effort
      }
    }
  };

  const handleReturn = async () => {
    if (!returnDialogTool || !returnDialogTool.currentLendingId) return;
    setReturnError('');
    setReturnSaving(true);
    try {
      await toolService.returnTool(returnDialogTool.currentLendingId, returnNotes.trim() || undefined);
      setReturnDialogTool(null);
      setSuccessMsg('Tool marked returned');
      await loadTools(selectedBaseCampId);
    } catch (err: any) {
      setReturnError(err.message || 'Failed to mark returned');
    } finally {
      setReturnSaving(false);
    }
  };

  const openHistory = async (tool: Tool) => {
    setHistoryTool(tool);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      const list = await toolService.listToolLendings({ toolId: tool.id });
      setHistoryItems(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  // ----- AI scan -----
  const openAiDialog = () => {
    setAiDialogOpen(true);
    setAiFile(null);
    setAiSuggestions([]);
    setAiSelections({});
    setAiUnavailable(false);
    setAiError('');
    setAiUploadedPhoto(null);
  };

  const closeAiDialog = async () => {
    if (aiAnalyzing || aiAdding) return;
    // If we uploaded a photo but didn't create any tools that reference it, clean up.
    const photoCommittedToTool = aiSuggestions.length === 0 ? false : Object.values(aiSelections).some(Boolean);
    if (aiUploadedPhoto && !photoCommittedToTool) {
      await toolService.deleteToolPhoto(aiUploadedPhoto.photoPath);
    }
    setAiDialogOpen(false);
  };

  const handleAnalyzeAi = async () => {
    if (!aiFile || !selectedBaseCampId) return;
    setAiError('');
    setAiAnalyzing(true);
    try {
      const uploaded = await toolService.uploadToolPhoto(aiFile, selectedBaseCampId);
      setAiUploadedPhoto(uploaded);
      const result = await toolService.suggestToolsFromPhoto(uploaded.photoUrl);
      if (!result.available) {
        setAiUnavailable(true);
        setAiSuggestions([]);
        setAiError('AI suggestions are not configured for this environment.');
        return;
      }
      if (result.error) {
        setAiError(result.error);
      }
      setAiSuggestions(result.items || []);
      const sel: Record<number, boolean> = {};
      (result.items || []).forEach((_, i) => (sel[i] = true));
      setAiSelections(sel);
    } catch (err: any) {
      setAiError(err.message || 'Failed to analyze photo');
    } finally {
      setAiAnalyzing(false);
    }
  };

  const updateSuggestion = (i: number, patch: Partial<SuggestedToolItem>) => {
    setAiSuggestions((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const handleAddAiSelected = async () => {
    if (!selectedBaseCampId) return;
    const toAdd = aiSuggestions
      .map((s, i) => ({ s, i }))
      .filter(({ i }) => aiSelections[i])
      .map(({ s }) => s);
    if (toAdd.length === 0) {
      setAiError('Select at least one item to add');
      return;
    }
    setAiAdding(true);
    setAiError('');
    try {
      for (let idx = 0; idx < toAdd.length; idx++) {
        const item = toAdd[idx];
        // Attach the uploaded photo only to the first created tool to avoid
        // multiple tool docs all referencing the same storage object (which
        // would cause the deleteTool cleanup of one to break the others).
        const attachPhoto = idx === 0 && aiUploadedPhoto;
        await toolService.createTool({
          baseCampId: selectedBaseCampId,
          name: (item.name || '').trim() || 'Tool',
          category: item.category?.trim() || undefined,
          condition: 'good',
          quantity: item.quantity && item.quantity > 0 ? Math.floor(item.quantity) : 1,
          photoUrl: attachPhoto ? aiUploadedPhoto!.photoUrl : undefined,
          photoPath: attachPhoto ? aiUploadedPhoto!.photoPath : undefined,
        });
      }
      setSuccessMsg(`Added ${toAdd.length} tool${toAdd.length === 1 ? '' : 's'}`);
      setAiDialogOpen(false);
      await loadTools(selectedBaseCampId);
    } catch (err: any) {
      setAiError(err.message || 'Failed to add tools');
    } finally {
      setAiAdding(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon color="primary" />
          <Typography variant="h4">Tool Inventory</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {canWrite && (
            <Tooltip title="Use AI to detect tools from a photo">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={openAiDialog}
                  disabled={!selectedBaseCampId}
                >
                  Scan with AI
                </Button>
              </span>
            </Tooltip>
          )}
          {canWrite && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              disabled={!selectedBaseCampId}
            >
              Add Tool
            </Button>
          )}
        </Stack>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            label="Base Camp"
            value={selectedBaseCampId}
            onChange={(e) => setSelectedBaseCampId(e.target.value)}
            sx={{ minWidth: 240 }}
            size="small"
          >
            {baseCamps.length === 0 ? (
              <MenuItem value="" disabled>
                No base camps available
              </MenuItem>
            ) : (
              baseCamps.map((bc) => (
                <MenuItem key={bc.id} value={bc.id}>
                  {bc.name}
                </MenuItem>
              ))
            )}
          </TextField>
          <TextField
            label="Search tools"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, minWidth: 240 }}
          />
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : filteredTools.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {tools.length === 0
              ? canWrite
                ? 'No tools yet. Add your first one above.'
                : 'No tools recorded for this base camp.'
              : 'No tools match your search.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredTools.map((tool) => {
            const cond = conditionMeta(tool.condition);
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={tool.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {tool.photoUrl && (
                    <CardMedia
                      component="img"
                      image={tool.photoUrl}
                      alt={tool.name}
                      sx={{ height: 160, objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
                      <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>{tool.name}</Typography>
                      {tool.quantity > 1 && (
                        <Chip label={`Qty ${tool.quantity}`} size="small" variant="outlined" />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', rowGap: 1 }}>
                      {tool.category && <Chip label={tool.category} size="small" />}
                      <Chip label={cond.label} size="small" color={cond.color === 'default' ? undefined : cond.color} />
                      {tool.isLentOut && (
                        <Chip
                          label="Lent Out"
                          size="small"
                          color="warning"
                          icon={<AssignmentIndIcon />}
                          onClick={canWrite ? () => openReturnDialog(tool) : undefined}
                        />
                      )}
                    </Stack>
                    {tool.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {tool.description}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
                    {canWrite && !tool.isLentOut && (
                      <Button size="small" variant="contained" onClick={() => openCheckOutDialog(tool)}>
                        Check Out
                      </Button>
                    )}
                    {canWrite && tool.isLentOut && (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={<AssignmentReturnIcon />}
                        onClick={() => openReturnDialog(tool)}
                      >
                        Mark Returned
                      </Button>
                    )}
                    <Button size="small" startIcon={<HistoryIcon />} onClick={() => openHistory(tool)}>
                      History
                    </Button>
                    <Box sx={{ flexGrow: 1 }} />
                    {canWrite && (
                      <>
                        <IconButton size="small" onClick={() => openEditDialog(tool)} aria-label="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(tool)}
                          aria-label="Delete"
                          disabled={tool.isLentOut}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add/Edit Tool Dialog */}
      <Dialog open={toolDialogOpen} onClose={closeToolDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingTool ? 'Edit Tool' : 'Add Tool'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {toolDialogError && <Alert severity="error">{toolDialogError}</Alert>}
            <TextField
              label="Name"
              required
              value={toolForm.name}
              onChange={(e) => setToolForm((f) => ({ ...f, name: e.target.value }))}
              disabled={toolSaving}
              fullWidth
            />
            <TextField
              label="Category"
              value={toolForm.category}
              onChange={(e) => setToolForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="chainsaw, ladder, hand tool, etc."
              disabled={toolSaving}
              fullWidth
            />
            <TextField
              label="Description"
              value={toolForm.description}
              onChange={(e) => setToolForm((f) => ({ ...f, description: e.target.value }))}
              disabled={toolSaving}
              fullWidth
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="Condition"
                value={toolForm.condition}
                onChange={(e) => setToolForm((f) => ({ ...f, condition: e.target.value as ToolCondition }))}
                disabled={toolSaving}
                sx={{ flexGrow: 1 }}
              >
                {CONDITION_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Quantity"
                type="number"
                inputProps={{ min: 1, step: 1 }}
                value={toolForm.quantity}
                onChange={(e) => setToolForm((f) => ({ ...f, quantity: Math.max(1, Number(e.target.value) || 1) }))}
                disabled={toolSaving}
                sx={{ width: 120 }}
              />
            </Stack>
            <Box>
              <Button variant="outlined" component="label" disabled={toolSaving}>
                {toolForm.file ? 'Change Photo' : toolForm.existingPhotoUrl ? 'Replace Photo' : 'Add Photo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setToolForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                />
              </Button>
              {toolForm.file && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {toolForm.file.name}
                </Typography>
              )}
              {!toolForm.file && toolForm.existingPhotoUrl && (
                <Box sx={{ mt: 1 }}>
                  <img
                    src={toolForm.existingPhotoUrl}
                    alt="current"
                    style={{ maxWidth: 160, maxHeight: 120, borderRadius: 4 }}
                  />
                </Box>
              )}
            </Box>
            {toolSaving && (
              <Box>
                <Typography variant="caption" color="text.secondary">Saving...</Typography>
                <LinearProgress />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeToolDialog} disabled={toolSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveTool} disabled={toolSaving || !toolForm.name.trim()}>
            {toolSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={!!checkOutTool} onClose={() => !checkOutSaving && setCheckOutTool(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Check Out: {checkOutTool?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {checkOutError && <Alert severity="error">{checkOutError}</Alert>}
            <TextField
              label="Borrower Name"
              required
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              disabled={checkOutSaving}
              fullWidth
            />
            <TextField
              label="Borrower Phone"
              value={borrowerPhone}
              onChange={(e) => setBorrowerPhone(e.target.value)}
              disabled={checkOutSaving}
              fullWidth
            />
            <TextField
              label="Expected Return Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              disabled={checkOutSaving}
              fullWidth
            />
            <TextField
              label="Notes"
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              disabled={checkOutSaving}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOutTool(null)} disabled={checkOutSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCheckOut}
            disabled={checkOutSaving || !borrowerName.trim()}
          >
            {checkOutSaving ? 'Saving...' : 'Check Out'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={!!returnDialogTool} onClose={() => !returnSaving && setReturnDialogTool(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Mark Returned: {returnDialogTool?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {returnError && <Alert severity="error">{returnError}</Alert>}
            {activeLending ? (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2">
                  <strong>Borrower:</strong> {activeLending.borrowerName}
                  {activeLending.borrowerPhone ? ` (${activeLending.borrowerPhone})` : ''}
                </Typography>
                <Typography variant="body2">
                  <strong>Checked out:</strong> {formatDate(activeLending.checkedOutAt)} by {activeLending.checkedOutByName}
                </Typography>
                {activeLending.expectedReturnAt && (
                  <Typography variant="body2">
                    <strong>Expected return:</strong> {formatDate(activeLending.expectedReturnAt)}
                  </Typography>
                )}
                {activeLending.notes && (
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    <strong>Notes:</strong> {activeLending.notes}
                  </Typography>
                )}
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Loading borrower info...
              </Typography>
            )}
            <TextField
              label="Return notes (optional)"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              disabled={returnSaving}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogTool(null)} disabled={returnSaving}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleReturn}
            disabled={returnSaving || !returnDialogTool?.currentLendingId}
          >
            {returnSaving ? 'Saving...' : 'Confirm Return'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Tool?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.name}</strong>? This removes the tool and its photo from storage and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteTool} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyTool} onClose={() => setHistoryTool(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Lending History: {historyTool?.name}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : historyItems.length === 0 ? (
            <Typography color="text.secondary">No lending history yet.</Typography>
          ) : (
            <List dense>
              {historyItems.map((l, idx) => (
                <React.Fragment key={l.id}>
                  {idx > 0 && <Divider />}
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <>
                          <strong>{l.borrowerName}</strong>
                          {l.borrowerPhone ? ` (${l.borrowerPhone})` : ''}
                          {!l.returnedAt && (
                            <Chip size="small" label="Active" color="warning" sx={{ ml: 1 }} />
                          )}
                        </>
                      }
                      secondary={
                        <>
                          <span>
                            Out: {formatDate(l.checkedOutAt)} by {l.checkedOutByName}
                          </span>
                          {l.expectedReturnAt && <span> • Expected: {formatDate(l.expectedReturnAt)}</span>}
                          {l.returnedAt && (
                            <span>
                              {' '}
                              • Returned: {formatDate(l.returnedAt)}
                              {l.returnedToName ? ` (confirmed by ${l.returnedToName})` : ''}
                            </span>
                          )}
                          {l.notes && (
                            <Typography component="span" variant="body2" sx={{ display: 'block', whiteSpace: 'pre-wrap' }}>
                              {l.notes}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryTool(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* AI Scan Dialog */}
      <Dialog open={aiDialogOpen} onClose={closeAiDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Scan with AI</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {aiUnavailable && (
              <Alert severity="info">
                AI suggestions are not configured. Add tools manually below or ask an administrator to set the
                ANTHROPIC_API_KEY secret.
              </Alert>
            )}
            {aiError && !aiUnavailable && <Alert severity="warning">{aiError}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Upload a photo of a pile of tools. AI will list what it sees so you can review and add them in bulk.
            </Typography>
            <Box>
              <Button variant="outlined" component="label" disabled={aiAnalyzing || aiAdding}>
                {aiFile ? 'Change Photo' : 'Choose Photo'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    setAiFile(e.target.files?.[0] || null);
                    setAiSuggestions([]);
                    setAiSelections({});
                  }}
                />
              </Button>
              {aiFile && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {aiFile.name}
                </Typography>
              )}
            </Box>
            {aiFile && aiSuggestions.length === 0 && !aiAnalyzing && (
              <Button
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleAnalyzeAi}
                disabled={!aiFile || !selectedBaseCampId}
              >
                Analyze Photo
              </Button>
            )}
            {aiAnalyzing && (
              <Box>
                <Typography variant="caption" color="text.secondary">Analyzing photo...</Typography>
                <LinearProgress />
              </Box>
            )}
            {aiSuggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Detected items — uncheck any you don't want, edit fields as needed:
                </Typography>
                <Stack spacing={1}>
                  {aiSuggestions.map((s, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Checkbox
                          checked={!!aiSelections[i]}
                          onChange={(e) => setAiSelections((prev) => ({ ...prev, [i]: e.target.checked }))}
                        />
                        <TextField
                          label="Name"
                          size="small"
                          value={s.name}
                          onChange={(e) => updateSuggestion(i, { name: e.target.value })}
                          sx={{ flexGrow: 1 }}
                        />
                        <TextField
                          label="Category"
                          size="small"
                          value={s.category || ''}
                          onChange={(e) => updateSuggestion(i, { category: e.target.value })}
                          sx={{ width: 140 }}
                        />
                        <TextField
                          label="Qty"
                          type="number"
                          size="small"
                          inputProps={{ min: 1, step: 1 }}
                          value={s.quantity ?? 1}
                          onChange={(e) =>
                            updateSuggestion(i, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                          sx={{ width: 80 }}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
            {aiAdding && (
              <Box>
                <Typography variant="caption" color="text.secondary">Adding tools...</Typography>
                <LinearProgress />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAiDialog} disabled={aiAnalyzing || aiAdding}>Cancel</Button>
          {aiSuggestions.length > 0 && (
            <Button
              variant="contained"
              onClick={handleAddAiSelected}
              disabled={aiAdding || Object.values(aiSelections).every((v) => !v)}
            >
              {aiAdding ? 'Adding...' : 'Add Selected'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMsg}
        autoHideDuration={3500}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};
