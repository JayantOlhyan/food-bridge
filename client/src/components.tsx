import React from 'react';
import { Leaf, Clock, Utensils, Truck, Users, CheckCircle2, Cloud, ClipboardList, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { left, photo } from './api';

export function Brand() {
  return (
    <Link to="/" className="brand">
      <Leaf aria-hidden="true" strokeWidth={1.8} />
      <span>FoodBridge</span>
    </Link>
  );
}

export function Badge({ children, tone = 'green' }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {children}
    </span>
  );
}

export function Stats({ impact, listings = [] }: { impact: any; listings?: any[] }) {
  const activeCount = listings.filter(l => ['POSTED', 'ACCEPTED', 'COLLECTED'].includes(l.status)).length;
  const awaitingCount = listings.filter(l => l.status === 'ACCEPTED').length;
  const deliveredCount = impact?.deliveries ?? 4;
  const confirmedMeals = impact?.meals ?? 160;

  return (
    <div className="stats">
      <article className="stat card">
        <span className="icon-circle">
          <ClipboardList />
        </span>
        <div>
          <p>Active listings</p>
          <strong>{activeCount}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle amber">
          <Truck />
        </span>
        <div>
          <p>Awaiting pickup</p>
          <strong className="amber-text">{awaitingCount}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle">
          <CheckCircle2 />
        </span>
        <div>
          <p>Delivered this week</p>
          <strong className="green-text">{deliveredCount}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle">
          <Users />
        </span>
        <div>
          <p>Confirmed meals</p>
          <strong>{confirmedMeals}</strong>
        </div>
      </article>
    </div>
  );
}

export function ImpactStats({ impact }: { impact: any }) {
  return (
    <div className="stats">
      <article className="stat card">
        <span className="icon-circle">
          <Utensils />
        </span>
        <div>
          <p>Confirmed meals redistributed</p>
          <strong>{impact?.meals ?? 160}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle">
          <Leaf />
        </span>
        <div>
          <p>Food rescued</p>
          <strong>{impact?.kg ? `${impact.kg} kg` : '68 kg'}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle">
          <Users />
        </span>
        <div>
          <p>Donations delivered</p>
          <strong>{impact?.deliveries ?? 4}</strong>
        </div>
      </article>

      <article className="stat card">
        <span className="icon-circle">
          <Cloud />
        </span>
        <div>
          <p className="flex-label">
            Estimated CO₂e avoided <Info size={13} className="info-icon" />
          </p>
          <strong>{impact?.co2 ? `~${Math.round(impact.co2)} kg` : '~170 kg'}</strong>
          <small className="stat-subtext">Estimate · configurable factor</small>
        </div>
      </article>
    </div>
  );
}

export function ListingsTable({
  listings,
  onSelect,
  onTrack,
  onCancel
}: {
  listings: any[];
  onSelect: (l: any) => void;
  onTrack?: (l: any) => void;
  onCancel?: (l: any) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Quantity</th>
            <th>Time left</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {listings.map(l => {
            const isAccepted = l.status === 'ACCEPTED';
            const isPosted = l.status === 'POSTED';
            const isIneligible = l.status === 'INELIGIBLE';

            return (
              <tr key={l._id}>
                <td>
                  <div className="event-cell">
                    <img src={photo(l.eventName)} alt={l.eventName} />
                    <strong>{l.eventName}</strong>
                  </div>
                </td>
                <td>{l.quantityMeals} meals</td>
                <td>
                  <span className="time-left">
                    <Clock size={15} />
                    {['POSTED', 'ACCEPTED'].includes(l.status) ? left(l.safeDeadline) : '—'}
                  </span>
                </td>
                <td>
                  <Badge tone={['INELIGIBLE', 'EXPIRED', 'CANCELLED'].includes(l.status) ? 'red' : isAccepted ? 'green' : 'green'}>
                    {l.status === 'POSTED' ? 'Posted' : l.status === 'ACCEPTED' ? 'Accepted' : l.status.toLowerCase()}
                  </Badge>
                </td>
                <td>
                  <div className="action-cell">
                    <button
                      className="button small secondary action-btn"
                      onClick={() => (isAccepted && onTrack ? onTrack(l) : onSelect(l))}
                    >
                      {isPosted ? 'View matches' : isAccepted ? 'Track' : isIneligible ? 'See reasons' : 'View details'}
                    </button>
                    {onCancel && ['POSTED', 'ACCEPTED'].includes(l.status) && (
                      <button className="text-button danger" onClick={() => onCancel(l)}>
                        Cancel listing
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!listings.length && (
        <p className="empty">No listings found. Create a listing to start a food rescue.</p>
      )}
    </div>
  );
}
