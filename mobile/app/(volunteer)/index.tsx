import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, RefreshControl, Dimensions, StatusBar, Alert, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, DashboardData, HelpRequest } from '../../lib/api';
import { useCalling } from '../../hooks/useCalling';

const { width } = Dimensions.get('window');

// Web Design Tokens
const COLORS = {
  navy: '#0b3c5d',
  bg: '#ffffff',
  soft: '#f5f7fa',
  line: '#d9e0e6',
  text: '#1f2937',
  accent: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
};

// Map distance logic from web
function distanceKm(a: { lat: number; lng: number } | any, b: { lat: number; lng: number } | any) {
  if (!a || !b || a.lat === undefined || b.lat === undefined) return 999;
  const dx = (a.lat - b.lat) * 111;
  const dy = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

function StatusBadge({ status }: { status: string }) {
  let bg = '#e2e8f0';
  let color = '#475569';
  let label = status.toUpperCase();

  if (status === 'completed') { bg = '#dcfce7'; color = '#15803d'; label = 'COMPLETED'; }
  else if (status === 'on_the_way') { bg = '#dbeafe'; color = '#1d4ed8'; label = 'ON THE WAY'; }
  else if (status === 'assigned') { bg = '#fef3c7'; color = '#b45309'; label = 'ASSIGNED'; }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function VolunteerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());
  const [isMutating, setIsMutating] = useState(false);

  // Demo Identity Synchronization
  const me = useMemo(() => {
    if (!data) return null;
    const first = data.volunteers[0];
    return { ...first, id: 'VOL-001' }; // Force ID for demo signaling
  }, [data]);

  // Calling Logic
  const { callState, acceptCall, hangup, remoteUser } = useCalling(me?.id || '');

  const assignedMissions = useMemo(() => {
    if (!data || !me) return [];
    return data.requests
      .filter(req => req.assignedVolunteerId === me.id && req.status !== 'completed')
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [data, me]);

  const nearbyRequests = useMemo(() => {
    if (!data || !me) return [];
    return data.requests
      .filter(req => req.status === 'pending' && !req.assignedVolunteerId)
      .sort((a, b) => distanceKm(me, a) - distanceKm(me, b))
      .slice(0, 10);
  }, [data, me]);

  const suggestedTask = useMemo(() => {
    if (nearbyRequests.length === 0 || !me) return null;
    return nearbyRequests[0]; // Simplification for mobile: nearest pending task
  }, [nearbyRequests, me]);

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
    const interval = setInterval(fetchDashboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, []);

  const handleStartMission = async (requestId: string) => {
    if (!me) return;
    setIsMutating(true);
    try {
      await api.startMission(requestId, me.id);
      Alert.alert('Success', 'Mission started. Proceed to location.');
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Unable to start mission.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleCompleteMission = async (requestId: string) => {
    setIsMutating(true);
    try {
      await api.completeRequest(requestId);
      Alert.alert('Success', 'Mission completed safely.');
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Unable to complete mission.');
    } finally {
      setIsMutating(false);
    }
  };

  const toggleAvailability = async () => {
    if (!me) return;
    const next = me.availability === 'available' ? 'busy' : 'available';
    try {
      await api.setAvailability(me.id, next);
      fetchDashboard();
    } catch (err) {
      Alert.alert('Error', 'Could not update status.');
    }
  };

  if (!data || !me) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.syncText}>Initializing Demo Field Console...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Gov Top Strip */}
      <View style={[styles.govTopStrip, { paddingTop: insets.top || 10 }]}>
        <Text style={styles.govStripText}>OFFICIAL GOVERNMENT OF INDIA PORTAL</Text>
      </View>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.govHierarchy}>SahayakNet • Field Ops</Text>
          <Text style={styles.vName}>{me.name}</Text>
          <View style={styles.statusRow}>
             <View style={[styles.statusDot, { backgroundColor: me.availability === 'available' ? COLORS.success : COLORS.warning }]} />
             <Text style={styles.statusText}>{me.availability.toUpperCase()} | SIGNALING ACTIVE</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.availBtn} onPress={toggleAvailability}>
           <Ionicons name="power" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.navy]} />}
      >
        {/* Strategic Field HUD (replaces react-native-maps) */}
        <View style={styles.hudPanel}>
          <View style={styles.hudHeader}>
            <Ionicons name="pulse" size={14} color={COLORS.success} />
            <Text style={styles.hudTitle}>STRATEGIC FIELD HUD</Text>
            <View style={[styles.liveDot, { backgroundColor: COLORS.success }]} />
          </View>

          <View style={styles.hudGrid}>
            {/* Active Missions */}
            <View style={styles.hudCard}>
              <View style={[styles.hudIcon, { backgroundColor: COLORS.danger + '15' }]}>
                <Ionicons name="flash" size={20} color={COLORS.danger} />
              </View>
              <Text style={styles.hudCount}>{assignedMissions.length}</Text>
              <Text style={styles.hudLabel}>Active{`\n`}Missions</Text>
            </View>

            {/* Position indicator */}
            <View style={styles.hudCenter}>
              <View style={styles.hudRadarOuter}>
                <View style={styles.hudRadarMid}>
                  <View style={styles.hudRadarInner}>
                    <Ionicons name="radio" size={18} color="white" />
                  </View>
                </View>
              </View>
              <Text style={styles.hudCoord}>FIELD OPERATIVE</Text>
            </View>

            {/* Nearby SOS */}
            <View style={styles.hudCard}>
              <View style={[styles.hudIcon, { backgroundColor: COLORS.warning + '15' }]}>
                <Ionicons name="warning" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.hudCount}>{nearbyRequests.filter(r => !r.assignedVolunteerId).length}</Text>
              <Text style={styles.hudLabel}>Pending{`\n`}Nearby</Text>
            </View>
          </View>
        </View>


        {/* Sync Pulse */}
        <View style={styles.syncBox}>
          <View style={[styles.syncDot, { backgroundColor: refreshing || isMutating ? COLORS.accent : COLORS.success }]} />
          <Text style={styles.syncText}>{refreshing || isMutating ? 'Syncing...' : 'Live Operations Active'}</Text>
        </View>

        {/* Assigned Missions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Working Missions</Text>
          <Text style={styles.badgeCount}>{assignedMissions.length}</Text>
        </View>

        {assignedMissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No missions assigned to you currently.</Text>
          </View>
        ) : (
          assignedMissions.map((req) => (
            <View key={req.id} style={styles.missionCard}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.reqId}>{req.id}</Text>
                  <Text style={styles.reqName}>{req.name}</Text>
                </View>
                <StatusBadge status={req.executionStatus || 'assigned'} />
              </View>

              <View style={styles.locRow}>
                <Ionicons name="location" size={14} color={COLORS.navy} />
                <Text style={styles.locText}>{req.location}</Text>
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                   <Text style={styles.detailLabel}>NEEDS</Text>
                   <Text style={styles.detailValue}>{req.category.toUpperCase()}</Text>
                </View>
                <View style={styles.detailItem}>
                   <Text style={styles.detailLabel}>ETA</Text>
                   <Text style={styles.detailValue}>{req.eta || '15 mins'}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                   style={[styles.actionBtn, styles.primaryBtn, (req.executionStatus === 'on_the_way' || isMutating) && styles.disabledBtn]}
                   onPress={() => handleStartMission(req.id)}
                   disabled={req.executionStatus === 'on_the_way' || isMutating}
                >
                   <Text style={styles.primaryBtnText}>START MISSION</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.actionBtn, styles.secondaryBtn, isMutating && styles.disabledBtn]}
                   onPress={() => handleCompleteMission(req.id)}
                   disabled={isMutating}
                >
                   <Text style={styles.secondaryBtnText}>COMPLETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* AI Assist */}
        {suggestedTask && (
          <View style={styles.aiAssist}>
            <View style={styles.aiHeader}>
              <Ionicons name="sparkles" size={18} color="white" />
              <Text style={styles.aiTitle}>AI OPERATIONS ASSIST</Text>
            </View>
            <View style={styles.aiBody}>
              <Text style={styles.aiReason}>
                Target <Text style={{fontWeight:'bold'}}>{suggestedTask.id}</Text> is the highest priority unassigned case within <Text style={{fontWeight:'bold'}}>{distanceKm(me, suggestedTask).toFixed(1)} km</Text>.
              </Text>
              <TouchableOpacity 
                style={styles.aiAction}
                onPress={() => api.assignRequest(suggestedTask.id, me.id).then(onRefresh)}
              >
                <Text style={styles.aiActionText}>ACCEPT SUGGESTED TASK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Nearby Feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Requests</Text>
          <Text style={styles.badgeCount}>{nearbyRequests.length}</Text>
        </View>

        <View style={styles.nearbyFeed}>
          {nearbyRequests.map((req) => (
            <TouchableOpacity key={req.id} style={styles.nearbyCard} activeOpacity={0.7}>
               <View style={styles.nearbyLeft}>
                  <Text style={styles.nearbyCategory}>{req.category.toUpperCase()}</Text>
                  <Text style={styles.nearbyLocation}>{req.location}</Text>
                  <Text style={styles.nearbyDist}>{distanceKm(me, req).toFixed(1)} km away • {req.people} members</Text>
               </View>
               <TouchableOpacity 
                  style={styles.acceptBtn}
                  onPress={() => api.assignRequest(req.id, me.id).then(onRefresh)}
               >
                  <Ionicons name="add" size={24} color="white" />
               </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
           <Text style={styles.logoutText}>EXIT FIELD OPERATIONS</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Incoming Call Modal */}
      <Modal visible={callState === 'incoming'} transparent animationType="slide">
        <View style={styles.callModal}>
          <View style={styles.callContent}>
             <View style={[styles.callAvatar, { backgroundColor: COLORS.accent }]}>
                <Ionicons name="call" size={48} color="white" />
             </View>
             <Text style={styles.callUser}>INCOMING SOS CALL</Text>
             <Text style={styles.callStatus}>CITIZEN HUB IS REQUESTING VOICE LINK</Text>
             
             <View style={styles.callActionRow}>
                <TouchableOpacity style={[styles.callActionBtn, { backgroundColor: COLORS.success }]} onPress={acceptCall}>
                   <Ionicons name="checkmark" size={32} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callActionBtn, { backgroundColor: COLORS.danger }]} onPress={hangup}>
                   <Ionicons name="close" size={32} color="white" />
                </TouchableOpacity>
             </View>
          </View>
        </View>
      </Modal>

      {/* Active Call Overlay */}
      <Modal visible={callState === 'connected'} transparent animationType="fade">
        <View style={styles.callModal}>
          <View style={styles.callContent}>
             <View style={styles.callAvatar}>
                <Ionicons name="person" size={64} color="white" />
             </View>
             <Text style={styles.callUser}>LIVE VOICE LINK</Text>
             <Text style={styles.callStatus}>CONNECTED TO CITIZEN IN DISTRESS</Text>
             
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
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line
  },
  headerLeft: { flex: 1 },
  govHierarchy: { fontSize: 10, textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' },
  vName: { fontSize: 24, fontWeight: '900', color: COLORS.navy, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  availBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { paddingBottom: 40 },
  syncBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 15, gap: 6 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 15, gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: COLORS.navy },
  badgeCount: { backgroundColor: COLORS.soft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 12, fontWeight: 'bold', color: COLORS.navy },

  emptyCard: { margin: 20, padding: 40, backgroundColor: COLORS.soft, borderRadius: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.line },
  emptyText: { color: '#64748b', textAlign: 'center', fontSize: 14, marginTop: 10 },

  missionCard: { margin: 20, marginTop: 0, padding: 20, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: COLORS.line, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  reqId: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold' },
  reqName: { fontSize: 18, fontWeight: '900', color: COLORS.navy },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 9, fontWeight: 'bold' },

  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  locText: { fontSize: 13, color: '#64748b', flex: 1, marginLeft: 6 },

  detailsGrid: { flexDirection: 'row', backgroundColor: COLORS.soft, padding: 12, borderRadius: 12, marginBottom: 20 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 8, color: '#94a3b8', fontWeight: 'bold' },
  detailValue: { fontSize: 14, color: COLORS.navy, fontWeight: '800' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryBtn: { backgroundColor: COLORS.navy },
  primaryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.navy },
  secondaryBtnText: { color: COLORS.navy, fontWeight: 'bold', fontSize: 13 },
  disabledBtn: { opacity: 0.5 },

  aiAssist: { margin: 20, backgroundColor: COLORS.navy, borderRadius: 20, overflow: 'hidden' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', gap: 8 },
  aiTitle: { color: 'white', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  aiBody: { padding: 15 },
  aiReason: { color: 'rgba(255,255,255,0.8)', fontSize: 13, lineHeight: 18 },
  aiAction: { marginTop: 15, backgroundColor: 'white', padding: 12, borderRadius: 10, alignItems: 'center' },
  aiActionText: { color: COLORS.navy, fontWeight: 'bold', fontSize: 12 },

  nearbyFeed: { paddingHorizontal: 20 },
  nearbyCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.line, alignItems: 'center' },
  nearbyLeft: { flex: 1 },
  nearbyCategory: { fontSize: 10, fontWeight: 'bold', color: COLORS.accent, marginBottom: 2 },
  nearbyLocation: { fontSize: 15, fontWeight: 'bold', color: COLORS.navy },
  nearbyDist: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  acceptBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' },

  logoutBtn: { margin: 40, padding: 20, alignItems: 'center' },
  logoutText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },

  // CALLING UI STYLES
  callModal: { flex: 1, backgroundColor: 'rgba(11, 60, 93, 0.95)', justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: width * 0.8 },
  callAvatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  callUser: { fontSize: 24, fontWeight: '900', color: 'white', marginBottom: 8 },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center' },
  callActionRow: { flexDirection: 'row', gap: 40, marginTop: 60 },
  callActionBtn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  hangupBtn: { marginTop: 80, width: 70, height: 70, borderRadius: 35, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  
  // STRATEGIC HUD STYLES (replaces react-native-maps)
  hudPanel: {
    backgroundColor: COLORS.navy,
    margin: 0,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 15,
  },
  hudTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    flex: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hudGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hudCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  hudIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudCount: {
    fontSize: 28,
    fontWeight: '900',
    color: 'white',
  },
  hudLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  hudCenter: {
    flex: 1.2,
    alignItems: 'center',
    gap: 8,
  },
  hudRadarOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudRadarMid: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudRadarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCoord: {
    fontSize: 7,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '900',
    letterSpacing: 1,
  },
});

