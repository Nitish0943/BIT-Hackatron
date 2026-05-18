import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl, Dimensions, StatusBar, Platform, Alert, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { api, HelpRequest, DashboardData } from '../../lib/api';
import { useCalling } from '../../hooks/useCalling';


const { width } = Dimensions.get('window');

const COLORS = {
  navy: '#0b3c5d',
  bg: '#ffffff',
  soft: '#f5f7fa',
  line: '#d9e0e6',
  accent: '#2563eb',
  danger: '#d32f2f',
  success: '#2e7d32',
  warn: '#ed6c02',
};

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: 'fast-food-outline', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'medical', label: 'Medical', icon: 'medical-outline', color: '#dc2626', bg: '#fef2f2' },
  { id: 'rescue', label: 'Rescue', icon: 'boat-outline', color: '#d97706', bg: '#fffbeb' },
  { id: 'shelter', label: 'Shelter', icon: 'home-outline', color: '#2563eb', bg: '#eff6ff' },
  { id: 'baby_care', label: 'Baby Care', icon: 'apps-outline', color: '#db2777', bg: '#fdf2f8' },
  { id: 'women_care', label: 'Women Care', icon: 'heart-outline', color: '#e11d48', bg: '#fff1f2' },
  { id: 'water', label: 'Water', icon: 'water-outline', color: '#0891b2', bg: '#ecfeff' },
  { id: 'emergency_help', label: 'Emergency', icon: 'warning-outline', color: '#334155', bg: '#f8fafc' },
];

const STAGES = [
  { key: 'pending', label: 'Pending' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'completed', label: 'Completed' },
];

