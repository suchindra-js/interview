import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import PlacesSearch from '../components/PlacesSearch';
import * as Location from 'expo-location';
import { GOOGLE_MAPS_API_KEY } from '@env';

interface Place {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  location?: {
    lat: number;
    lng: number;
  };
}

interface PlaceDetailsResponse {
  result: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  };
}

const MapScreen: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [searchHistory, setSearchHistory] = useState<Place[]>([]);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    loadSearchHistory();
    getUserLocation();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (place: Place) => {
    try {
      const newHistory = [place, ...searchHistory].slice(0, 10); // Keep last 10 searches
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    // Immediately set the selected place with the information we have
    setSelectedPlace(place);
    saveSearchHistory(place);

    try {
      // Get place details including location
      const response = await axios.get<PlaceDetailsResponse>(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=geometry&key=${GOOGLE_MAPS_API_KEY}`
      );

      const location = response.data.result.geometry.location;
      const placeWithLocation = { ...place, location };

      // Update the place with location information
      setSelectedPlace(placeWithLocation);

      // Update map region
      setRegion({
        latitude: location.lat,
        longitude: location.lng,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider='google'
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {selectedPlace && (
          <Marker
            coordinate={selectedPlace.location ? {
              latitude: selectedPlace.location.lat,
              longitude: selectedPlace.location.lng,
            } : region}
            title={selectedPlace.structured_formatting.main_text}
            description={selectedPlace.structured_formatting.secondary_text}
          />
        )}
      </MapView>

      <View style={styles.searchContainer}>
        <PlacesSearch
          onPlaceSelect={handlePlaceSelect}
        />
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  historyContainer: {
    position: 'absolute',
    top: 90, // Position below the search input
    left: 20,
    right: 20,
    zIndex: 1,
  }
});

export default MapScreen; 