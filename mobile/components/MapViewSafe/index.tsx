// Pure React Native map placeholder — no native modules required.
// This component works in Expo Go and in web builds.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const MapViewSafe = ({ style, children, ...rest }: any) => (
  <View style={[style, styles.fallback]}>
    <Ionicons name="map-outline" size={48} color="#0b3c5d30" />
    <Text style={styles.fallbackText}>Live Map Active on Mobile Device</Text>
    <View style={{ display: 'none' }}>{children}</View>
  </View>
);

export const MarkerSafe = ({ children, ...rest }: any) => (
  <View style={{ display: 'none' }}>{children}</View>
);

export const PolylineSafe = (props: any) => null;

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackText: {
    color: '#0b3c5d',
    fontWeight: 'bold',
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MapViewSafe;
