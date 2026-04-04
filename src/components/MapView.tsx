'use client';

import dynamic from 'next/dynamic';
import { Fragment, useEffect, useMemo, useState } from 'react';
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
const CircleMarker = dynamic(
  () => import('react-leaflet').then((m) => m.CircleMarker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((m) => m.Polyline),
  { ssr: false }
);
const Polygon = dynamic(
  () => import('react-leaflet').then((m) => m.Polygon),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((m) => m.Tooltip),
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

const DISTRICT_ZONES: Array<{ name: string; points: [number, number][]; center: [number, number] }> = [
  {
    name: 'Dhanbad Zone A',
    points: [[23.93, 86.28], [23.92, 86.47], [23.78, 86.5], [23.7, 86.33], [23.78, 86.22]],
    center: [23.84, 86.36],
  },
  {
    name: 'Dhanbad Zone B',
    points: [[23.81, 86.2], [23.79, 86.36], [23.67, 86.37], [23.63, 86.22], [23.71, 86.13]],
    center: [23.73, 86.26],
  },
  {
    name: 'Dhanbad Zone C',
    points: [[23.69, 86.38], [23.69, 86.55], [23.55, 86.57], [23.5, 86.4], [23.56, 86.3]],
    center: [23.61, 86.46],
  },
];

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function haversineKm(a: [number, number], b: [number, number]) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
}

export default function MapView({ requests, volunteers = [], height = '400px', showHeatmap = false, showClusters = true }: Props) {
  const [tick, setTick] = useState(0);
  const clusters = useMemo(() => clusterNearbyRequests(requests), [requests]);
  const routePairs = useMemo(() => {
    return requests
      .filter((request) => request.assignedVolunteerId && request.status !== 'completed')
      .map((request) => ({
        request,
        volunteer: volunteers.find((vol) => vol.id === request.assignedVolunteerId) ?? null,
      }))
      .filter((pair): pair is { request: HelpRequest; volunteer: Volunteer } => Boolean(pair.volunteer));
  }, [requests, volunteers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1800);
    return () => window.clearInterval(timer);
  }, []);

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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {DISTRICT_ZONES.map((zone) => (
          <Polygon
            key={zone.name}
            positions={zone.points}
            pathOptions={{ color: '#1e40af', weight: 1.5, fillOpacity: 0.03 }}
          >
            <Tooltip permanent direction="center" opacity={0.85}>
              {zone.name}
            </Tooltip>
          </Polygon>
        ))}

        {showHeatmap && requests.map((r) => {
          const level = r.status === 'completed' ? 'low' : priorityLevel(r.priority);
          return (
          <Circle
            key={`heat-${r.id}`}
            center={[r.lat, r.lng]}
            radius={950}
            pathOptions={{
              color: 'transparent',
              fillColor: PRIORITY_COLORS[level],
              fillOpacity: 0.32,
            }}
          />
        );})}

        {requests.map((r) => {
          const statusColor = r.status === 'completed' ? PRIORITY_COLORS.low : PRIORITY_COLORS[priorityLevel(r.priority)];
          return (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={7}
            pathOptions={{
              color: statusColor,
              fillColor: statusColor,
              fillOpacity: r.status === 'completed' ? 0.55 : 0.85,
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
          </CircleMarker>
        );})}

        {routePairs.map(({ request, volunteer }) => {
          const from: [number, number] = [volunteer.lat, volunteer.lng];
          const to: [number, number] = [request.lat, request.lng];
          const distKm = haversineKm(from, to);
          const eta = request.eta ?? `${Math.max(12, Math.round(distKm * 8))} mins`;
          const mid = midpoint(from, to);

          return (
            <Fragment key={`route-wrap-${request.id}`}>
              <Polyline
                key={`route-${request.id}`}
                positions={[from, to]}
                pathOptions={{
                  color: '#1d4ed8',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: `${10 + (tick % 2) * 4} ${8 + (tick % 2) * 3}`,
                }}
              />
              <CircleMarker key={`route-mid-${request.id}`} center={mid} radius={4} pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1 }}>
                <Tooltip permanent direction="top" opacity={0.95}>
                  {distKm.toFixed(1)} km | ETA {eta}
                </Tooltip>
              </CircleMarker>
            </Fragment>
          );
        })}

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
                <div>{cluster.count} requests in this zone</div>
                <div className="text-red-700">High: {cluster.high}</div>
                <div className="text-yellow-700">Medium: {cluster.medium}</div>
                <div className="text-green-700">Low: {cluster.low}</div>
              </div>
            </Popup>
            <Tooltip permanent direction="center" opacity={0.8}>
              {cluster.count} requests
            </Tooltip>
          </Circle>
        ))}

        {volunteers.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={6}
            pathOptions={{
              color: '#0b3c5d',
              fillColor: '#0b3c5d',
              fillOpacity: 0.95,
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
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
