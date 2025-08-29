import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default markers in production
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Configure default marker icons
const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create custom icons for start and end markers
const startIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'start-marker'
});

const endIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'end-marker'
});

export default function TripMap({ locations }) {
  if (!locations || locations.length === 0) return <div>Loading map...</div>;

  const path = locations.map(loc => [loc.latitude, loc.longitude]);
  const center = path[0];

  return (
    <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%", borderRadius: "16px" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />
      <Polyline positions={path} color="#4285F4" weight={4} />
      <Marker position={path[0]} icon={startIcon}>
        <Popup>
          <div className="text-center">
            <div className="font-semibold text-green-600">Trip Start</div>
            <div className="text-sm text-gray-600">
              {new Date(locations[0]?.timestamp).toLocaleString()}
            </div>
          </div>
        </Popup>
      </Marker>
      <Marker position={path[path.length - 1]} icon={endIcon}>
        <Popup>
          <div className="text-center">
            <div className="font-semibold text-red-600">Trip End</div>
            <div className="text-sm text-gray-600">
              {new Date(locations[locations.length - 1]?.timestamp).toLocaleString()}
            </div>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
