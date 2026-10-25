import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  ClipboardList,
  Users,
  Truck,
  ChartNoAxesColumn,
  Bell,
  RotateCcw,
  FlaskConical,
  Menu,
  X,
  ArrowRight,
  MapPin,
  Clock,
  Check,
  Utensils,
  Leaf,
  ShieldCheck,
  Building2,
  AlertTriangle,
  MinusCircle,
  Calendar,
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { api, left, time, photo, relativeTime } from './api';
import { Brand, Badge, Stats, ImpactStats, ListingsTable } from './components';
import MapView from './MapView';
import NewListing from './NewListing';

export default function App() {
  const navigate = useNavigate();
  const route = useLocation();
  const params = useParams();

  const [boot, setBoot] = useState<any>(null);
  const [role, setRole] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/available')) {
      return 'ngo';
    }
    return 'organizer';
  });
  const [listings, setListings] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [impact, setImpact] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [busy, setBusy] = useState(false);
  const [delivery, setDelivery] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [declined, setDeclined] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(true);

  const organizer = role === 'organizer';
  const screen = route.pathname.split('/')[2] || 'dashboard';
  const ngoAccount = boot && (boot.ngos.find((n: any) => n._id === role) || boot.ngos[0]);
  const account = boot && (organizer ? boot.organizers[0] : ngoAccount);

  const refresh = useCallback(async () => {
    if (!boot || !account) return;
    try {
      const query = organizer ? `organizerId=${account._id}` : `ngoId=${account._id}`;
      const [l, p, i, n] = await Promise.all([
        api(organizer ? `/listings?${query}` : `/ngo/${account._id}/feed`),
        api(`/pickups?${query}`),
        api(`/impact?${query}`),
        api(`/notifications?recipientId=${account._id}`)
      ]);
      setListings(l);
      setPickups(p);
      setImpact(i);
      setNotifications(n);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [boot, account, organizer]);

  useEffect(() => {
    api('/bootstrap')
      .then(setBoot)
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (boot && screen === 'available' && (role === 'organizer' || role === 'ngo')) {
      const defaultNgo = boot.ngos[0]?._id;
      if (defaultNgo && role !== defaultNgo) {
        setRole(defaultNgo);
      }
    }
  }, [boot, screen, role]);

  useEffect(() => {
    if (params.id) {
      api(`/listings/${params.id}`)
        .then(setSelected)
        .catch(e => setError(e.message));
      api(`/listings/${params.id}/matches`)
        .then(setMatches)
        .catch(e => setError(e.message));
    }
  }, [params.id]);

  async function action(path: string, body: unknown = {}) {
    setBusy(true);
    setError('');
    try {
      const result = await api(path, body);
      await refresh();
      return result;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function select(l: any) {
    setSelected(l);
    navigate(`/app/matches/${l._id}`);
  }

  if (!boot) {
    return (
      <main className="loading">
        <Brand />
        <p role="status">{error || 'Connecting to the food rescue network…'}</p>
        {error && (
          <button className="button" onClick={() => window.location.reload()}>
            Retry connection
          </button>
        )}
      </main>
    );
  }

  const orgNav = [
    ['dashboard', 'Dashboard', Home],
    ['new', 'New Listing', PlusCircle],
    ['listings', 'My Listings', ClipboardList],
    ['matches', 'Matches', Users],
    ['pickups', 'Pickups', Truck],
    ['impact', 'Impact', ChartNoAxesColumn]
  ] as const;

  const ngoNav = [
    ['available', 'Available Food', Utensils],
    ['pickups', 'My Pickups', Truck],
    ['impact', 'Impact', ChartNoAxesColumn]
  ] as const;

  const nav = organizer ? orgNav : ngoNav;
  const title =
    screen === 'dashboard'
      ? 'Dashboard'
      : screen === 'listings'
        ? 'My Listings'
        : screen === 'available'
          ? 'Available Food'
          : screen === 'pickups'
            ? organizer
              ? 'Pickups'
              : 'My Pickups'
            : 'Impact';

  return (
    <div className="app-shell">
      {/* Left Sidebar */}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Brand />
        <button
          className="icon-button mobile close-nav"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        >
          <X />
        </button>

        <nav aria-label="Main navigation">
          {nav.map(([path, label, Icon]) => (
            <Link
              key={path}
              to={`/app/${path}`}
              onClick={() => setMenu(false)}
              className={screen === path ? 'active' : ''}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <ShieldCheck size={24} />
          <div>
            <strong>Every meal matters.</strong>
            <p>Rescue with care.</p>
          </div>
        </div>

        <Link className="back-site" to="/">
          ← Back to website
        </Link>
      </aside>

      {menu && <div className="nav-scrim" onClick={() => setMenu(false)} />}

      <div className="app-body">
        {/* Top Header Bar */}
        <header className="topbar">
          <button
            className="icon-button mobile"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </button>

          <span className="topbar-label">Surplus Food Rescue Network</span>

          <div className="topbar-actions">
            <span className="demo-badge">
              <FlaskConical size={15} />
              Demo mode
            </span>

            <div className="role-selector-wrap">
              <Building2 size={16} className="role-icon" />
              <label className="sr-only" htmlFor="role">
                Demo login role
              </label>
              <select
                id="role"
                value={role}
                onChange={e => {
                  setRole(e.target.value);
                  setSelected(null);
                  setDeclined([]);
                  setListings([]);
                  navigate(e.target.value === 'organizer' ? '/app/dashboard' : '/app/available');
                }}
              >
                <option value="organizer">Organiser: Sample Wedding Caterer</option>
                {boot.ngos.map((n: any) => (
                  <option value={n._id} key={n._id}>
                    NGO: {n.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="icon-button bell"
              aria-label="Show simulated alerts"
              aria-expanded={bell}
              onClick={() => setBell(!bell)}
            >
              <Bell size={21} />
              {notifications.some(n => !n.read) && <i />}
            </button>

            {boot.demoMode && (
              <button
                disabled={busy}
                className="reset"
                onClick={async () => {
                  if (await action('/demo/reset')) {
                    setBoot(await api('/bootstrap'));
                    setRole('organizer');
                    navigate('/app');
                  }
                }}
              >
                <RotateCcw size={16} />
                <span>Reset demo</span>
              </button>
            )}
          </div>

          {bell && (
            <section className="notification-pop card">
              <div className="notif-header">
                <h3>Simulated alerts</h3>
                <span className="tiny-label">Real-time</span>
              </div>
              {notifications.length ? (
                notifications.map(n => (
                  <button
                    key={n._id}
                    onClick={() => void action(`/notifications/${n._id}/read`)}
                    className="notification-item"
                  >
                    <span className={`notif-icon ${n.message.includes('failed') ? 'red' : 'green'}`}>
                      <Bell size={16} />
                    </span>
                    <div>
                      <strong>{n.message.replace('. Simulated alert.', '')}</strong>
                      <p>{relativeTime(n.createdAt)}</p>
                      <small>{n.read ? 'Read' : 'Click to mark read'}</small>
                    </div>
                  </button>
                ))
              ) : (
                <p className="empty-notif">No alerts for this demo account yet.</p>
              )}
            </section>
          )}
        </header>

        {/* Main Workspace Area */}
        <main className="app-main">
          {error && (
            <div className="notice red" role="alert">
              {error}
              <button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* SCREEN: NEW LISTING */}
          {screen === 'new' && organizer ? (
            <NewListing
              organizerId={account._id}
              onCreated={l => {
                void refresh();
                select(l);
              }}
            />
          ) : screen === 'matches' && organizer ? (
            /* SCREEN: MATCHES */
            <>
              <div className="page-heading heading-row">
                <div>
                  <p className="eyebrow">SAFETY-FIRST MATCHING</p>
                  <h1 className="compact-title">
                    Matches{selected ? ` · ${selected.eventName}` : ''}
                  </h1>
                  <p>Feasibility comes first. Every recommendation has a reason.</p>
                </div>
                {selected && (
                  <button
                    className="button secondary small back-btn"
                    onClick={() => navigate('/app/listings')}
                  >
                    <ChevronLeft size={16} /> Back to listings
                  </button>
                )}
              </div>

              {selected ? (
                <>
                  <div
                    className={`eligibility-banner ${
                      selected.eligibility.eligible && selected.status !== 'EXPIRED'
                        ? ''
                        : 'ineligible'
                    }`}
                  >
                    <div className="eligibility-icon-circle">
                      {selected.eligibility.eligible && selected.status !== 'EXPIRED' ? (
                        <Check size={28} />
                      ) : (
                        <AlertTriangle size={28} />
                      )}
                    </div>
                    <div>
                      <h3>
                        {selected.eligibility.eligible && selected.status !== 'EXPIRED'
                          ? 'Eligible for rescue'
                          : 'Not available for rescue'}
                        <span>
                          {' '}
                          — Safe collection deadline {time(selected.safeDeadline)} ·{' '}
                          {left(selected.safeDeadline)}
                        </span>
                      </h3>
                      <p>
                        {selected.status === 'EXPIRED'
                          ? 'Collection deadline has expired.'
                          : selected.eligibility.reasons.join(' · ')}
                      </p>
                    </div>
                  </div>

                  <div className="matches-layout">
                    {/* Left Column: Ranked NGOs */}
                    <section className="card matches-card">
                      <div className="matches-card-header">
                        <h2>
                          <Users />
                          Ranked NGOs
                        </h2>
                        <span className="tiny-label">Feasibility First</span>
                      </div>
                      <p className="muted">Showing safety-eligible, feasible matches first</p>

                      <div className="matches-list">
                        {matches.map((m, idx) => {
                          const isFull = m.matchType === 'Full match';
                          const isPartial = m.matchType === 'Partial';
                          const ngoInitials =
                            m.ngo.name
                              .split('–')[1]
                              ?.trim()
                              .split(' ')
                              .map((s: string) => s[0])
                              .join('') || `N${idx + 1}`;

                          return (
                            <article
                              key={m.ngoId}
                              className={`match-card ${
                                isPartial ? 'partial' : !m.feasible ? 'excluded' : 'full'
                              }`}
                            >
                              <div className="match-top">
                                <span className={`avatar ${isFull ? 'green' : isPartial ? 'amber' : 'grey'}`}>
                                  {ngoInitials}
                                </span>
                                <div className="match-info">
                                  <h3>{m.ngo.name}</h3>
                                  <p>{m.ngo.location.address || 'New Delhi'}</p>
                                  <div className="match-meta">
                                    <span>
                                      <MapPin size={13} />
                                      {m.distanceKm.toFixed(1)} km
                                    </span>
                                    <span>
                                      <Truck size={13} />
                                      ETA {m.etaMinutes} min
                                    </span>
                                    <span>
                                      <Users size={13} />
                                      Capacity {m.ngo.remainingCapacityMeals} meals
                                    </span>
                                  </div>
                                </div>
                                <div className="score">
                                  <Badge tone={isPartial ? 'amber' : !m.feasible ? 'red' : 'green'}>
                                    {m.matchType}
                                  </Badge>
                                  {isFull && (
                                    <>
                                      <small>Score</small>
                                      <strong>{m.score || 91}</strong>
                                    </>
                                  )}
                                  {isPartial && (
                                    <>
                                      <small>Score</small>
                                      <strong className="amber-score">64</strong>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="match-reasons">
                                {m.reasons.map((r: string, rIdx: number) => (
                                  <p key={rIdx}>
                                    {r.startsWith('Excluded') ? (
                                      <MinusCircle size={15} className="red-icon" />
                                    ) : isPartial ? (
                                      <AlertTriangle size={15} className="amber-icon" />
                                    ) : (
                                      <Check size={15} className="green-icon" />
                                    )}
                                    {r}
                                  </p>
                                ))}
                              </div>

                              <div className="match-card-actions">
                                {isFull && selected.status === 'POSTED' ? (
                                  <button
                                    className="button small full-btn"
                                    onClick={() => {
                                      setRole(m.ngoId);
                                      navigate('/app/available');
                                    }}
                                  >
                                    <Truck size={14} /> Send pickup request / Switch to NGO
                                  </button>
                                ) : (
                                  <button className="button secondary small">View details</button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>

                    {/* Right Column: Leaflet Map */}
                    <section className="card map-card">
                      <div className="map-card-header">
                        <h2>
                          <MapPin />
                          Locations on Map
                        </h2>
                        <span className="tiny-label">
                          View larger <ExternalLink size={12} />
                        </span>
                      </div>
                      <MapView location={selected.location} ngos={matches.map(m => m.ngo)} />
                      <p className="fine-print">
                        Matching considers safety, time margin, distance, and capacity — not just
                        proximity. Travel uses mock Delhi coordinates with an 8-min buffer.
                      </p>
                    </section>
                  </div>
                </>
              ) : (
                <section className="card">
                  <h2>Choose a listing to view matches</h2>
                  <ListingsTable listings={listings} onSelect={select} />
                </section>
              )}
            </>
          ) : (
            /* DEFAULT SCREEN SWITCHER: Dashboard, My Listings, Available Food, Pickups, Impact */
            <>
              <div className="page-heading heading-row">
                <div>
                  <p className="eyebrow">{organizer ? 'ORGANIZER WORKSPACE' : 'NGO WORKSPACE'}</p>
                  <h1>{title}</h1>
                  <p>
                    {screen === 'dashboard'
                      ? "Good afternoon. Here's what's happening with your listings."
                      : screen === 'impact'
                        ? 'Confirmed outcomes from delivered pickups.'
                        : screen === 'available'
                          ? 'Feasible listings near you, sorted by urgency.'
                          : screen === 'pickups'
                            ? 'Track the collection and delivery of your surplus food.'
                            : 'Manage your surplus food and follow every rescue.'}
                  </p>
                </div>
                {organizer && screen !== 'impact' && (
                  <Link className="button" to="/app/new">
                    <PlusCircle size={18} />
                    New Listing
                  </Link>
                )}
                {screen === 'impact' && <Badge tone="neutral">Demo data</Badge>}
              </div>

              {/* SCREEN: DASHBOARD */}
              {screen === 'dashboard' && (
                <>
                  <Stats impact={impact} listings={listings} />
                  <p className="demo-caption">Demo data · Updates live every 5 seconds</p>

                  <div className="dashboard-grid">
                    <section className="card">
                      <div className="card-heading">
                        <h2>
                          <ClipboardList />
                          Active listings
                        </h2>
                        <Link to="/app/listings" className="button secondary small">
                          View all <ArrowRight size={14} />
                        </Link>
                      </div>
                      <ListingsTable
                        listings={listings
                          .filter(l => !['DELIVERED', 'CANCELLED'].includes(l.status))
                          .slice(0, 4)}
                        onSelect={select}
                        onTrack={() => navigate('/app/pickups')}
                      />
                    </section>

                    <section className="card">
                      <div className="card-heading">
                        <h2>
                          <Bell />
                          Recent alerts
                        </h2>
                        <span className="tiny-label">Simulated</span>
                      </div>

                      <div className="alert-list">
                        {notifications.slice(0, 3).map(n => {
                          const isAccept = n.message.includes('accepted');
                          const isFail = n.message.includes('failed') || n.message.includes('ineligible');

                          return (
                            <div className="alert-row" key={n._id}>
                              <span className={`icon-circle small ${isFail ? 'red' : isAccept ? 'green' : 'amber'}`}>
                                {isFail ? <AlertTriangle size={18} /> : isAccept ? <Users size={18} /> : <ClipboardList size={18} />}
                              </span>
                              <div className="alert-text">
                                <strong>{n.message.replace('. Simulated alert.', '')}</strong>
                                <p>{relativeTime(n.createdAt)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="tip">
                        <Leaf />
                        <h3>
                          A little surplus.
                          <br />A meaningful difference.
                        </h3>
                        <p>Post what you have. Find a feasible match. Follow the food all the way.</p>
                        <Link to="/app/new">
                          Create a listing <ArrowRight size={15} />
                        </Link>
                      </div>
                    </section>
                  </div>
                </>
              )}

              {/* SCREEN: MY LISTINGS */}
              {screen === 'listings' && (
                <section className="card">
                  <ListingsTable
                    listings={listings}
                    onSelect={select}
                    onTrack={() => navigate('/app/pickups')}
                    onCancel={l => void action(`/listings/${l._id}/cancel`)}
                  />
                </section>
              )}

              {/* SCREEN: AVAILABLE FOOD (NGO) */}
              {screen === 'available' && (
                <>
                  <div className="available-header-row">
                    <div className="capacity">
                      <Users />
                      Remaining capacity today: <strong>{account.remainingCapacityMeals} meals</strong>
                      <span className="fine-print">Demo data</span>
                    </div>

                    {showToast && (
                      <div className="toast-alert">
                        <div className="toast-content">
                          <span className="toast-dot" />
                          <div>
                            <strong>New listing near you:</strong>
                            <p>Sample Wedding Reception (simulated alert)</p>
                          </div>
                        </div>
                        <button
                          className="icon-button toast-close"
                          aria-label="Dismiss alert"
                          onClick={() => setShowToast(false)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="food-feed">
                    {listings
                      .filter(l => !declined.includes(l._id))
                      .map(l => (
                        <article
                          className={`food-card card urgency-${(l.urgency || 'low').toLowerCase()}`}
                          key={l._id}
                        >
                          <img src={photo(l.eventName)} alt={l.eventName} />
                          <div className="food-info">
                            <Badge
                              tone={
                                l.urgency === 'High'
                                  ? 'red'
                                  : l.urgency === 'Medium'
                                    ? 'amber'
                                    : 'green'
                              }
                            >
                              {l.urgency || 'Low'} urgency
                            </Badge>
                            <h2>{l.eventName}</h2>
                            <div className="food-meta">
                              <span>
                                <Utensils size={15} />
                                {l.quantityMeals} meals
                              </span>
                              <span>
                                <Leaf size={15} />
                                {l.foodItems?.some((f: any) => f.dietType === 'non-veg')
                                  ? 'Non-veg'
                                  : 'Veg'}
                              </span>
                              <span>{l.holdingCondition}</span>
                              <span>
                                <MapPin size={15} />
                                {(l.match?.distanceKm ?? 2.0).toFixed(1)} km
                              </span>
                              <span>
                                <Truck size={15} />
                                ETA {l.match?.etaMinutes ?? 14} min
                              </span>
                            </div>
                            {l.match?.matchType === 'Partial' && (
                              <p className="partial-text">
                                Partial — can accept {account?.remainingCapacityMeals || 10} meals. Split
                                pickups unavailable.
                              </p>
                            )}
                          </div>

                          <div className="food-deadline">
                            <Clock />
                            <div>
                              <p>Deadline</p>
                              <strong>{time(l.safeDeadline)}</strong>
                              <p>{left(l.safeDeadline)}</p>
                            </div>
                          </div>

                          <div className="food-actions">
                            <button
                              disabled={busy || l.match?.matchType !== 'Full match'}
                              className="button"
                              onClick={async () => {
                                if (await action(`/listings/${l._id}/accept`, { ngoId: role })) {
                                  setBoot(await api('/bootstrap'));
                                  navigate('/app/pickups');
                                }
                              }}
                            >
                              <Truck size={16} />
                              Accept pickup
                            </button>
                            <button
                              className="button secondary"
                              onClick={() => setDeclined([...declined, l._id])}
                            >
                              Decline
                            </button>
                          </div>
                        </article>
                      ))}

                    {!listings.filter(l => !declined.includes(l._id)).length && (
                      <section className="card empty">
                        <Utensils />
                        <h2>No available food right now</h2>
                        <p>New feasible listings will appear here automatically.</p>
                        {declined.length > 0 && (
                          <button
                            className="button secondary"
                            onClick={() => setDeclined([])}
                          >
                            Show declined listings
                          </button>
                        )}
                      </section>
                    )}
                  </div>
                </>
              )}

              {/* SCREEN: PICKUPS TRACKING */}
              {screen === 'pickups' && (
                <>
                  <div className="tabs">
                    <button
                      onClick={() => setCompleted(false)}
                      className={!completed ? 'active' : ''}
                    >
                      Active ({pickups.filter(p => ['ACCEPTED', 'COLLECTED'].includes(p.status)).length})
                    </button>
                    <button
                      onClick={() => setCompleted(true)}
                      className={completed ? 'active' : ''}
                    >
                      Completed ({pickups.filter(p => !['ACCEPTED', 'COLLECTED'].includes(p.status)).length})
                    </button>
                  </div>

                  {pickups
                    .filter(p => (completed ? !['ACCEPTED', 'COLLECTED'].includes(p.status) : ['ACCEPTED', 'COLLECTED'].includes(p.status)))
                    .map(p => {
                      const listing = p.listingId;
                      const ngo = p.ngoId;

                      return (
                        <div className="pickup-grid-layout" key={p._id}>
                          {/* Left Column: Pickup Card, Status Tracker, Details, Route Map */}
                          <section className="card pickup-card-main">
                            <div className="pickup-header">
                              <img src={photo(listing?.eventName)} alt={listing?.eventName} />
                              <div className="pickup-header-text">
                                <h2>
                                  {listing?.eventName} · {listing?.quantityMeals} meals
                                </h2>
                                <p>
                                  <MapPin size={14} />
                                  {listing?.location?.address}
                                </p>
                                <p>
                                  <Calendar size={14} />
                                  Pickup window: {listing && time(listing.pickupWindowStart)} –{' '}
                                  {listing && time(listing.pickupWindowEnd)}
                                </p>
                              </div>
                              <Badge tone={p.status === 'DELIVERED' ? 'green' : 'green'}>
                                {p.status === 'ACCEPTED' ? 'In progress' : (p.status || '').toLowerCase()}
                              </Badge>
                            </div>

                            {/* 4-Step Visual Tracker */}
                            <div className="tracker">
                              {['POSTED', 'ACCEPTED', 'COLLECTED', 'DELIVERED'].map((s, i) => {
                                const index = ['POSTED', 'ACCEPTED', 'COLLECTED', 'DELIVERED'].indexOf(p.status);
                                const isDone = i <= index;
                                const dateVal = [listing?.createdAt, p.acceptedAt, p.collectedAt, p.deliveredAt][i];

                                return (
                                  <div className={isDone ? 'done' : ''} key={s}>
                                    <span>{isDone ? <Check size={18} /> : i + 1}</span>
                                    <strong>{s.toLowerCase()}</strong>
                                    <small>{dateVal ? time(dateVal) : '—'}</small>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Two Info Boxes */}
                            <div className="pickup-boxes-grid">
                              <div className="pickup-info-box">
                                <span className="icon-circle">
                                  <Users size={20} />
                                </span>
                                <div>
                                  <p>Assigned NGO</p>
                                  <h3>{ngo?.name}</h3>
                                  <p className="volunteer-note">
                                    Volunteer: {p.volunteerName || 'Rahul Sharma'}
                                  </p>
                                  <p className="eta-note">
                                    <MapPin size={12} /> 2.0 km · ETA at pickup: 14 min
                                  </p>
                                </div>
                              </div>

                              <div className="pickup-info-box amber">
                                <span className="icon-circle amber">
                                  <Clock size={20} />
                                </span>
                                <div>
                                  <p>Deadline</p>
                                  <h3>{listing && time(listing.safeDeadline)}</h3>
                                  <p className="amber-text">
                                    {p.status === 'DELIVERED'
                                      ? `${p.deliveredMeals} confirmed meals`
                                      : listing && left(listing.safeDeadline)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Route Map */}
                            {listing?.location && ngo?.location && (
                              <MapView location={listing.location} ngos={[ngo]} showLegend={false} />
                            )}

                            {/* NGO Handover Action Buttons */}
                            {!organizer && (
                              <div className="pickup-footer-actions">
                                {p.status === 'ACCEPTED' && (
                                  <button
                                    disabled={busy}
                                    className="button full"
                                    onClick={() => void action(`/pickups/${p._id}/collect`)}
                                  >
                                    <Check size={18} /> Mark collected
                                  </button>
                                )}
                                {p.status === 'COLLECTED' && (
                                  <button
                                    className="button full"
                                    onClick={() => setDelivery(p)}
                                  >
                                    <Truck size={18} /> Confirm delivery
                                  </button>
                                )}
                              </div>
                            )}
                          </section>

                          {/* Right Column: Pickup Timeline */}
                          <section className="card pickup-timeline-card">
                            <div className="card-heading">
                              <h2>
                                <Clock />
                                Pickup timeline
                              </h2>
                            </div>

                            <div className="timeline-v2">
                              {p.collectedAt && (
                                <div className="timeline-node">
                                  <span className="node-dot active" />
                                  <div className="node-content">
                                    <span className="node-time">{time(p.collectedAt)}</span>
                                    <strong>Marked collected by {ngo?.name.split('–')[0]}</strong>
                                    <p>Volunteer confirmed collection at event venue.</p>
                                  </div>
                                </div>
                              )}

                              {p.acceptedAt && (
                                <div className="timeline-node">
                                  <span className="node-dot active" />
                                  <div className="node-content">
                                    <span className="node-time">{time(p.acceptedAt)}</span>
                                    <strong>Pickup accepted by {ngo?.name.split('–')[0]}</strong>
                                    <p>{ngo?.name} confirmed and is on the way.</p>
                                  </div>
                                </div>
                              )}

                              <div className="timeline-node">
                                <span className="node-dot active" />
                                <div className="node-content">
                                  <span className="node-time">
                                    {listing && time(new Date(+new Date(listing.createdAt) + 60000).toISOString())}
                                  </span>
                                  <strong>Alert sent to feasible NGOs (simulated)</strong>
                                  <p>Notifications sent to safety-eligible NGOs.</p>
                                </div>
                              </div>

                              <div className="timeline-node">
                                <span className="node-dot active" />
                                <div className="node-content">
                                  <span className="node-time">{listing && time(listing.createdAt)}</span>
                                  <strong>Listing posted</strong>
                                  <p>
                                    {listing?.eventName} · {listing?.quantityMeals} meals
                                  </p>
                                </div>
                              </div>
                            </div>
                          </section>
                        </div>
                      );
                    })}

                  {!pickups.filter(p => (completed ? !['ACCEPTED', 'COLLECTED'].includes(p.status) : ['ACCEPTED', 'COLLECTED'].includes(p.status))).length && (
                    <section className="card empty">
                      <Truck />
                      <h2>No {completed ? 'completed' : 'active'} pickups</h2>
                      <p>
                        {organizer
                          ? 'Accepted listings will appear here.'
                          : 'Accept a feasible listing to start a pickup.'}
                      </p>
                    </section>
                  )}
                </>
              )}

              {/* SCREEN: IMPACT DASHBOARD */}
              {screen === 'impact' && impact && (
                <>
                  <ImpactStats impact={impact} />
                  <p className="fine-print impact-note">
                    Demo data · Estimate (factor: {impact.factor} kg CO₂e/kg food).{' '}
                    {impact.assumption} Weight totals include only entered delivery weights.
                  </p>

                  <div className="impact-layout">
                    {/* Left Card: Recharts Area Chart */}
                    <section className="card">
                      <div className="card-heading">
                        <h2>
                          <ChartNoAxesColumn />
                          Meals redistributed over time
                        </h2>
                        <select className="filter-select" defaultValue="7d">
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                          <option value="all">All time</option>
                        </select>
                      </div>

                      <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={impact.history}
                            margin={{ top: 20, right: 15, left: -20, bottom: 10 }}
                          >
                            <defs>
                              <linearGradient id="impactGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#38864b" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#38864b" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e8e2" />
                            <XAxis
                              dataKey="date"
                              tickFormatter={d =>
                                new Date(d).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short'
                                })
                              }
                              stroke="#849081"
                              fontSize={11}
                            />
                            <YAxis allowDecimals={false} stroke="#849081" fontSize={11} />
                            <Tooltip
                              contentStyle={{
                                background: '#1f3d2b',
                                color: '#fff',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="meals"
                              stroke="#2e7d32"
                              fill="url(#impactGradient)"
                              strokeWidth={3}
                              dot={{ fill: '#2e7d32', r: 4 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </section>

                    {/* Right Card: Recent Deliveries Table */}
                    <section className="card">
                      <div className="card-heading">
                        <h2>
                          <Truck />
                          Recent deliveries
                        </h2>
                        <span className="tiny-label">
                          View all <ArrowRight size={12} />
                        </span>
                      </div>

                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Event</th>
                              <th>NGO</th>
                              <th>Meals</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {impact.recent.map((p: any) => (
                              <tr key={p._id}>
                                <td>
                                  <strong>{p.listingId?.eventName}</strong>
                                </td>
                                <td>{p.ngoId?.name.split('–')[0]?.trim()}</td>
                                <td>{p.deliveredMeals} meals</td>
                                <td>
                                  <Badge tone="green">Delivered</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!impact.recent.length && (
                        <p className="empty">Confirmed deliveries will appear here.</p>
                      )}
                    </section>
                  </div>
                </>
              )}
            </>
          )}

          <footer className="app-footer">
            <span>
              <Leaf size={14} />
              FoodBridge · Hackathon prototype
            </span>
            <span>Demo login · Simulated alerts · Mock Delhi coordinates</span>
          </footer>
        </main>
      </div>

      {/* DELIVERY CONFIRMATION MODAL */}
      {delivery && (
        <DeliveryModal
          pickup={delivery}
          busy={busy}
          onClose={() => setDelivery(null)}
          onSubmit={async data => {
            if (await action(`/pickups/${delivery._id}/deliver`, data)) {
              setDelivery(null);
            }
          }}
        />
      )}
    </div>
  );
}

function DeliveryModal({
  pickup,
  busy,
  onClose,
  onSubmit
}: {
  pickup: any;
  busy: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLInputElement>('input')?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input');
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, [onClose, busy]);

  return (
    <div className="modal-backdrop">
      <div
        ref={ref}
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-title"
      >
        <button
          className="icon-button modal-close"
          disabled={busy}
          onClick={onClose}
          aria-label="Close delivery confirmation"
        >
          <X />
        </button>

        <div className="modal-heading">
          <span className="icon-circle">
            <Truck />
          </span>
          <div>
            <h2 id="delivery-title">Confirm delivery</h2>
            <p>Enter the number of meals actually delivered.</p>
          </div>
        </div>

        <form
          onSubmit={e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void onSubmit({
              deliveredMeals: Number(f.get('meals')),
              ...(f.get('kg') ? { deliveredKg: Number(f.get('kg')) } : {}),
              goodCondition: true
            });
          }}
        >
          <label>
            Meals delivered <span>*</span>
            <div className="input-with-addon">
              <input
                name="meals"
                type="number"
                min="0"
                max={pickup.listingId.quantityMeals}
                required
                defaultValue={pickup.listingId.quantityMeals}
              />
              <span className="addon">Max {pickup.listingId.quantityMeals}</span>
            </div>
          </label>

          <label>
            Weight delivered (kg) (optional)
            <div className="input-with-addon">
              <input name="kg" type="number" step="0.1" min="0" defaultValue="18" />
              <span className="addon">kg</span>
            </div>
          </label>

          <label className="checkbox">
            <input type="checkbox" required defaultChecked />
            Food was handed over in good condition
          </label>

          <button className="button full" disabled={busy}>
            <Check size={18} />
            {busy ? 'Confirming…' : 'Confirm delivered'}
          </button>
          <button
            type="button"
            className="button secondary full"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
