'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { HelpRequest, Volunteer } from '@/lib/mockData';
import { clusterNearbyRequests, priorityLevel } from '@/lib/aiLogic';
import { JHARKHAND_CENTER } from '@/lib/mockData';

// Leaflet must be dynamically imported (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
);
const Circle = dynamic(
  () => import('react-leaflet').then((m) => m.Circle),
  { ssr: false }
);

interface Props {
  requests: HelpRequest[];
  volunteers?: Volunteer[];
  height?: string;
  showHeatmap?: boolean;
  showClusters?: boolean;
}

const PRIORITY_COLORS: Record<'high' | 'medium' | 'low', string> = {
  high: '#c62828',
  medium: '#f9a825',
  low: '#2e7d32',
};

export default function MapView({ requests, volunteers = [], height = '400px', showHeatmap = false, showClusters = true }: Props) {
  const clusters = useMemo(() => clusterNearbyRequests(requests), [requests]);

  return (
    <div className="map-container w-full" style={{ height }}>
      <MapContainer
        center={JHARKHAND_CENTER}
        zoom={8}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution='&copy; Esri World Imagery'
        />

        {showHeatmap && requests.map((r) => {
          const level = priorityLevel(r.priority);
          return (
          <Circle
            key={`heat-${r.id}`}
            center={[r.lat, r.lng]}
            radius={600}
            pathOptions={{
              color: 'transparent',
              fillColor: PRIORITY_COLORS[level],
              fillOpacity: 0.2,
            }}
          />
        );})}

        {requests.map((r) => (
          <Circle
            key={r.id}
            center={[r.lat, r.lng]}
            radius={220}
            pathOptions={{
              color: PRIORITY_COLORS[priorityLevel(r.priority)],
              fillColor: PRIORITY_COLORS[priorityLevel(r.priority)],
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{r.id} - {r.name}</div>
                <div className="capitalize">{r.category} | {r.status}</div>
                <div>{r.people} people</div>
                <div className="text-gray-500 text-xs">{r.location}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {showClusters && clusters.map((cluster) => (
          <Circle
            key={cluster.id}
            center={[cluster.lat, cluster.lng]}
            radius={900}
            pathOptions={{
              color: '#0b3c5d',
              fillColor: '#0b3c5d',
              fillOpacity: 0.15,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">Request Cluster</div>
                <div>Total: {cluster.count}</div>
                <div className="text-red-700">High: {cluster.high}</div>
                <div className="text-yellow-700">Medium: {cluster.medium}</div>
                <div className="text-green-700">Low: {cluster.low}</div>
              </div>
            </Popup>
          </Circle>
        ))}

        {volunteers.map((v) => (
          <Circle
            key={v.id}
            center={[v.lat, v.lng]}
            radius={140}
            pathOptions={{
              color: '#0b3c5d',
              fillColor: '#0b3c5d',
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{v.name}</div>
                <div>{v.skills.join(', ')}</div>
                <div className="capitalize">Status: {v.availability}</div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
