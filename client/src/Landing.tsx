import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  Users,
  Clock,
  ChefHat,
  CalendarDays,
  Bell,
  Truck,
  ChartNoAxesColumn,
  Check,
  SlidersHorizontal,
  ClipboardPlus,
  Code2,
  Database,
  MapPin,
  Network,
  Menu,
  X,
  Utensils,
  Github,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { Brand, Badge, Stats, ListingsTable } from './components';
import { api } from './api';

const capabilities = [
  {
    icon: CalendarDays,
    title: 'Event-based listings',
    text: 'Location, food type, quantity, preparation time and pickup window.'
  },
  {
    icon: ShieldCheck,
    title: 'Safety-first eligibility',
    text: 'Listings that fail configured safety checks are never offered.'
  },
  {
    icon: Users,
    title: 'Smart matching',
    text: 'NGOs ranked by time margin, distance and capacity.'
  },
  {
    icon: Bell,
    title: 'Alerts and tracking',
    text: 'Accept, collect and deliver with live status.'
  },
  {
    icon: ChartNoAxesColumn,
    title: 'Impact dashboard',
    text: 'Confirmed meals redistributed and food rescued.'
  }
];

const steps = [
  ['List food', 'Organizer posts surplus meals.', ClipboardPlus],
  ['Check eligibility', 'Safety and timing rules applied.', ShieldCheck],
  ['Match recipients', 'NGOs ranked by feasibility.', Users],
  ['Send alert', 'NGO accepts or declines.', Bell],
  ['Track pickup', 'Accepted → Collected → Delivered.', Truck],
  ['Record impact', 'Confirmed meals logged.', ChartNoAxesColumn]
] as const;

