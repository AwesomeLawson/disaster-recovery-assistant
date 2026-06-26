import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Box, Typography, Alert } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import type { WorkOrder, BaseCamp } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#4caf50',
};

const BASE_CAMP_COLOR = '#1565c0';

interface Props {
  workOrders: WorkOrder[];
  baseCamps?: BaseCamp[];
}

interface MapPinsProps extends Props {
  selected: WorkOrder | null;
  onSelect: (a: WorkOrder | null) => void;
  selectedBaseCamp: BaseCamp | null;
  onSelectBaseCamp: (c: BaseCamp | null) => void;
}

const MapPins: React.FC<MapPinsProps> = ({
  workOrders,
  baseCamps = [],
  selected,
  onSelect,
  selectedBaseCamp,
  onSelectBaseCamp,
}) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const navigate = useNavigate();

  const mappedWorkOrders = workOrders.filter((a) => a.latitude != null && a.longitude != null);
  const mappedBaseCamps = baseCamps.filter((c) => c.latitude != null && c.longitude != null);

  useEffect(() => {
    if (!map || !coreLib) return;
    const allPoints = [
      ...mappedWorkOrders.map((a) => ({ lat: a.latitude!, lng: a.longitude! })),
      ...mappedBaseCamps.map((c) => ({ lat: c.latitude!, lng: c.longitude! })),
    ];
    if (allPoints.length === 0) return;
    if (allPoints.length === 1) {
      map.setCenter(allPoints[0]);
      map.setZoom(13);
      return;
    }
    const bounds = new coreLib.LatLngBounds();
    allPoints.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  }, [map, coreLib]);

  return (
    <>
      {mappedWorkOrders.map((a) => (
        <AdvancedMarker
          key={a.id}
          position={{ lat: a.latitude!, lng: a.longitude! }}
          onClick={() => {
            onSelectBaseCamp(null);
            onSelect(selected?.id === a.id ? null : a);
          }}
        >
          <Pin
            background={SEVERITY_COLORS[a.severity ?? 'low'] ?? '#3464B9'}
            borderColor="#ffffff"
            glyphColor="#ffffff"
          />
        </AdvancedMarker>
      ))}

      {mappedBaseCamps.map((c) => (
        <AdvancedMarker
          key={c.id}
          position={{ lat: c.latitude!, lng: c.longitude! }}
          onClick={() => {
            onSelect(null);
            onSelectBaseCamp(selectedBaseCamp?.id === c.id ? null : c);
          }}
        >
          <div
            style={{
              background: BASE_CAMP_COLOR,
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
            }}
          >
            <LocationCityIcon style={{ color: 'white', fontSize: 18 }} />
          </div>
        </AdvancedMarker>
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude!, lng: selected.longitude! }}
          onCloseClick={() => onSelect(null)}
        >
          <div style={{ maxWidth: 270, fontFamily: 'Segoe UI, sans-serif', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
              {selected.survivorName}{selected.placeName ? ` — ${selected.placeName}` : ''}
            </div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{selected.address}</div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {selected.severity && (
                <span
                  style={{
                    background: SEVERITY_COLORS[selected.severity] ?? '#888',
                    color: '#fff',
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {selected.severity}
                </span>
              )}
              {selected.affectedPeople != null && (
                <span
                  style={{
                    border: '1px solid #ccc',
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: 12,
                    color: '#555',
                  }}
                >
                  {selected.affectedPeople} affected
                </span>
              )}
            </div>

            {selected.damages && (
              <div style={{ fontSize: 13, marginBottom: 8, color: '#333' }}>
                <strong>Damages:</strong>{' '}
                {selected.damages.length > 120
                  ? selected.damages.slice(0, 120) + '…'
                  : selected.damages}
              </div>
            )}

            {(selected.photoUrls?.length ?? 0) > 0 && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
                {selected.photoUrls.slice(0, 3).map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Photo ${i + 1}`}
                    style={{ width: 78, height: 58, objectFit: 'cover', borderRadius: 4 }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => navigate(`/work-orders/${selected.id}`)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: '#3464B9',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              View Details
            </button>
          </div>
        </InfoWindow>
      )}

      {selectedBaseCamp && (
        <InfoWindow
          position={{ lat: selectedBaseCamp.latitude!, lng: selectedBaseCamp.longitude! }}
          onCloseClick={() => onSelectBaseCamp(null)}
        >
          <div style={{ maxWidth: 240, fontFamily: 'Segoe UI, sans-serif', lineHeight: 1.4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div
                style={{
                  background: BASE_CAMP_COLOR,
                  borderRadius: '50%',
                  width: 22,
                  height: 22,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>⊞</span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedBaseCamp.name}</div>
            </div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{selectedBaseCamp.address}</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              {selectedBaseCamp.leadUserIds.length} lead{selectedBaseCamp.leadUserIds.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={() => navigate(`/base-camps/${selectedBaseCamp.id}`)}
              style={{
                width: '100%',
                padding: '7px 12px',
                background: BASE_CAMP_COLOR,
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              View Base Camp
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const WorkOrderMap: React.FC<Props> = ({ workOrders, baseCamps = [] }) => {
  const [selected, setSelected] = useState<WorkOrder | null>(null);
  const [selectedBaseCamp, setSelectedBaseCamp] = useState<BaseCamp | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const mappedWorkOrders = workOrders.filter((a) => a.latitude != null && a.longitude != null);
  const mappedBaseCamps = baseCamps.filter((c) => c.latitude != null && c.longitude != null);
  const hasAnything = mappedWorkOrders.length > 0 || mappedBaseCamps.length > 0;

  if (!apiKey) {
    return (
      <Alert severity="warning">
        Google Maps API key not configured. Set VITE_GOOGLE_MAPS_API_KEY in your environment.
      </Alert>
    );
  }

  const firstPoint =
    mappedWorkOrders[0]
      ? { lat: mappedWorkOrders[0].latitude!, lng: mappedWorkOrders[0].longitude! }
      : mappedBaseCamps[0]
      ? { lat: mappedBaseCamps[0].latitude!, lng: mappedBaseCamps[0].longitude! }
      : { lat: 36.1627, lng: -86.7816 };

  return (
    <Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: color,
                border: '2px solid white',
                boxShadow: '0 0 0 1px #ccc',
              }}
            />
            <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
              {label}
            </Typography>
          </Box>
        ))}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              bgcolor: BASE_CAMP_COLOR,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LocationCityIcon sx={{ color: 'white', fontSize: 12 }} />
          </Box>
          <Typography variant="caption">Base Camp</Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {mappedWorkOrders.length}/{workOrders.length} work orders
          {baseCamps.length > 0 ? `, ${mappedBaseCamps.length}/${baseCamps.length} base camps` : ''} plotted
        </Typography>
      </Box>

      {!hasAnything ? (
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.300',
          }}
        >
          <Typography color="text.secondary">
            No work orders or base camps with GPS coordinates for this event
          </Typography>
        </Box>
      ) : (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={firstPoint}
            defaultZoom={8}
            mapId="DEMO_MAP_ID"
            style={{ width: '100%', height: 500, borderRadius: 4 }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapPins
              workOrders={workOrders}
              baseCamps={baseCamps}
              selected={selected}
              onSelect={setSelected}
              selectedBaseCamp={selectedBaseCamp}
              onSelectBaseCamp={setSelectedBaseCamp}
            />
          </Map>
        </APIProvider>
      )}
    </Box>
  );
};
