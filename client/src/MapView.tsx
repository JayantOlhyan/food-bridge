import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type Location = { lat: number; lng: number; address: string };

function Picker({ onPick }: { onPick: (location: Location) => void }) {
  useMapEvents({
    click: e => onPick({ lat: e.latlng.lat, lng: e.latlng.lng, address: 'Selected event location, New Delhi' })
  });
  return null;
}

export default function MapView({
  location,
  ngos = [],
  onPick,
  showLegend = true
}: {
  location: Location;
  ngos?: any[];
  onPick?: (location: Location) => void;
  showLegend?: boolean;
}) {
  const primaryNgo = ngos[0];

  return (
    <div className="map-view-container">
      <div className="map-wrap">
        <MapContainer
          key={`${location.lat.toFixed(3)}-${location.lng.toFixed(3)}-${ngos.length}`}
          center={[location.lat, location.lng]}
          zoom={12}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Event Venue Marker */}
          <CircleMarker
            center={[location.lat, location.lng]}
            radius={12}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1b4d32', fillOpacity: 1 }}
          >
            <Popup>
              <strong>Event venue</strong>
              <br />
              {location.address}
            </Popup>
          </CircleMarker>

          {/* NGO Markers */}
          {ngos.map((n, i) => {
            const isFull = n.matchType === 'Full match' || i === 0;
            const isPartial = n.matchType === 'Partial' || i === 1;
            const color = isFull ? '#2e7d32' : isPartial ? '#1e6bb8' : '#757575';

            return (
              <CircleMarker
                key={n._id || i}
                center={[n.location.lat, n.location.lng]}
                radius={10}
                pathOptions={{ color: '#ffffff', weight: 2.5, fillColor: color, fillOpacity: 1 }}
              >
                <Popup>
                  <strong>
                    {i + 1}. {n.name}
                  </strong>
                  <br />
                  {n.location.address || 'Delhi'}
                  {n.matchType && ` · ${n.matchType}`}
                </Popup>
              </CircleMarker>
            );
          })}

          {/* Route polyline between venue and top-ranked feasible NGO */}
          {primaryNgo && (
            <Polyline
              positions={[
                [location.lat, location.lng],
                [primaryNgo.location.lat, primaryNgo.location.lng]
              ]}
              pathOptions={{ color: '#1f593b', dashArray: '6 6', weight: 3 }}
            />
          )}

          {onPick && <Picker onPick={onPick} />}
        </MapContainer>
        <span className="map-note">Mock Delhi coordinates · Estimated travel</span>
      </div>

      {showLegend && ngos.length > 0 && (
        <div className="map-legend">
          <span>
            <i className="legend-dot venue" /> Event venue
          </span>
          <span>
            <i className="legend-dot full" /> 1 NGO (full match)
          </span>
          <span>
            <i className="legend-dot partial" /> 2 NGO (partial)
          </span>
          <span>
            <i className="legend-dot excluded" /> 3 NGO (excluded)
          </span>
        </div>
      )}
    </div>
  );
}
