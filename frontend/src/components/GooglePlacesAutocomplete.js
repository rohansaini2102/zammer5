import React, { useRef, useEffect, useState } from 'react';

const GooglePlacesAutocomplete = ({
  value = '',
  onChange,
  onPlaceSelected,
  placeholder = 'Enter shop address',
  className = '',
  disabled = false,
  error = null
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    console.log('🚀 Starting Google Places initialization (React)...');
    console.log('🔑 API Key:', API_KEY ? API_KEY.substring(0, 10) + '...' : 'NOT FOUND');

    if (!API_KEY) {
      setStatus('❌ API Key not found');
      console.error('❌ REACT_APP_GOOGLE_MAPS_API_KEY not found in environment');
      return;
    }

    // Initialize Google Places (same as working HTML)
    const initializePlaces = () => {
      try {
        console.log('✅ Google Maps API callback triggered');
        setStatus('✅ Google Maps API loaded successfully!');
        
        if (!window.google || !window.google.maps || !window.google.maps.places) {
          throw new Error('Places library not loaded');
        }

        console.log('⚙️ Creating autocomplete instance...');
        
        // Create autocomplete (EXACT same config as working HTML)
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'IN' },
          fields: ['formatted_address', 'geometry', 'name']
        });

        autocompleteRef.current = autocomplete;
        
        console.log('✅ Autocomplete instance created');

        // Handle place selection (EXACT same as working HTML)
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('🎉 Place selected:', place);
          
          if (place.geometry) {
            const placeData = {
              address: place.formatted_address,
              coordinates: [
                place.geometry.location.lng(),
                place.geometry.location.lat()
              ],
              name: place.name
            };
            
            setStatus(`✅ Selected: ${place.formatted_address}`);
            
            // Update parent component
            if (onChange) {
              onChange(place.formatted_address);
            }
            if (onPlaceSelected) {
              onPlaceSelected(placeData);
            }
          } else {
            setStatus('⚠️ No geometry data for selected place');
            console.warn('⚠️ No geometry data for selected place');
          }
        });

        setIsReady(true);
        setStatus('🎯 Ready! Start typing an address...');
        console.log('✅ Places autocomplete initialized successfully');

      } catch (error) {
        console.error('❌ Error initializing Places:', error);
        setStatus(`❌ Error: ${error.message}`);
      }
    };

    // Load Google Maps API (EXACT same as working HTML)
    const loadGoogleMaps = () => {
      // Check if already loaded
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('✅ Google Maps already loaded, initializing...');
        initializePlaces();
        return;
      }

      console.log('📡 Loading Google Maps API...');
      setStatus('📡 Loading Google Maps API...');
      
      // Create unique callback name to avoid conflicts
      const callbackName = `initGooglePlaces_${Date.now()}`;
      
      // Set up global callback
      window[callbackName] = () => {
        console.log('🎯 Google Maps API callback executed');
        delete window[callbackName]; // Clean up
        initializePlaces();
      };
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      
      script.onerror = (error) => {
        setStatus('❌ Failed to load Google Maps API');
        console.error('❌ Script loading failed:', error);
        delete window[callbackName];
      };
      
      document.head.appendChild(script);
    };

    // Start loading
    loadGoogleMaps();

    // Cleanup function
    return () => {
      if (autocompleteRef.current && window.google) {
        try {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (error) {
          console.error('Error during cleanup:', error);
        }
      }
    };
  }, []); // Empty dependency array - only run once

  // Handle manual input changes
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <div className="relative">
      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled || !isReady}
        className={`
          ${className}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          ${!isReady ? 'bg-gray-100' : ''}
        `}
        autoComplete="off"
      />
      
      {/* Status Indicator */}
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
        {!isReady && !status.includes('❌') && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
        )}

        {status.includes('❌') && (
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}

        {isReady && (
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </div>

      {/* Status Message */}
      <p className={`mt-1 text-xs ${
        status.includes('❌') ? 'text-red-600' : 
        status.includes('✅') || status.includes('🎯') ? 'text-green-600' : 
        'text-gray-500'
      }`}>
        {status}
      </p>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default GooglePlacesAutocomplete;