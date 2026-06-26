import React, { useRef, useEffect } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { TextField, Box, Typography, GlobalStyles } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export interface PlaceResult {
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  coordinates?: { latitude: number; longitude: number } | null;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

// Ensure the Places dropdown renders above MUI components
const PacStyles = () => (
  <GlobalStyles styles={{ '.pac-container': { zIndex: 99999 } }} />
);

const AutocompleteField: React.FC<Props> = ({
  value,
  onChange,
  onPlaceSelect,
  coordinates,
  required,
  error,
  helperText,
}) => {
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  onPlaceSelectRef.current = onPlaceSelect;

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address', 'geometry'],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace();
      if (place.formatted_address && place.geometry?.location) {
        onPlaceSelectRef.current({
          address: place.formatted_address,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [placesLib]);

  const hasCoords = coordinates != null;

  return (
    <>
      <PacStyles />
      <TextField
        required={required}
        fullWidth
        label="Address"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        inputRef={inputRef}
        error={error}
        autoComplete="off"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOnIcon
                fontSize="small"
                color={hasCoords ? 'success' : 'action'}
              />
            </InputAdornment>
          ),
        }}
        helperText={
          hasCoords ? undefined : (helperText ?? 'Start typing to search for an address')
        }
      />
      {hasCoords && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, ml: 0.5 }}>
          <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
          <Typography variant="caption" color="success.main">
            GPS coordinates captured ({coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)})
          </Typography>
        </Box>
      )}
    </>
  );
};

export const AddressAutocomplete: React.FC<Props> = (props) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (!apiKey) {
    return (
      <TextField
        required={props.required}
        fullWidth
        label="Address"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        error={props.error}
        helperText={props.helperText}
      />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <AutocompleteField {...props} />
    </APIProvider>
  );
};