export default function CitizenDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State from Web Port
  const [locationName, setLocationName] = useState('Detecting location...');
  const [zone, setZone] = useState('Dhanbad');
  const [familySize, setFamilySize] = useState(3);
  const [sendingCategory, setSendingCategory] = useState('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  // Calling Logic
  const myId = 'CITIZEN-001'; // Simulated ID
  const { callState, initiateCall, hangup, remoteUser } = useCalling(myId);

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      setData(res);
      setLastCheck(Date.now());
    } catch (err) {
      console.error('Fetch Error:', err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto sync every minute like web
    const timer = setInterval(() => {
      fetchDashboard();
      setLastCheck(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationName('Dhanbad, Jharkhand (Manual)');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      
      // Nearest zone logic from web
      const points = [
        { zone: 'Dhanbad', lat: 23.7957, lng: 86.4304 },
        { zone: 'Ranchi', lat: 23.3441, lng: 85.3096 },
        { zone: 'Jamshedpur', lat: 22.8046, lng: 86.2029 },
      ];
      
      const nearest = points
        .slice()
        .sort((a, b) => ((a.lat - latitude) ** 2 + (a.lng - longitude) ** 2) - ((b.lat - latitude) ** 2 + (b.lng - longitude) ** 2))[0];
      
      setZone(nearest.zone);
      setLocationName(`${nearest.zone}, Jharkhand`);
    })();
  }, []);

  const latestRequest = useMemo(() => {
    if (!data?.requests?.length) return null;
    // Simple filter by type (web logic often filters by phone, here we take latest)
    return [...data.requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [data]);

  const assignedVolunteer = useMemo(() => {
    if (!latestRequest?.assignedVolunteerId || !data?.volunteers) return null;
    return data.volunteers.find(v => v.id === latestRequest.assignedVolunteerId);
  }, [latestRequest, data]);

  const activeIndex = useMemo(() => {
    if (!latestRequest) return 0;
    const { status, executionStatus } = latestRequest;
    if (status === 'completed' || executionStatus === 'completed') return 3;
    if (executionStatus === 'on_the_way') return 2;
    if (status === 'assigned' || executionStatus === 'assigned') return 1;
    return 0;
  }, [latestRequest]);

  const progress = useMemo(() => {
    return [16, 42, 72, 100][activeIndex];
  }, [activeIndex]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard().finally(() => setRefreshing(false));
  };

  const sendRequest = async (category: string) => {
    setSendingCategory(category);
    try {
      const payload = {
        name: 'Citizen Mobile',
        phone: '1234567890', // In production, this would be the logged-in user's phone
        category,
        people: familySize,
        location: locationName,
        zone,
        source: 'mobile',
      };
      await api.createRequest(payload);
      onRefresh();
      Alert.alert('Request Sent', `Your ${category} help request has been filed successfully.`);
    } catch (err) {
      Alert.alert('Error', 'Unable to send request. Check your connection.');
    } finally {
      setSendingCategory('');
    }
  };

  const handleCall = () => {
    if (latestRequest?.assignedVolunteerId) {
      console.log(`[UI] Calling: ${latestRequest.assignedVolunteerId} (${latestRequest.assignedVolunteerName})`);
      initiateCall(latestRequest.assignedVolunteerId, latestRequest.assignedVolunteerName || 'Responder');
    } else {
      Alert.alert('No Responder', 'A responder must be assigned to initiate a direct voice link.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.govTopStrip, { paddingTop: insets.top || 10 }]}>
        <Text style={styles.govStripText}>OFFICIAL GOVERNMENT OF INDIA PORTAL</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.navy]} />}
      >
        {/* Web-aligned Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.govHierarchy}>Ministry of Home Affairs | NDMA</Text>
            <Text style={styles.profileName}>Emergency Dashboard</Text>
            <View style={styles.locBadge}>
              <Ionicons name="location" size={12} color={COLORS.navy} />
              <Text style={styles.locText}>📍 {locationName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.replace('/login')} style={styles.logoutBtn}>
            <Ionicons name="power" size={20} color="#e11d48" />
          </TouchableOpacity>
        </View>

        {/* Disaster Warning Banner */}
        <View style={styles.warningBanner}>
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={styles.warningText}>Flood warning in your area - Keep phone active</Text>
        </View>

        {/* Live Sync Indicator */}
        <View style={styles.syncBox}>
          <View style={[styles.syncDot, { backgroundColor: refreshing ? COLORS.accent : '#10b981' }]} />
          <Text style={styles.syncText}>{refreshing ? 'Syncing...' : 'Live sync active'}</Text>
        </View>

        {/* Main SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity 
            style={[styles.sosBtn, sendingCategory === 'rescue' && { opacity: 0.7 }]} 
            onPress={() => sendRequest('rescue')}
            disabled={!!sendingCategory}
          >
            <Text style={styles.sosText}>🚨 NEED HELP</Text>
          </TouchableOpacity>
        </View>

        {/* Category Grid */}
        <View style={styles.gridContainer}>
          <Text style={styles.gridTitle}>Specific Assistance Needed</Text>
          <View style={styles.grid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.gridItem, { borderColor: cat.color + '30', backgroundColor: cat.bg }]}
                onPress={() => sendRequest(cat.id)}
                disabled={!!sendingCategory}
              >
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
                <Text style={[styles.gridItemLabel, { color: cat.color }]}>{cat.label}</Text>
                {sendingCategory === cat.id && (
                  <View style={styles.gridLoader}>
                    <Text style={styles.loaderText}>...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Family Size Selector */}
        <View style={styles.familyContainer}>
          <Text style={styles.familyTitle}>Number of people affected</Text>
          <View style={styles.familyGrid}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.familyBtn, familySize === num && styles.familyBtnActive]}
                onPress={() => setFamilySize(num)}
              >
                <Text style={[styles.familyBtnText, familySize === num && styles.familyBtnTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Last Request Tracker */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Request Summary</Text>
          <Text style={styles.minsAgo}>
            {latestRequest ? 'Last updated recently' : 'No active mission'}
          </Text>
        </View>

        {latestRequest ? (
          <View style={styles.missionCard}>
             <View style={styles.missionTop}>
                <View>
                  <Text style={styles.missionId}>ID: {latestRequest.id.slice(0, 8)}</Text>
                  <Text style={styles.missionCategory}>{latestRequest.category.replaceAll('_', ' ').toUpperCase()}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: activeIndex === 3 ? '#dcfce7' : '#fee2e2' }]}>
                  <Text style={[styles.statusBadgeText, { color: activeIndex === 3 ? '#166534' : '#991b1b' }]}>
                    {STAGES[activeIndex].label.toUpperCase()}
                  </Text>
                </View>
             </View>

             <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Mission Progress</Text>
                  <Text style={styles.progressValue}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressIndicator, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.executionHint}>{latestRequest.executionStatus || 'Waiting for NDMA response'}</Text>
             </View>

             {/* Timeline */}
             <View style={styles.timeline}>
                {STAGES.map((stage, idx) => {
                  const reached = idx <= activeIndex;
                  return (
                    <View key={stage.key} style={styles.timelineStep}>
                      <View style={[styles.stepDot, reached ? styles.stepDotReached : styles.stepDotPending]} />
                      <Text style={[styles.stepLabel, reached ? styles.stepLabelReached : styles.stepLabelPending]}>
                        {stage.label}
                      </Text>
                      {idx < STAGES.length - 1 && <View style={[styles.timelineLine, idx < activeIndex && styles.timelineLineReached]} />}
                    </View>
                  );
                })}
             </View>

             {/* Live Mission Tracking Panel */}
             {latestRequest.assignedVolunteerId && (
               <View style={styles.mapWrap}>
                 <View style={styles.mapLabelRow}>
                   <Ionicons name="navigate-circle-outline" size={16} color={COLORS.navy} />
                   <Text style={styles.mapLabel}>PROXIMITY RADAR</Text>
                 </View>
                 <View style={styles.radarPanel}>
                   {/* Radar rings */}
                   <View style={styles.radarOuter}>
                     <View style={styles.radarMid}>
                       <View style={styles.radarInner}>
                         <View style={styles.radarCenter}>
                           <Ionicons name="person" size={14} color="white" />
                         </View>
                       </View>
                     </View>
                   </View>
                   {/* Volunteer dot */}
                   <View style={styles.volunteerDot}>
                     <Ionicons name="shield-checkmark" size={12} color="white" />
                   </View>
                   {/* Route dashes */}
                   <View style={styles.routeLine} />

                   {/* Status overlay */}
                   <View style={styles.radarStatusRow}>
                     <View style={styles.radarBadge}>
                       <View style={[styles.radarDot, { backgroundColor: COLORS.accent }]} />
                       <Text style={styles.radarBadgeText}>YOU</Text>
                     </View>
                     <View style={styles.radarBadge}>
                       <View style={[styles.radarDot, { backgroundColor: COLORS.success }]} />
                       <Text style={styles.radarBadgeText}>RESPONDER</Text>
                     </View>
                   </View>

                   <Text style={styles.radarEtaText}>
                     🛡️ Responder is en route — ETA updating live
                   </Text>
                 </View>
               </View>
             )}

             {/* Volunteer Info */}
             {latestRequest.assignedVolunteerName && (
               <View style={styles.volunteerBox}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.navy} />
                  <View style={styles.vData}>
                    <Text style={styles.vTitle}>Assigned Responder</Text>
                    <Text style={styles.vName}>{latestRequest.assignedVolunteerName}</Text>
                  </View>
                  <TouchableOpacity style={styles.vCall} onPress={handleCall}>
                    <Ionicons name="call" size={18} color="white" />
                  </TouchableOpacity>
               </View>
             )}
          </View>
        ) : (
          <View style={styles.emptyMission}>
            <Text style={styles.emptyText}>No live missions. Press SOS for help.</Text>
          </View>
        )}

        {/* History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent History</Text>
        </View>
        <View style={styles.historyBox}>
          {(data?.requests || []).slice(0, 3).map((req) => (
            <View key={req.id} style={styles.historyRow}>
              <View style={styles.historyCol}>
                <Text style={styles.hCat}>{req.category.toUpperCase()}</Text>
                <Text style={styles.hDate}>{new Date(req.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.hStatus, { color: req.status === 'completed' ? COLORS.success : COLORS.warn }]}>
                {req.status === 'completed' ? 'DONE' : 'ACTIVE'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Calling Modal Overlay */}
      <Modal visible={callState !== 'idle'} transparent animationType="fade">
        <View style={styles.callModal}>
          <View style={styles.callContent}>
             <View style={styles.callAvatar}>
                <Ionicons name="person" size={64} color="white" />
             </View>
             <Text style={styles.callUser}>{remoteUser || 'Responder'}</Text>
             <Text style={styles.callStatus}>
               {callState === 'calling' ? 'CONNECTING DISASTER NETWORK...' : 'LIVE VOICE LINK'}
             </Text>
             
             <TouchableOpacity style={styles.hangupBtn} onPress={hangup}>
               <Ionicons name="call" size={32} color="white" style={{ transform: [{ rotate: '135deg' }] }} />
             </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  govTopStrip: { backgroundColor: COLORS.navy, paddingBottom: 8, alignItems: 'center' },
  govStripText: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1.5 },
  scrollContent: { paddingBottom: 40 },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.line,
    backgroundColor: 'white'
  },
  headerLeft: { flex: 1 },
  govHierarchy: { fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' },
  profileName: { fontSize: 24, fontWeight: '900', color: COLORS.navy, marginTop: 2 },
  locBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  locText: { fontSize: 13, color: COLORS.navy, fontWeight: '700', marginLeft: 4 },
  logoutBtn: { padding: 12, backgroundColor: '#fff1f2', borderRadius: 12 },

  warningBanner: { 
    backgroundColor: '#991b1b', 
    margin: 15, 
    padding: 12, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10 
  },
  warningText: { color: 'white', fontWeight: 'bold', fontSize: 13, flex: 1 },

  syncBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 5, gap: 6 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },

  sosContainer: { padding: 20 },
  sosBtn: { 
    backgroundColor: '#b91c1c', 
    paddingVertical: 25, 
    borderRadius: 20, 
    alignItems: 'center',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8
  },
  sosText: { color: 'white', fontSize: 32, fontWeight: '900' },

  gridContainer: { paddingHorizontal: 20 },
  gridTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.navy, marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  gridItem: { 
    width: (width - 52) / 2, 
    padding: 15, 
    borderRadius: 15, 
    borderWidth: 1, 
    alignItems: 'center',
    gap: 8
  },
  gridItemLabel: { fontSize: 14, fontWeight: 'bold' },
  gridLoader: { position: 'absolute', top: 5, right: 5 },
  loaderText: { color: COLORS.navy, fontSize: 10, fontWeight: 'bold' },

  familyContainer: { padding: 20 },
  familyTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748b', marginBottom: 10 },
  familyGrid: { flexDirection: 'row', gap: 10 },
  familyBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  familyBtnActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  familyBtnText: { fontSize: 18, fontWeight: 'bold', color: COLORS.navy },
  familyBtnTextActive: { color: 'white' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 25, alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.navy },
  minsAgo: { fontSize: 12, color: '#94a3b8' },

  missionCard: { margin: 20, padding: 20, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line },
  missionTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  missionId: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  missionCategory: { fontSize: 18, fontWeight: '900', color: COLORS.navy },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },

  progressSection: { marginBottom: 25 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  progressValue: { fontSize: 13, fontWeight: '900', color: COLORS.navy },
  progressTrack: { height: 10, backgroundColor: COLORS.soft, borderRadius: 5, overflow: 'hidden' },
  progressIndicator: { height: '100%', backgroundColor: COLORS.navy },
  executionHint: { fontSize: 12, color: COLORS.navy, fontWeight: 'bold', marginTop: 8 },

  timeline: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, height: 40 },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: { width: 12, height: 12, borderRadius: 6, zIndex: 2 },
  stepDotReached: { backgroundColor: COLORS.navy },
  stepDotPending: { backgroundColor: COLORS.line },
  stepLabel: { fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  stepLabelReached: { color: COLORS.navy },
  stepLabelPending: { color: '#94a3b8' },
  timelineLine: { position: 'absolute', top: 5, left: '50%', width: '100%', height: 2, backgroundColor: COLORS.line, zIndex: 1 },
  timelineLineReached: { backgroundColor: COLORS.navy },

  volunteerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.soft, padding: 15, borderRadius: 15, gap: 12 },
  vData: { flex: 1 },
  vTitle: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  vName: { fontSize: 15, fontWeight: '800', color: COLORS.navy },
  vCall: { backgroundColor: COLORS.success, padding: 10, borderRadius: 20 },

  emptyMission: { margin: 20, padding: 40, backgroundColor: COLORS.soft, borderRadius: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.line },
  emptyText: { color: '#64748b', fontWeight: '500' },

  historyBox: { margin: 20, gap: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: 'white', borderRadius: 15, borderBottomWidth: 1, borderBottomColor: COLORS.line },
  historyCol: { flex: 1 },
  hCat: { fontWeight: 'bold', color: COLORS.navy },
  hDate: { fontSize: 12, color: '#94a3b8' },
  hStatus: { fontWeight: 'bold', fontSize: 12 },

  // CALLING UI STYLES
  callModal: { flex: 1, backgroundColor: 'rgba(11, 60, 93, 0.95)', justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: width * 0.8 },
  callAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callUser: { fontSize: 24, fontWeight: '900', color: 'white', marginBottom: 8 },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  hangupBtn: { marginTop: 80, width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },

  // NEW MAP STYLES
  mapWrap: {
    marginTop: 20,
    backgroundColor: '#fff',
  },
  mapLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  mapLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: 1,
  },
  // Radar Panel (replaces react-native-maps)
  radarPanel: {
    height: 180,
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#0b3c5d08',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  radarOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: COLORS.navy + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarMid: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: COLORS.navy + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.navy + '50',
    backgroundColor: COLORS.navy + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCenter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerDot: {
    position: 'absolute',
    top: 30,
    right: 40,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  routeLine: {
    position: 'absolute',
    width: 50,
    height: 2,
    backgroundColor: COLORS.accent + '60',
    top: 43,
    right: 68,
    transform: [{ rotate: '-30deg' }],
  },
  radarStatusRow: {
    position: 'absolute',
    bottom: 28,
    flexDirection: 'row',
    gap: 16,
  },
  radarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radarBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.navy,
    letterSpacing: 0.5,
  },
  radarEtaText: {
    position: 'absolute',
    bottom: 8,
    fontSize: 10,
    color: COLORS.navy,
    fontWeight: '600',
  },
});

