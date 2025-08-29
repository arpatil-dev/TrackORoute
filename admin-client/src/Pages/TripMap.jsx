import React from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
      <Marker position={path[0]}><Popup>Start</Popup></Marker>
      <Marker position={path[path.length - 1]}><Popup>End</Popup></Marker>
    </MapContainer>
  );
}
