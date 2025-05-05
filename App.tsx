import 'react-native-get-random-values';
import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import MapScreen from './src/screens/MapScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <MapScreen />
    </SafeAreaView>
  );
}
