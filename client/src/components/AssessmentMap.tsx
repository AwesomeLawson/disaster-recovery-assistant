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
import type { Assessment } from '../types';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#f9a825',
  low: '#4caf50',
};

interface Props {
  assessments: Assessment[];
}

const MapPins: React.FC<
  Props & { selected: Assessment | null; onSelect: (a: Assessment | null) => void }
> = ({ assessments, selected, onSelect }) => {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const navigate = useNavigate();

  const mapped = assessments.filter((a) => a.latitude != null && a.longitude != null);

  useEffect(() => {
    if (!map || !coreLib || mapped.length === 0) return;
    if (mapped.length === 1) {
      map.setCenter({ lat: mapped[0].latitude!, lng: mapped[0].longitude! });
      map.setZoom(13);
      return;
    }
    const bounds = new coreLib.LatLngBounds();
    mapped.forEach((a) => bounds.extend({ lat: a.latitude!, lng: a.longitude! }));
    map.fitBounds(bounds, 60);
  }, [map, coreLib]);

  return (
    <>
      {mapped.map((a) => (
        <AdvancedMarker
          key={a.id}
          position={{ lat: a.latitude!, lng: a.longitude! }}
          onClick={() => onSelect(selected?.id === a.id ? null : a)}
        >
          <Pin
            background={SEVERITY_COLORS[a.severity] ?? '#3464B9'}
            borderColor="#ffffff"
            glyphColor="#ffffff"
          />
        </AdvancedMarker>
      ))}

      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude!, lng: selected.longitude! }}
          onCloseClick={() => onSelect(null)}
        >
          <div style={{ maxWidth: 270, fontFamily: 'Segoe UI, sans-serif', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>{selected.placeName}</div>
            <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>{selected.address}</div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
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
                    style={{
                      width: 78,
                      height: 58,
                      objectFit: 'cover',
                      borderRadius: 4,
                      display: 'block',
                    }}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => navigate(`/assessments/${selected.id}`)}
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
    </>
  );
};

export const AssessmentMap: React.FC<Props> = ({ assessments }) => {
  const [selected, setSelected] = useState<Assessment | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const mapped = assessments.filter((a) => a.latitude != null && a.longitude != null);

  if (!apiKey) {
    return (
      <Alert severity="warning">
        Google Maps API key not configured. Set VITE_GOOGLE_MAPS_API_KEY in your environment.
      </Alert>
    );
  }

  const defaultCenter =
    mapped.length > 0
      ? { lat: mapped[0].latitude!, lng: mapped[0].longitude! }
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
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {mapped.length} of {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} plotted
        </Typography>
      </Box>

      {mapped.length === 0 ? (
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
            No assessments with GPS coordinates for this event
          </Typography>
        </Box>
      ) : (
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={defaultCenter}
            defaultZoom={8}
            mapId="DEMO_MAP_ID"
            style={{ width: '100%', height: 500, borderRadius: 4 }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapPins assessments={assessments} selected={selected} onSelect={setSelected} />
          </Map>
        </APIProvider>
      )}
    </Box>
  );
};
