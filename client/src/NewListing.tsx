import { useState } from 'react';
import { CalendarDays, MapPin, Send, Info } from 'lucide-react';
import MapView from './MapView';
import { api } from './api';

const local = (minutes: number) => {
  const d = new Date(Date.now() + minutes * 60000);
  return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function NewListing({
  organizerId,
  onCreated
}: {
  organizerId: string;
  onCreated: (listing: any) => void;
}) {
  const [location, setLocation] = useState({
    lat: 28.592,
    lng: 77.046,
    address: 'Sample event venue, Dwarka, New Delhi'
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const f = new FormData(e.currentTarget);
    try {
      const preparedStr = String(f.get('preparedAt') || '');
      const startStr = String(f.get('pickupWindowStart') || '');
      const endStr = String(f.get('pickupWindowEnd') || '');

      const preparedDate = new Date(preparedStr);
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      if (isNaN(preparedDate.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Please enter valid dates for preparation time and pickup window.');
      }

      const listing = await api('/listings', {
        organizerId,
        eventName: String(f.get('eventName') || '').trim(),
        eventType: String(f.get('eventType') || 'Wedding'),
        location,
        foodItems: [
          {
            name: String(f.get('foodItems') || '').trim(),
            dietType: f.get('dietType') === 'non-veg' ? 'non-veg' : 'veg',
            category: 'Prepared meal'
          }
        ],
        quantityMeals: Number(f.get('quantityMeals')),
        ...(f.get('quantityKg') && Number(f.get('quantityKg')) > 0
          ? { quantityKg: Number(f.get('quantityKg')) }
          : {}),
        preparedAt: preparedDate.toISOString(),
        holdingCondition: String(f.get('holdingCondition') || 'hot-held'),
        packagingAvailable: f.get('packagingAvailable') === 'on',
        pickupWindowStart: startDate.toISOString(),
        pickupWindowEnd: endDate.toISOString(),
        notes: String(f.get('notes') || '').trim()
      });

      onCreated(listing);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">ORGANIZER WORKSPACE</p>
        <h1>New Listing</h1>
        <p>Share surplus food from your event.</p>
      </div>

      <form onSubmit={submit} className="form-layout">
        <section className="card form-card">
          <h2>
            <CalendarDays />
            Event details
          </h2>

          <div className="form-grid">
            <label className="wide">
              Event name <span>*</span>
              <input
                name="eventName"
                required
                defaultValue="Sample Wedding Reception"
                maxLength={150}
                placeholder="e.g. Sharma-Verma Wedding Reception"
              />
            </label>

            <label>
              Event type <span>*</span>
              <select name="eventType" defaultValue="Wedding">
                <option value="Wedding">Wedding</option>
                <option value="Banquet">Banquet</option>
                <option value="Bhandara">Bhandara</option>
                <option value="Langar">Langar</option>
                <option value="Concert">Concert</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Location preset
              <select
                onChange={e => {
                  const west = e.target.value === 'dwarka';
                  setLocation({
                    lat: west ? 28.592 : 28.63,
                    lng: west ? 77.046 : 77.119,
                    address: west
                      ? 'Sample event venue, Dwarka, New Delhi'
                      : 'Sample event venue, Rajouri Garden, West Delhi'
                  });
                }}
              >
                <option value="dwarka">Dwarka, New Delhi</option>
                <option value="west">West Delhi</option>
              </select>
            </label>

            <label className="wide">
              Location <span>*</span>
              <input
                required
                value={location.address}
                onChange={e => setLocation({ ...location, address: e.target.value })}
                placeholder="Full venue address"
              />
            </label>

            <label className="wide">
              Food items <span>*</span>
              <input
                name="foodItems"
                required
                defaultValue="Veg pulao · Dal makhani · Paneer butter masala · Roti"
                placeholder="List dishes (e.g. Pulao, Dal, Paneer, Roti)"
              />
            </label>

            <label>
              Diet type <span>*</span>
              <select name="dietType" defaultValue="veg">
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-vegetarian</option>
              </select>
            </label>

            <label>
              Quantity (meals) <span>*</span>
              <input
                name="quantityMeals"
                type="number"
                required
                min="1"
                max="100000"
                defaultValue="40"
              />
            </label>

            <label>
              Approx. weight (optional) (kg)
              <input
                name="quantityKg"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue="18"
                placeholder="e.g. 18"
              />
            </label>

            <label>
              Prepared at <span>*</span>
              <input name="preparedAt" type="datetime-local" required defaultValue={local(-60)} />
            </label>

            <label className="wide">
              Holding condition <span>*</span>
              <select name="holdingCondition" defaultValue="hot-held">
                <option value="hot-held">Hot-held (safe limit ~4h)</option>
                <option value="refrigerated">Refrigerated (safe limit ~8h)</option>
                <option value="room-temperature">Room-temperature (safe limit ~2h)</option>
                <option value="packaged-sealed">Packaged-sealed (safe limit ~6h)</option>
              </select>
            </label>

            <label>
              Pickup window start <span>*</span>
              <input name="pickupWindowStart" type="datetime-local" required defaultValue={local(0)} />
            </label>

            <label>
              Pickup window end <span>*</span>
              <input name="pickupWindowEnd" type="datetime-local" required defaultValue={local(120)} />
            </label>

            <label className="checkbox wide">
              <input name="packagingAvailable" type="checkbox" defaultChecked />
              Yes, packed and ready for pickup
            </label>

            <label className="wide">
              Notes (optional)
              <textarea
                name="notes"
                defaultValue="Packed in sealed containers"
                rows={2}
                placeholder="Any access directions or packing details"
              />
            </label>
          </div>

          <p className="notice amber">
            <Info size={19} />
            A donor-entered deadline does not prove food safety. Eligibility follows configured safety rules.
          </p>
          <p className="fine-print">
            Demo configuration — not food-safety guidance. Real thresholds must follow FSSAI/local food-safety rules.
          </p>

          {error && (
            <p role="alert" className="notice red">
              {error}
            </p>
          )}

          <button className="button full" disabled={busy}>
            <Send size={18} />
            {busy ? 'Checking eligibility…' : 'Check eligibility & post'}
          </button>
        </section>

        <section className="card location-card">
          <h2>
            <MapPin />
            Event location
          </h2>
          <p className="muted">Choose a preset or click the map to set your venue.</p>
          <MapView location={location} onPick={setLocation} showLegend={false} />
        </section>
      </form>
    </>
  );
}
