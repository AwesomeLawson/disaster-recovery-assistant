import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { workOrderService } from '../services/workOrder.service';
import { useAuth } from '../context/AuthContext';
import type { WorkOrder, WorkOrderStatus } from '../types';

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

export const WorkOrderList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [filteredWorkOrders, setFilteredWorkOrders] = useState<WorkOrder[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('');

  useEffect(() => {
    loadWorkOrders();
  }, [searchParams]);

  const loadWorkOrders = async () => {
    try {
      setLoading(true);
      const flagged = searchParams.get('flagged') === 'true';
      const data = await workOrderService.listWorkOrders({
        flaggedForReview: flagged || undefined,
      });
      setWorkOrders(data);
      setFilteredWorkOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = workOrders;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (a) =>
          a.survivorName?.toLowerCase().includes(term) ||
          a.address?.toLowerCase().includes(term) ||
          a.placeName?.toLowerCase().includes(term) ||
          a.workOrderNumber?.toLowerCase().includes(term)
      );
    }
    if (statusFilter) {
      result = result.filter((a) => (a.status ?? 'intake') === statusFilter);
    }
    setFilteredWorkOrders(result);
  }, [searchTerm, statusFilter, workOrders]);

  const canOpenWorkOrder =
    user?.roles.includes('administrator') ||
    user?.roles.includes('fieldCoordinator') ||
    user?.roles.includes('assessor');

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Work Orders</Typography>
        {canOpenWorkOrder && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/work-orders/create')}>
            Open New Work Order
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search by name, address, or work order #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | '')}
            >
              <MenuItem value=""><em>All Statuses</em></MenuItem>
              {(Object.keys(STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
                <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {filteredWorkOrders.length === 0 ? (
          <Typography color="text.secondary">
            {searchTerm || statusFilter ? 'No work orders match your filters' : 'No work orders found'}
          </Typography>
        ) : (
          <List disablePadding>
            {filteredWorkOrders.map((workOrder) => {
              const status = (workOrder.status ?? 'intake') as WorkOrderStatus;
              return (
                <ListItem
                  key={workOrder.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                  onClick={() => navigate(`/work-orders/${workOrder.id}`)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body1" fontWeight={600}>{workOrder.survivorName}</Typography>
                        {workOrder.workOrderNumber && (
                          <Typography variant="caption" color="text.secondary">#{workOrder.workOrderNumber}</Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="body2" component="div" color="text.secondary">
                          {workOrder.address}
                        </Typography>
                        <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          <Chip label={STATUS_LABELS[status]} size="small" color={STATUS_COLORS[status]} />
                          {workOrder.severity && (
                            <Chip
                              label={workOrder.severity.toUpperCase()}
                              size="small"
                              color={
                                workOrder.severity === 'critical' ? 'error' :
                                workOrder.severity === 'high' ? 'warning' :
                                workOrder.severity === 'medium' ? 'info' : 'default'
                              }
                            />
                          )}
                          {workOrder.flaggedForReview && (
                            <Chip label="Flagged" size="small" color="warning" />
                          )}
                          {(workOrder.photoUrls?.length ?? 0) > 0 && (
                            <Chip label={`${workOrder.photoUrls.length} photos`} size="small" variant="outlined" />
                          )}
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
};
