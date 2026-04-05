import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StatusBar } from 'react-native';
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

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    router.replace('/dashboard');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Gov Top Strip */}
      <View style={[styles.govTopStrip, { paddingTop: insets.top || 10 }]}>
        <Text style={styles.govStripText}>OFFICIAL GOVERNMENT OF INDIA PORTAL</Text>
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={COLORS.navy} />
              </TouchableOpacity>
              <Text style={styles.title}>Secure Login</Text>
              <Text style={styles.subtitle}>Enter your credentials or choose a role below.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputLabelContainer}>
                <Text style={styles.label}>EMAIL ADDRESS</Text>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={COLORS.navy} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputLabelContainer}>
                <Text style={styles.label}>PASSWORD</Text>
              </View>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.navy} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>CONTINUE TO PORTAL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.roleHeaderContainer}>
              <View style={styles.line} />
              <Text style={styles.roleHeaderText}>INTERNAL ROLES</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.roleWrapper}>
              <TouchableOpacity style={[styles.roleCard, { borderLeftColor: '#10b981' }]} onPress={() => router.replace('/(citizen)/')}>
                <View style={styles.roleIconWrapper}>
                  <Ionicons name="person" size={24} color="#10b981" />
                </View>
                <View style={styles.roleTextWrapper}>
                  <Text style={styles.roleName}>Citizen Profile</Text>
                  <Text style={styles.roleDesc}>Request help & view history</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
              </TouchableOpacity>

                <TouchableOpacity style={[styles.roleCard, { borderLeftColor: '#f59e0b' }]} onPress={() => router.replace('/(volunteer)/')}>
                  <View style={styles.roleIconWrapper}>
                    <Ionicons name="heart" size={24} color="#f59e0b" />
                  </View>
                  <View style={styles.roleTextWrapper}>
                    <Text style={styles.roleName}>Volunteer Access</Text>
                    <Text style={styles.roleDesc}>Accept tasks & view stats</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.roleCard, { borderLeftColor: COLORS.navy }]} onPress={() => router.replace('/dashboard')}>
                  <View style={styles.roleIconWrapper}>
                    <Ionicons name="business" size={24} color={COLORS.navy} />
                  </View>
                  <View style={styles.roleTextWrapper}>
                    <Text style={styles.roleName}>Government Portal</Text>
                    <Text style={styles.roleDesc}>Monitor & allocate resources</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
              </View>

            <View style={styles.footerLinks}>
              <Text style={styles.footerText}>Unable to sign in? </Text>
              <TouchableOpacity>
                <Text style={styles.contactText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  form: {
    width: '100%',
    backgroundColor: 'white',
    padding: 2,
  },
  inputLabelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.navy,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.navy,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  roleHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 35,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
  },
  roleHeaderText: {
    color: '#94a3b8',
    paddingHorizontal: 15,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  roleWrapper: {
    gap: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  roleIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.soft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  roleTextWrapper: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.navy,
  },
  roleDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  contactText: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
