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
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  LinearProgress,
  Snackbar,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import SchoolIcon from '@mui/icons-material/School';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { useAuth } from '../context/AuthContext';
import { trainingService } from '../services/training.service';
import type { Training, TrainingCategory } from '../types';

const CATEGORY_KEYS: TrainingCategory[] = [
  'chainsaw',
  'basic',
  'assessment',
  'spiritualEmotional',
  'other',
];

const CATEGORY_LABELS: Record<TrainingCategory, string> = {
  chainsaw: 'Chainsaw',
  basic: 'Basic DRT',
  assessment: 'Assessment',
  spiritualEmotional: 'Spiritual & Emotional',
  other: 'Other',
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(ts: number): string {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
}

export const TrainingsLibrary: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('administrator') ?? false;

  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Upload dialog state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TrainingCategory>('basic');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      setLoading(true);
      const list = await trainingService.listTrainings();
      setTrainings(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load trainings');
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const map: Record<TrainingCategory, Training[]> = {
      chainsaw: [],
      basic: [],
      assessment: [],
      spiritualEmotional: [],
      other: [],
    };
    for (const t of trainings) {
      const cat = (CATEGORY_KEYS.includes(t.category) ? t.category : 'other') as TrainingCategory;
      map[cat].push(t);
    }
    return map;
  }, [trainings]);

  const resetUploadForm = () => {
    setTitle('');
    setDescription('');
    setCategory('basic');
    setFile(null);
    setUploadError('');
  };

  const handleCloseUpload = () => {
    if (uploading) return;
    setUploadOpen(false);
    resetUploadForm();
  };

  const handleUpload = async () => {
    if (!user) return;
    if (!title.trim()) {
      setUploadError('Title is required');
      return;
    }
    if (!file) {
      setUploadError('Please choose a PDF file');
      return;
    }
    setUploadError('');
    setUploading(true);
    try {
      const { fileUrl, filePath, fileSizeBytes } = await trainingService.uploadTrainingFile(
        file,
        user.id
      );
      await trainingService.createTraining({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        fileUrl,
        filePath,
        fileSizeBytes,
      });
      setUploadOpen(false);
      resetUploadForm();
      setSuccessMsg('Training uploaded');
      await loadTrainings();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload training');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await trainingService.deleteTraining(deleteTarget.id);
      setDeleteTarget(null);
      setSuccessMsg('Training deleted');
      await loadTrainings();
    } catch (err: any) {
      setError(err.message || 'Failed to delete training');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SchoolIcon color="primary" />
          <Typography variant="h4">Trainings</Typography>
        </Box>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUploadOpen(true)}
          >
            Upload Training
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : trainings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No trainings uploaded yet.</Typography>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {CATEGORY_KEYS.map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            return (
              <Paper key={cat} sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography variant="h6">{CATEGORY_LABELS[cat]}</Typography>
                  <Chip
                    label={items.length}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Divider sx={{ mb: 1 }} />
                <List disablePadding>
                  {items.map((t) => (
                    <ListItem
                      key={t.id}
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'grey.100',
                        '&:last-child': { borderBottom: 'none' },
                        px: 0,
                        gap: 1,
                        alignItems: 'flex-start',
                      }}
                      secondaryAction={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            href={t.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </Button>
                          {isAdmin && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteTarget(t)}
                              aria-label="Delete training"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      }
                    >
                      <PictureAsPdfIcon
                        color="action"
                        sx={{ mt: 0.5, mr: 1, flexShrink: 0 }}
                      />
                      <ListItemText
                        primary={t.title}
                        secondary={
                          <>
                            {t.description && (
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                {t.description}
                              </Typography>
                            )}
                            <Typography component="span" variant="caption" color="text.secondary">
                              {formatBytes(t.fileSizeBytes)} • Uploaded by {t.uploadedByName || 'Unknown'} on {formatDate(t.createdAt)}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onClose={handleCloseUpload} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Training</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            <TextField
              label="Title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value as TrainingCategory)}
              disabled={uploading}
              fullWidth
            >
              {CATEGORY_KEYS.map((k) => (
                <MenuItem key={k} value={k}>
                  {CATEGORY_LABELS[k]}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Button variant="outlined" component="label" disabled={uploading}>
                {file ? 'Change PDF' : 'Choose PDF'}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </Button>
              {file && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {file.name} ({formatBytes(file.size)})
                </Typography>
              )}
            </Box>
            {uploading && (
              <Box>
                <Typography variant="caption" color="text.secondary">Uploading...</Typography>
                <LinearProgress />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUpload} disabled={uploading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading || !title.trim() || !file}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Training?</DialogTitle>
        <DialogContent>
          <Typography>
            Delete <strong>{deleteTarget?.title}</strong>? This removes the PDF from storage and cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
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