export default function Landing() {
  const [menu, setMenu] = useState(false);
  const [data, setData] = useState<any>(null);
  const [failure, setFailure] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [simMeals, setSimMeals] = useState(40);

  useEffect(() => {
    Promise.all([api('/listings'), api('/impact?all=true')])
      .then(([listings, impact]) => setData({ listings, impact }))
      .catch(() => setFailure(true));
  }, []);

  // Track scroll progress for Scrollcraft timeline scrubber
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
          setScrollProgress(Math.min(100, Math.max(0, progress)));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver for Scrollcraft scroll-reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Simulator calculation for worked example
  const ngoACapacity = 50;
  const ngoBCapacity = 10;
  const ngoAFull = simMeals <= ngoACapacity;
  const ngoBFull = simMeals <= ngoBCapacity;
  const ngoAScore = ngoAFull ? 91 : Math.max(40, Math.round(91 * (ngoACapacity / simMeals)));
  const ngoBScore = ngoBFull ? 94 : 64;

  return (
    <div className="landing">
      {/* Scrollcraft top timeline scrubber */}
      <div
        className="scroll-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        role="progressbar"
        aria-valuenow={Math.round(scrollProgress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Page reading progress"
      />

      <header className="site-header">
        <div className="site-nav">
          <Brand />
          <button
            className="icon-button mobile"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <nav className={menu ? 'open' : ''} aria-label="Website navigation">
            {[
              ['problem', 'Problem'],
              ['solution', 'Solution'],
              ['matching', 'Matching Engine'],
              ['how-it-works', 'How it works'],
              ['technology', 'Technology'],
              ['team', 'Team']
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={() => setMenu(false)}>
                {label}
              </a>
            ))}
          </nav>
          <Link className="button nav-cta" to="/app">
            Try the live demo <ArrowRight size={17} />
          </Link>
        </div>
      </header>

      <main>
        {/* ACT 1: Dimensional Hero with Layered Depth */}
        <section className="hero">
          <div className="hero-copy">
            <span className="hero-tag">
              <Leaf size={17} />
              Surplus Food Rescue Network
            </span>
            <h1>
              Good Food.
              <br />
              No Waste.
              <br />
              Greater Impact.
            </h1>
            <p>
              FoodBridge connects surplus food from weddings, banquet halls, bhandaras, langars and
              events with nearby NGOs — safely, before the collection window closes.
            </p>
            <div className="hero-actions">
              <Link className="button" to="/app">
                Try the live demo <ArrowRight size={18} />
              </Link>
              <a className="button secondary" href="#how-it-works">
                How it works
              </a>
            </div>
            <div className="hero-values">
              <span>
                <Utensils size={18} />
                Rescue surplus food
              </span>
              <span>
                <Users size={18} />
                Support local NGOs
              </span>
              <span>
                <Leaf size={18} />
                Record real outcomes
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-bg-glow" />
            <img
              className="hero-photo"
              src="https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1400&q=90"
              alt="Freshly prepared buffet ready to be shared"
            />
            {/* Scrollcraft Foreground Floating Depth Pill */}
            <div className="hero-floating-pill">
              <span className="live-beacon" />
              <span>
                <strong>75 Meals Confirmed</strong> · 33 kg diverted
              </span>
            </div>

            <div className="hero-photo-caption">
              <span className="icon-circle">
                <Leaf />
              </span>
              <div>
                <strong>Turning surplus into support.</strong>
                <p>From your event. To your community.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Live App Preview */}
        <section className="live-preview wrap reveal-on-scroll" aria-label="Live app preview">
          <div className="preview-heading">
            <span className="preview-dot" />
            Inside FoodBridge <span>Live API · Demo data</span>
            <Link to="/app">
              Open dashboard <ArrowRight size={16} />
            </Link>
          </div>
          <div className="preview-content">
            <div className="preview-sidebar">
              <Brand />
              <p>
                <CalendarDays size={16} />
                Dashboard
              </p>
              <p>
                <ClipboardPlus size={16} />
                New Listing
              </p>
              <p>
                <Users size={16} />
                Matches
              </p>
              <p>
                <Truck size={16} />
                Pickups
              </p>
            </div>
            <div className="preview-main">
              <div className="preview-title">
                <h3>Your next rescue starts here.</h3>
                <Badge tone="neutral">Demo data</Badge>
              </div>
              {data ? (
                <>
                  <Stats impact={data.impact} listings={data.listings} />
                  <ListingsTable
                    listings={data.listings
                      .filter((l: any) => l.status === 'POSTED')
                      .slice(0, 2)}
                    onSelect={l => window.location.assign(`/app/matches/${l._id}`)}
                  />
                </>
              ) : (
                <p className="empty">
                  {failure
                    ? 'Start the API to see the live dashboard preview.'
                    : 'Loading live demo listings…'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ACT 2: The Problem */}
        <section className="section wrap reveal-on-scroll" id="problem">
          <div className="section-heading">
            <span className="section-tag">
              <Clock size={16} />
              The problem
            </span>
            <h2>
              Surplus exists.
              <br className="mobile" /> Connection doesn't.
            </h2>
            <p>Good food deserves a better destination.</p>
          </div>
          <div className="three-grid">
            {[
              {
                icon: ChefHat,
                title: 'Excess from preparation',
                text: 'Attendance and consumption vary, leaving suitable food unused.'
              },
              {
                icon: Users,
                title: 'Disconnected donors and NGOs',
                text: "Organizers don't know which NGOs are nearby. NGOs don't know where surplus is."
              },
              {
                icon: Clock,
                title: 'Narrow, time-sensitive collection window',
                text: 'Delays in calls, transport and pickup make redistribution difficult or unsafe.'
              }
            ].map((c, i) => (
              <article className="card problem-card" key={c.title}>
                <span className={`icon-circle ${i === 1 ? 'amber' : i === 2 ? 'soft-red' : ''}`}>
                  <c.icon />
                </span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </article>
            ))}
          </div>
          <div className="question">
            <Clock size={42} />
            <h3>How do we safely connect surplus food with the right recipients before time runs out?</h3>
          </div>
        </section>

        {/* ACT 3: Our Solution */}
        <section className="section solution-section reveal-on-scroll" id="solution">
          <div className="wrap">
            <div className="section-heading">
              <span className="section-tag">
                <Leaf size={16} />
                Our solution
              </span>
              <h2>
                One platform.
                <br />
                Smarter food rescue.
              </h2>
            </div>
            <div className="solution-layout">
              <div className="capabilities">
                {capabilities.map(c => (
                  <article key={c.title}>
                    <span className="icon-circle">
                      <c.icon />
                    </span>
                    <div>
                      <h3>{c.title}</h3>
                      <p>{c.text}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="solution-panel">
                <div className="solution-panel-top">
                  <Brand />
                  <Badge>Safety-first</Badge>
                </div>
                <div className="solution-art">
                  <ShieldCheck size={60} strokeWidth={1.2} />
                  <h3>
                    The right food.
                    <br />
                    The right recipient.
                    <br />
                    While there's still time.
                  </h3>
                </div>
                <div className="solution-status">
                  <Check size={20} />
                  <p>
                    Eligibility checked
                    <br />
                    <strong>Ready for a feasible match</strong>
                  </p>
                  <ArrowRight size={21} />
                </div>
                <p className="fine-print">Demo configuration — not food-safety guidance.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ACT 4: The Core Innovation & Interactive Simulator (Scrollcraft Signature Move) */}
        <section className="section wrap reveal-on-scroll" id="matching">
          <div className="section-heading">
            <span className="section-tag">
              <SlidersHorizontal size={16} />
              The core innovation
            </span>
            <h2>
              The nearest NGO doesn't
              <br />
              automatically win.
            </h2>
            <p>
              FoodBridge prioritizes feasible, safety-eligible rescues before the collection window closes.
            </p>
          </div>

          <div className="matching-flow">
            {[
              { icon: ShieldCheck, title: 'Safety filter', text: 'Remove ineligible food' },
              {
                icon: SlidersHorizontal,
                title: 'Urgency + distance + capacity',
                text: 'Score every feasible full match'
              },
              { icon: Users, title: 'Feasible match', text: 'Can arrive before the deadline' },
              { icon: Truck, title: 'Pickup', text: 'Accept and track' }
            ].map((s, i) => (
              <article key={s.title}>
                <span className="step-number">{i + 1}</span>
                <span className="icon-circle">
                  <s.icon />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>

          {/* Interactive Matching Simulator */}
          <div className="card worked-example simulator-card">
            <div className="simulator-header">
              <div>
                <h3>
                  <Sparkles className="green-icon" />
                  Interactive Matching Simulator
                </h3>
                <p className="muted">
                  Scrub meal quantities to see how safety, capacity & travel time outrank pure distance.
                </p>
              </div>
              <div className="simulator-presets">
                <span className="tiny-label">Scenarios:</span>
                <button
                  className={`preset-btn ${simMeals === 10 ? 'active' : ''}`}
                  onClick={() => setSimMeals(10)}
                >
                  10 Meals
                </button>
                <button
                  className={`preset-btn ${simMeals === 40 ? 'active' : ''}`}
                  onClick={() => setSimMeals(40)}
                >
                  40 Meals (Deck)
                </button>
                <button
                  className={`preset-btn ${simMeals === 75 ? 'active' : ''}`}
                  onClick={() => setSimMeals(75)}
                >
                  75 Meals (Banquet)
                </button>
              </div>
            </div>

            <div className="simulator-slider-row">
              <label htmlFor="sim-meals-input">
                Surplus Quantity: <strong>{simMeals} packed meals</strong>
                <span className="tiny-label">Safe collection deadline: 3:00 PM</span>
              </label>
              <input
                id="sim-meals-input"
                type="range"
                min="10"
                max="80"
                step="5"
                value={simMeals}
                onChange={e => setSimMeals(Number(e.target.value))}
                className="simulator-slider"
              />
            </div>

            <div className="two-grid">
              <article className={`example-card ${ngoAFull ? '' : 'partial'}`}>
                <Badge tone={ngoAFull ? 'green' : 'amber'}>
                  {ngoAFull ? `Full match · Score ${ngoAScore}` : `Partial · Score ${ngoAScore}`}
                </Badge>
                <h3>NGO A – Community Kitchen</h3>
                <p>
                  <MapPin size={17} />
                  2.0 km · ETA 14 min · Capacity {ngoACapacity} meals
                </p>
                <p className="example-result">
                  {ngoAFull ? (
                    <>
                      <Check size={19} />
                      Can collect and redistribute in time (Capacity {ngoACapacity} ≥ {simMeals} needed).
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={19} />
                      Partial match (Can accept {ngoACapacity} of {simMeals} meals).
                    </>
                  )}
                </p>
              </article>

              <article className={`example-card ${ngoBFull ? '' : 'partial'}`}>
                <Badge tone={ngoBFull ? 'green' : 'amber'}>
                  {ngoBFull ? `Full match · Score ${ngoBScore}` : 'Partial'}
                </Badge>
                <h3>NGO B – Seva Kitchen</h3>
                <p>
                  <MapPin size={17} />
                  1.0 km · ETA 9 min · Capacity {ngoBCapacity} meals
                </p>
                <p className="example-result">
                  {ngoBFull ? (
                    <>
                      <Check size={19} />
                      Closer proximity wins when capacity is sufficient ({ngoBCapacity} ≥ {simMeals}).
                    </>
                  ) : (
                    <>
                      <Clock size={19} />
                      Not enough capacity for the full quantity (Can accept {ngoBCapacity} of{' '}
                      {simMeals} meals).
                    </>
                  )}
                </p>
              </article>
            </div>

            <p className="example-note">
              {simMeals === 40
                ? 'Illustrative 40-meal scenario: Proximity trap avoided! Although NGO B is closer (1.0 km vs 2.0 km), NGO A is ranked higher because NGO B cannot take all 40 meals.'
                : simMeals <= 10
                  ? 'At 10 meals, NGO B wins because its closer distance (1.0 km) is feasible and within capacity!'
                  : 'At 75 meals, both NGOs are capacity-constrained; FoodBridge flags split pickups or alerts regional food banks.'}
            </p>
          </div>
        </section>

        {/* ACT 5: Comparison */}
        <section className="section comparison-section reveal-on-scroll">
          <div className="wrap">
            <div className="section-heading">
              <span className="section-tag">
                <Leaf size={16} />
                Why FoodBridge
              </span>
              <h2>Beyond basic food donation.</h2>
            </div>
            <div className="comparison table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Traditional approach</th>
                    <th>FoodBridge</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Food discovery', 'Manual calls and messages', 'Centralized digital listings'],
                    [
                      'Donor coverage',
                      'Personal contacts',
                      'Weddings, bhandaras, langars, concerts'
                    ],
                    ['Matching', 'Informal coordination', 'Safety-first feasibility ranking'],
                    ['Time management', 'Manual follow-ups', 'Deadline-aware simulated alerts'],
                    ['Pickup tracking', 'Inconsistent records', 'Accepted, collected, delivered'],
                    ['Impact measurement', 'Incomplete records', 'Confirmed meals and quantities']
                  ].map(([feature, traditional, foodbridge]) => (
                    <tr key={feature}>
                      <th>{feature}</th>
                      <td>{traditional}</td>
                      <td>
                        <Check size={17} />
                        {foodbridge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ACT 6: Process Lifecycle */}
        <section className="section wrap reveal-on-scroll" id="how-it-works">
          <div className="section-heading">
            <span className="section-tag">
              <Network size={16} />
              How it works
            </span>
            <h2>
              From event surplus
              <br />
              to community meals.
            </h2>
          </div>
          <div className="six-grid">
            {steps.map(([title, text, Icon], i) => (
              <article className="card process-card" key={title}>
                <span className="step-number">0{i + 1}</span>
                <span className="icon-circle">
                  <Icon />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ACT 7: Technology Stack */}
        <section className="section technology-section reveal-on-scroll" id="technology">
          <div className="wrap">
            <div className="section-heading">
              <span className="section-tag">
                <Code2 size={16} />
                Technology
              </span>
              <h2>Built for a reliable MVP.</h2>
            </div>
            <div className="tech-grid">
              {[
                { icon: Code2, title: 'React', text: 'Organizer and NGO dashboards' },
                { icon: Network, title: 'Node.js + Express', text: 'APIs, eligibility, status updates' },
                { icon: Database, title: 'MongoDB', text: 'Listings, NGOs and pickups' },
                { icon: SlidersHorizontal, title: 'Matching engine', text: 'Pure JavaScript, unit tested' },
                { icon: MapPin, title: 'Leaflet + OpenStreetMap', text: 'Maps with mock coordinates' }
              ].map(t => (
                <article className="card tech-card" key={t.title}>
                  <i className="implemented-dot" />
                  <span className="icon-circle">
                    <t.icon />
                  </span>
                  <h3>{t.title}</h3>
                  <p>{t.text}</p>
                </article>
              ))}
            </div>
            <p className="tech-legend">
              <span>
                <i className="preview-dot" />
                Implemented (MVP)
              </span>
              <span>Planned: Firebase Auth + Cloud Messaging</span>
              <span>Simulated: demo login + in-app alerts</span>
            </p>
            <div
              className="architecture"
              aria-label="Architecture: React calls Express API which stores data in MongoDB; Express calls the matching module"
            >
              <span>React</span>
              <ArrowRight />
              <div>
                <span>Express API</span>
                <small>↕ Matching module</small>
              </div>
              <ArrowRight />
              <span>MongoDB</span>
            </div>
          </div>
        </section>

        {/* ACT 8: The Team */}
        <section className="section wrap team-section reveal-on-scroll" id="team">
          <div className="section-heading">
            <span className="section-tag">
              <Users size={16} />
              The team
            </span>
            <h2>Team Techie Titans</h2>
          </div>
          <div className="team-grid">
            {[
              { initials: 'JT', role: 'Project Lead' },
              { initials: 'AS', role: 'Backend Developer' },
              { initials: 'RK', role: 'Frontend Developer' },
              { initials: 'MP', role: 'Research & Operations' }
            ].map(m => (
              <article className="card team-card" key={m.role}>
                <span className="avatar">{m.initials}</span>
                <div>
                  <h3>[Member Name]</h3>
                  <p>{m.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-cta">
            <Brand />
            <div>
              <h2>Turning surplus into support.</h2>
              <p>Connecting events to communities for a hunger-free future.</p>
            </div>
            <Link className="button light" to="/app">
              Try the live demo <ArrowRight size={18} />
            </Link>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} FoodBridge · Hackathon prototype</p>
            <span>
              <Github size={17} />
              GitHub · Repository link coming soon
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
