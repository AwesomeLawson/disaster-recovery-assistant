import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Chip,
  Divider,
  Stack,
  CircularProgress,
} from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { appConfigService, type AnthropicKeyStatus } from '../services/appConfig.service';

export const AdminSettings: React.FC = () => {
  const [status, setStatus] = useState<AnthropicKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState<string>('');

  const loadStatus = async () => {
    try {
      setLoading(true);
      const result = await appConfigService.getAnthropicApiKeyStatus();
      setStatus(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setTestResult('');
    if (!apiKey.trim()) {
      setError('Enter a key first');
      return;
    }
    try {
      setSaving(true);
      await appConfigService.setAnthropicApiKey(apiKey.trim());
      setApiKey('');
      setSuccess('API key saved.');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setError('');
    setSuccess('');
    setTestResult('');
    if (!confirm('Remove the stored Anthropic API key? AI features will stop working until a new key is set.')) {
      return;
    }
    try {
      setSaving(true);
      await appConfigService.clearAnthropicApiKey();
      setSuccess('API key cleared.');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to clear key');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setError('');
    setSuccess('');
    setTestResult('');
    try {
      setTesting(true);
      const result = await appConfigService.testAnthropicApiKey();
      if (result.ok) {
        setTestResult(`✓ Test call succeeded (source: ${result.source}). Sample response: "${result.sampleResponse}"`);
      } else {
        setError(`Test failed (source: ${result.source}): ${result.error}`);
      }
    } catch (err: any) {
      setError(err.message || 'Test call failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Admin Settings</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configuration for app-wide settings and integrations.
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <KeyIcon color="primary" />
          <Typography variant="h6">Anthropic API Key</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Used by the AI help chat and the AI tool-photo suggestion feature.
          Stored in Firestore (admin-only access via Cloud Functions).
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
        {testResult && <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />} onClose={() => setTestResult('')}>{testResult}</Alert>}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Status</Typography>
          {loading ? (
            <CircularProgress size={20} />
          ) : status?.configured ? (
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label="Configured" color="success" size="small" />
              {status.updatedAt && (
                <Typography variant="body2" color="text.secondary">
                  Last updated {new Date(status.updatedAt).toLocaleString()}
                  {status.updatedByName ? ` by ${status.updatedByName}` : ''}
                </Typography>
              )}
            </Stack>
          ) : (
            <Chip label="Not configured" color="warning" size="small" />
          )}
        </Box>

        <TextField
          fullWidth
          type="password"
          label="New API key"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          helperText="Will overwrite any existing in-app value. Submit empty to keep current."
          sx={{ mb: 2 }}
        />

        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Button variant="contained" onClick={handleSave} disabled={saving || !apiKey.trim()}>
            {saving ? 'Saving...' : 'Save key'}
          </Button>
          <Button variant="outlined" onClick={handleTest} disabled={testing || loading || !status?.configured}>
            {testing ? 'Testing...' : 'Test connection'}
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {status?.configured && (
            <Button color="error" variant="outlined" onClick={handleClear} disabled={saving}>
              Clear key
            </Button>
          )}
        </Stack>
      </Paper>
    </Container>
  );
};
