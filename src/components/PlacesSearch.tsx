import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  SectionList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

interface PlacePrediction {
  placePrediction: {
    place: string;
    placeId: string;
    text: {
      text: string;
      matches: Array<{ endOffset: number }>;
    };
    structuredFormat: {
      mainText: {
        text: string;
        matches: Array<{ endOffset: number }>;
      };
      secondaryText: {
        text: string;
      };
    };
    types: string[];
    distanceMeters?: number;
  };
}

interface AutocompleteResponse {
  suggestions: PlacePrediction[];
}

interface Place {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlacesSearchProps {
  onPlaceSelect: (place: Place) => void;
  apiKey: string;
}

const PlacesSearch: React.FC<PlacesSearchProps> = ({ onPlaceSelect, apiKey }) => {
  const [searchText, setSearchText] = useState('');
  const [predictions, setPredictions] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<Place[]>([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRecentSearches();
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setRecentSearches(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  useEffect(() => {
    const fetchPredictions = async () => {
      if (searchText.length < 2) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.post<AutocompleteResponse>(
          'https://places.googleapis.com/v1/places:autocomplete',
          {
            input: searchText,
            locationBias: userLocation ? {
              circle: {
                center: {
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude
                },
                radius: 5000.0 // 5km radius
              }
            } : undefined
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat'
            }
          }
        );

        const transformedPredictions: Place[] = response.data.suggestions
          .filter(suggestion => suggestion.placePrediction)
          .map(suggestion => ({
            place_id: suggestion.placePrediction.placeId,
            description: suggestion.placePrediction.structuredFormat.mainText.text + 
              (suggestion.placePrediction.structuredFormat.secondaryText.text
                ? ' - ' + suggestion.placePrediction.structuredFormat.secondaryText.text
                : ''),
            structured_formatting: {
              main_text: suggestion.placePrediction.structuredFormat.mainText.text,
              secondary_text: suggestion.placePrediction.structuredFormat.secondaryText.text
            }
          }));

        setPredictions(transformedPredictions);
      } catch (error) {
        console.error('Error fetching predictions:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchPredictions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchText, apiKey, userLocation]);

  const saveToRecentSearches = async (place: Place) => {
    try {
      // Get existing recent searches
      const history = await AsyncStorage.getItem('searchHistory');
      let recentSearches = history ? JSON.parse(history) : [];
      
      // Remove the place if it already exists (to avoid duplicates)
      recentSearches = recentSearches.filter(
        (p: Place) => p.place_id !== place.place_id
      );
      
      // Add the new place to the beginning of the array
      recentSearches.unshift(place);
      
      // Keep only the last 10 searches
      recentSearches = recentSearches.slice(0, 10);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('searchHistory', JSON.stringify(recentSearches));
      
      // Update state
      setRecentSearches(recentSearches);
    } catch (error) {
      console.error('Error saving to recent searches:', error);
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    onPlaceSelect(place);
    setSearchText('');
    setPredictions([]);
    setIsInputFocused(false);
    Keyboard.dismiss();
    await saveToRecentSearches(place);
  };

  const handleClear = () => {
    // Clear everything in one go
    setSearchText('');
    setPredictions([]);
    setIsInputFocused(false);
    Keyboard.dismiss();
    if (inputRef.current) {
      inputRef.current.blur();
      // Force clear the input value
      inputRef.current.setNativeProps({ text: '' });
    }
  };

  const handleTextChange = (text: string) => {
    setSearchText(text);
    if (text.length === 0) {
      setPredictions([]);
      setIsInputFocused(false);
    } else {
      setIsInputFocused(true);
    }
  };

  const filteredRecentSearches = recentSearches.filter(place => 
    searchText.length === 0 || 
    place.structured_formatting.main_text.toLowerCase().includes(searchText.toLowerCase()) ||
    place.structured_formatting.secondary_text.toLowerCase().includes(searchText.toLowerCase())
  );

  const sections = [
    ...(filteredRecentSearches.length > 0 ? [{
      title: 'Recent Searches',
      data: filteredRecentSearches
    }] : []),
    ...(predictions.length > 0 ? [{
      title: 'Suggestions',
      data: predictions
    }] : [])
  ];

  const renderRecentSearches = () => {
    if (filteredRecentSearches.length === 0) return null;

    return (
      <View style={styles.recentSearchesContainer}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentSearchesScroll}
        >
          {filteredRecentSearches.map((place, index) => (
            <TouchableOpacity
              key={`${place.place_id}-${index}`}
              style={styles.recentSearchItem}
              onPress={() => handlePlaceSelect(place)}
            >
              <Text style={styles.recentSearchMainText} numberOfLines={1}>
                {place.structured_formatting.main_text}
              </Text>
              <Text style={styles.recentSearchSecondaryText} numberOfLines={1}>
                {place.structured_formatting.secondary_text}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const showSuggestions = isInputFocused && (filteredRecentSearches.length > 0 || predictions.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={searchText}
          onChangeText={handleTextChange}
          placeholder="Search for a place..."
          placeholderTextColor="#666"
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => {
            setIsInputFocused(true);
            if (searchText.length === 0) {
              loadRecentSearches();
            }
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsInputFocused(false);
            }, 200);
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClear}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {loading && <ActivityIndicator style={styles.loader} />}
      {showSuggestions && (
        <View style={styles.predictionsList}>
          {renderRecentSearches()}
          {predictions.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Suggestions</Text>
              <SectionList
                sections={[{ title: 'Suggestions', data: predictions }]}
                keyExtractor={(item, index) => `${item.place_id}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => handlePlaceSelect(item)}
                  >
                    <Text style={styles.mainText}>{item.structured_formatting.main_text}</Text>
                    <Text style={styles.secondaryText}>
                      {item.structured_formatting.secondary_text}
                    </Text>
                  </TouchableOpacity>
                )}
                renderSectionHeader={() => null}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    height: 50,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  clearButton: {
    paddingHorizontal: 15,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  predictionsList: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    maxHeight: 400,
  },
  predictionItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 15,
    paddingBottom: 5,
    backgroundColor: '#f8f9fa',
  },
  mainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  secondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loader: {
    position: 'absolute',
    right: 50,
    top: 15,
  },
  recentSearchesContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
  },
  recentSearchesScroll: {
    paddingHorizontal: 15,
  },
  recentSearchItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recentSearchMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  recentSearchSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});

export default PlacesSearch; 