'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { HelpRequest, Volunteer } from '@/lib/mockData';

// Leaflet must be dynamically imported (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
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
  mini?: boolean;
}

const CAT_COLORS: Record<string, string> = {
  medical: '#dc2626',
  rescue: '#d97706',
  food: '#2563eb',
  water: '#0891b2',
  shelter: '#7c3aed',
};

export default function MapView({ requests, volunteers = [], height = '400px', showHeatmap = false, mini = false }: Props) {
  const center: [number, number] = [13.08, 80.27];

  return (
    <div className="map-container w-full" style={{ height }}>
      <MapContainer
        center={center}
        zoom={mini ? 11 : 12}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={!mini}
        zoomControl={!mini}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* Heatmap circles for demand areas */}
        {showHeatmap && requests.map((r) => (
          <Circle
            key={`heat-${r.id}`}
            center={[r.location.lat, r.location.lng]}
            radius={300}
            pathOptions={{
              color: 'transparent',
              fillColor: r.status === 'pending' ? '#dc2626' : r.status === 'assigned' ? '#d97706' : '#16a34a',
              fillOpacity: 0.15,
            }}
          />
        ))}

        {/* Request markers */}
        {requests.map((r) => (
          <Circle
            key={r.id}
            center={[r.location.lat, r.location.lng]}
            radius={120}
            pathOptions={{
              color: CAT_COLORS[r.category] || '#1a3a6b',
              fillColor: CAT_COLORS[r.category] || '#1a3a6b',
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            {!mini && (
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{r.id} – {r.name}</div>
                  <div className="capitalize">{r.category} | {r.status}</div>
                  <div>{r.familySize} members</div>
                  <div className="text-gray-500 text-xs">{r.location.address}</div>
                </div>
              </Popup>
            )}
          </Circle>
        ))}

        {/* Volunteer markers */}
        {volunteers.map((v) => (
          <Circle
            key={v.id}
            center={[v.location.lat, v.location.lng]}
            radius={80}
            pathOptions={{
              color: '#16a34a',
              fillColor: '#22c55e',
              fillOpacity: 0.8,
              weight: 2,
            }}
          >
            {!mini && (
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{v.name}</div>
                  <div>{v.skills.join(', ')}</div>
                  <div className="capitalize">Status: {v.status}</div>
                </div>
              </Popup>
            )}
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
