import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Web Design Tokens
const COLORS = {
  navy: '#0b3c5d',
  bg: '#ffffff',
  soft: '#f5f7fa',
  line: '#d9e0e6',
  text: '#1f2937',
  accent: '#2563eb',
};

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gov Top Strip - Matching Web .gov-top-strip */}
      <View style={[styles.govTopStrip, { paddingTop: insets.top || 10 }]}>
        <Text style={styles.govStripText}>OFFICIAL GOVERNMENT OF INDIA PORTAL</Text>
      </View>

      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logoText}>Sahayak<Text style={{ color: COLORS.accent }}>Net</Text></Text>
        </View>

        <View style={styles.illustrationContainer}>
          <View style={styles.govCard}>
            <Ionicons name="shield-checkmark" size={100} color={COLORS.navy} />
            <Text style={styles.cardInfo}>Secure Resource Access</Text>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Disaster Relief & Resource Platform</Text>
          <Text style={styles.subtitle}>
            A centralized system for emergency response, volunteer coordination, and citizen support.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/login')}
          >
            <Text style={styles.buttonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.versionText}>v1.0.0 Stable</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  govTopStrip: {
    backgroundColor: COLORS.navy,
    paddingBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  govStripText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: -0.5,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  govCard: {
    width: width * 0.8,
    padding: 30,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: 'center',
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInfo: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.navy,
    fontWeight: '600',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  footer: {
    alignItems: 'center',
  },
  button: {
    backgroundColor: COLORS.navy,
    width: '100%',
    height: 60,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  versionText: {
    marginTop: 20,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
});
