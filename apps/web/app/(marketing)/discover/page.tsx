'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Calendar,
  Compass,
  Mountain,
  Triangle,
  Waves,
  Gauge,
  Bike,
  Timer,
  Snowflake,
  Users,
  Star,
  Bell,
  Menu,
  ArrowUpDown,
  LayoutGrid,
  List,
  ChevronDown,
  Plus,
} from 'lucide-react';

export default function DiscoverPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [whereTo, setWhereTo] = useState('');
  const [when, setWhen] = useState('');
  const [activityType, setActivityType] = useState('');

  const categories = [
    { id: 'all', label: 'All Trips' },
    { id: 'hiking', label: 'Hiking' },
    { id: 'mountain', label: 'Mountain' },
    { id: 'water', label: 'Water' },
    { id: 'motorsport', label: 'Motorsport' },
    { id: 'cycling', label: 'Cycling' },
    { id: 'running', label: 'Running' },
    { id: 'winter', label: 'Winter' },
    { id: 'expedition', label: 'Expedition' },
  ];

  const activities = [
    'Hiking',
    'Mountain Biking',
    'Water Sports',
    'Motorsport',
    'Cycling',
    'Running',
    'Winter Sports',
    'Expedition',
  ];

  const trips = [
    {
      id: 1,
      title: 'Adriatic Offshore Sailing Adventure',
      category: 'water',
      categoryLabel: 'Sailing/Water',
      location: 'Split, Croatia',
      dates: 'Mar 15-22',
      difficulty: 'Intermediate',
      price: '€450',
      priceUnit: '/person',
      organizer: 'Adriatic Adventures',
      isVerified: true,
      guide: 'Marko P.',
      rating: 4.9,
      spots: 4,
      image:
        'https://images.unsplash.com/photo-1500514966906-fe245eea9344?w=600&h=400&fit=crop',
    },
    {
      id: 2,
      title: 'Sunrise Hike to Eagle Peak',
      category: 'hiking',
      categoryLabel: 'Hiking',
      location: 'High Tatras, Slovakia',
      dates: 'Apr 5-6',
      difficulty: 'Advanced',
      price: '€35',
      priceUnit: '/person',
      organizer: 'Jana K.',
      isVerified: false,
      guide: 'Jana K.',
      rating: 4.7,
      spots: 8,
      image:
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop',
    },
    {
      id: 3,
      title: 'Danube Gravel Trail 200km',
      category: 'cycling',
      categoryLabel: 'Cycling',
      location: 'Budapest, Hungary',
      dates: 'May 10-12',
      difficulty: 'Beginner',
      price: 'Free',
      priceUnit: '',
      isFree: true,
      organizer: 'Tamas B.',
      isVerified: false,
      guide: 'Tamas B.',
      rating: 5.0,
      spots: 12,
      image:
        'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=600&h=400&fit=crop',
    },
    {
      id: 4,
      title: 'Freeride Week in Zillertal',
      category: 'winter',
      categoryLabel: 'Winter',
      location: 'Zillertal, Austria',
      dates: 'Mar 1-7',
      difficulty: 'Expert',
      price: '€680',
      priceUnit: '/person',
      organizer: 'Alpine Pro Guides',
      isVerified: true,
      guide: 'Stefan W.',
      rating: 4.8,
      spots: 2,
      image:
        'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=600&h=400&fit=crop',
    },
    {
      id: 5,
      title: 'Velebit Mountain Ultra 80K',
      category: 'running',
      categoryLabel: 'Running',
      location: 'Zadar, Croatia',
      dates: 'Jun 14',
      difficulty: 'Professional',
      price: '€120',
      priceUnit: '/person',
      organizer: 'Ivan L.',
      isVerified: false,
      guide: 'Ivan L.',
      rating: 4.6,
      spots: 6,
      image:
        'https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&h=400&fit=crop',
    },
    {
      id: 6,
      title: 'Carpathian Wilderness Trek',
      category: 'expedition',
      categoryLabel: 'Expedition',
      location: 'Sibiu, Romania',
      dates: 'Jul 20-27',
      difficulty: 'Intermediate',
      price: '€290',
      priceUnit: '/person',
      organizer: 'Wild Romania Expeditions',
      isVerified: true,
      guide: 'Anca M.',
      rating: 4.9,
      spots: 3,
      image:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop',
    },
  ];

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      hiking: '#22C55E',
      mountain: '#F97316',
      water: '#3B82F6',
      motorsport: '#B91C1C',
      cycling: '#EAB308',
      running: '#EF4444',
      winter: '#06B6D4',
      expedition: '#8B5CF6',
    };
    return colors[category] || '#64748B';
  };

  const getDifficultyStyles = (difficulty: string) => {
    const styles: {
      [key: string]: { bg: string; text: string; textColor: string };
    } = {
      Beginner: { bg: '#F1F5F9', text: '#64748B', textColor: '#374151' },
      Intermediate: { bg: '#FEF3C7', text: '#D97706', textColor: '#374151' },
      Advanced: { bg: '#DBEAFE', text: '#3B82F6', textColor: '#374151' },
      Expert: { bg: '#EDE9FE', text: '#8B5CF6', textColor: '#374151' },
      Professional: { bg: '#FEE2E2', text: '#DC2626', textColor: '#374151' },
    };
    return styles[difficulty] || styles.Beginner;
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        :root {
          --trevu-teal: #14B8A6;
          --deep-navy: #0F172A;
          --navy-800: #1E293B;
          --navy-700: #334155;
          --light-gray: #F8FAFC;
          --border-gray: #E2E8F0;
          --text-dark: #1E293B;
          --text-light: #64748B;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: var(--light-gray);
        }

        /* HEADER STYLES */
        .discover-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-gray);
        }

        .header-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.5rem;
          font-weight: 700;
          text-decoration: none;
          color: var(--text-dark);
        }

        .logo-teal {
          color: var(--trevu-teal);
        }

        .logo-navy {
          color: var(--deep-navy);
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 2rem;
          flex: 1;
          margin-left: 2rem;
        }

        .header-nav-link {
          text-decoration: none;
          color: var(--text-light);
          font-size: 0.95rem;
          font-weight: 500;
          transition: color 0.2s;
          border-bottom: 2px solid transparent;
          padding-bottom: 0.25rem;
        }

        .header-nav-link:hover {
          color: var(--text-dark);
        }

        .header-nav-link.active {
          color: var(--trevu-teal);
          border-bottom-color: var(--trevu-teal);
        }

        .header-search {
          flex: 1;
          max-width: 300px;
          margin-left: 1rem;
        }

        .header-search input {
          width: 100%;
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-gray);
          border-radius: 0.5rem;
          font-size: 0.9rem;
          background-color: var(--light-gray);
        }

        .header-search input::placeholder {
          color: var(--text-light);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .header-icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-light);
          padding: 0.5rem;
          transition: color 0.2s;
        }

        .header-icon-btn:hover {
          color: var(--text-dark);
        }

        .header-avatar {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: var(--trevu-teal);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-dark);
        }

        /* HERO SECTION */
        .hero-section {
          background: linear-gradient(135deg, var(--deep-navy) 0%, #1a2a4a 100%);
          color: white;
          padding: 4rem 1.5rem;
          text-align: center;
        }

        .hero-content {
          max-width: 1000px;
          margin: 0 auto;
        }

        .hero-h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
        }

        .search-bar-container {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr auto;
          gap: 1rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .search-field {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .search-field label {
          color: var(--text-light);
          font-size: 0.85rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .search-field input,
        .search-field select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-gray);
          border-radius: 0.5rem;
          font-size: 0.95rem;
          font-family: inherit;
        }

        .search-field input::placeholder {
          color: var(--text-light);
        }

        .search-button {
          background: var(--trevu-teal);
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          align-self: flex-end;
          transition: background 0.2s;
        }

        .search-button:hover {
          background: #0d9488;
        }

        .category-pills {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .category-pill {
          padding: 0.5rem 1.25rem;
          border: none;
          border-radius: 2rem;
          font-weight: 500;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.15);
          color: white;
          transition: all 0.2s;
        }

        .category-pill.active {
          background: #1E293B;
          color: white;
        }

        .category-pill:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        /* FILTER BAR */
        .filter-bar {
          background: white;
          border-bottom: 1px solid var(--border-gray);
          padding: 1.5rem;
          position: sticky;
          top: 72px;
          z-index: 40;
        }

        .filter-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          gap: 1.5rem;
          align-items: center;
          justify-content: space-between;
        }

        .filter-group {
          display: flex;
          gap: 1rem;
          align-items: center;
          flex: 1;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-gray);
          border-radius: 0.5rem;
          font-size: 0.9rem;
          background: white;
          cursor: pointer;
        }

        .view-toggles {
          display: flex;
          gap: 0.5rem;
        }

        .toggle-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border-gray);
          background: white;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }

        .toggle-btn.active {
          background: var(--trevu-teal);
          color: white;
          border-color: var(--trevu-teal);
        }

        /* MAIN CONTENT */
        .main-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .results-count {
          font-size: 1rem;
          color: var(--text-light);
          font-weight: 500;
        }

        .trips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .trip-card {
          background: white;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
          transition: all 0.3s;
          cursor: pointer;
        }

        .trip-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        }

        .trip-card-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          position: relative;
        }

        .trip-card-overlay {
          position: relative;
        }

        .category-badge {
          position: absolute;
          top: 1rem;
          left: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 2rem;
          color: white;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .trip-card-content {
          padding: 1.5rem;
        }

        .trip-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-dark);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .trip-meta {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: var(--text-light);
        }

        .trip-meta-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .difficulty-badge {
          display: inline-block;
          padding: 0.4rem 0.8rem;
          border-radius: 0.4rem;
          font-size: 0.8rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .price-tag {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-dark);
          margin-bottom: 1rem;
        }

        .price-tag.free {
          color: #22C55E;
        }

        .organizer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .organizer-name {
          color: var(--text-dark);
          font-weight: 500;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: #DBEAFE;
          color: #0284C7;
          padding: 0.2rem 0.6rem;
          border-radius: 0.3rem;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 0.5rem;
        }

        .guide-rating {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border-gray);
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }

        .guide-name {
          color: var(--text-dark);
          font-weight: 500;
          flex: 1;
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          color: #F59E0B;
          font-weight: 600;
        }

        .spots-available {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-light);
          font-size: 0.9rem;
        }

        .load-more-btn {
          display: block;
          margin: 0 auto;
          padding: 1rem 2.5rem;
          background: white;
          border: 2px solid var(--trevu-teal);
          color: var(--trevu-teal);
          border-radius: 0.5rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .load-more-btn:hover {
          background: var(--trevu-teal);
          color: white;
        }

        /* CTA BANNER */
        .cta-banner {
          background: linear-gradient(135deg, var(--deep-navy) 0%, #1a2a4a 100%);
          color: white;
          padding: 3rem 1.5rem;
          text-align: center;
          margin-top: 2rem;
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-h2 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .cta-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--trevu-teal);
          color: white;
          padding: 1rem 2rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s;
        }

        .cta-button:hover {
          background: #0d9488;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .trips-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .search-bar-container {
            grid-template-columns: 1fr 1fr;
          }

          .hero-h1 {
            font-size: 2.25rem;
          }

          .header-nav {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .filter-container {
            flex-wrap: wrap;
          }
        }

        @media (max-width: 640px) {
          .trips-grid {
            grid-template-columns: 1fr;
          }

          .search-bar-container {
            grid-template-columns: 1fr;
          }

          .hero-h1 {
            font-size: 1.75rem;
          }

          .hero-subtitle {
            font-size: 1rem;
          }

          .header-container {
            padding: 1rem;
          }

          .header-search {
            display: none;
          }

          .category-pills {
            gap: 0.5rem;
          }

          .category-pill {
            padding: 0.4rem 1rem;
            font-size: 0.85rem;
          }

          .filter-bar {
            top: 65px;
          }

          .filter-container {
            gap: 1rem;
          }

          .filter-group {
            width: 100%;
          }

          .cta-h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>

      {/* HEADER */}
      <header className="discover-header">
        <div className="header-container">
          <Link href="/" className="logo">
            <span className="logo-teal">tre</span>
            <span className="logo-navy">vu</span>
          </Link>

          <nav className="header-nav">
            <Link href="/discover" className="header-nav-link active">
              Discover
            </Link>
            <Link href="/trips" className="header-nav-link">
              My Trips
            </Link>
            <Link href="/travel-planner" className="header-nav-link">
              Travel Planner
            </Link>
            <Link href="/community" className="header-nav-link">
              Community
            </Link>
          </nav>

          <div className="header-search">
            <input type="text" placeholder="Search trips..." />
          </div>

          <div className="header-actions">
            <button className="header-icon-btn" aria-label="Notifications">
              <Bell size={20} />
            </button>
            <Link href="/profile" className="header-avatar">
              MK
            </Link>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-h1">Find your next adventure</h1>
          <p className="hero-subtitle">
            Browse trips organized by experienced adventurers across Central
            Europe
          </p>

          <div className="search-bar-container">
            <div className="search-field">
              <label>Where to?</label>
              <input
                type="text"
                placeholder="Destination"
                value={whereTo}
                onChange={(e) => setWhereTo(e.target.value)}
              />
            </div>
            <div className="search-field">
              <label>When?</label>
              <input
                type="text"
                placeholder="Date range"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="search-field">
              <label>Activity type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
              >
                <option value="">Select activity</option>
                {activities.map((activity) => (
                  <option key={activity} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </div>
            <button className="search-button">
              <Search size={18} />
              Search
            </button>
          </div>

          <div className="category-pills">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-container">
          <div className="filter-group">
            <select className="filter-select">
              <option>Difficulty</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Expert</option>
              <option>Professional</option>
            </select>
            <select className="filter-select">
              <option>Price Range</option>
              <option>Free</option>
              <option>€0-100</option>
              <option>€100-500</option>
              <option>€500+</option>
            </select>
            <select className="filter-select">
              <option>Duration</option>
              <option>1 day</option>
              <option>2-3 days</option>
              <option>4-7 days</option>
              <option>8+ days</option>
            </select>
            <select className="filter-select">
              <option>Available Spots</option>
              <option>1-5</option>
              <option>6-10</option>
              <option>10+</option>
            </select>
          </div>
          <div className="view-toggles">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="main-container">
        <div className="results-header">
          <span className="results-count">24 trips available</span>
          <button className="filter-select" style={{ border: 'none' }}>
            <ArrowUpDown size={16} style={{ marginRight: '0.5rem' }} />
            Most Recent
          </button>
        </div>

        <div className="trips-grid">
          {trips.map((trip) => {
            const difficultyStyles = getDifficultyStyles(trip.difficulty);
            const categoryColor = getCategoryColor(trip.category);

            return (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="trip-card">
                  {/* Card Image with Badge */}
                  <div className="trip-card-overlay">
                    <img
                      src={trip.image}
                      alt={trip.title}
                      className="trip-card-image"
                    />
                    <div
                      className="category-badge"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {trip.categoryLabel}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="trip-card-content">
                    <h3 className="trip-title">{trip.title}</h3>

                    {/* Location & Dates */}
                    <div className="trip-meta">
                      <div className="trip-meta-item">
                        <MapPin size={16} />
                        {trip.location}
                      </div>
                      <div className="trip-meta-item">
                        <Calendar size={16} />
                        {trip.dates}
                      </div>
                    </div>

                    {/* Difficulty Badge */}
                    <div
                      className="difficulty-badge"
                      style={{
                        backgroundColor: difficultyStyles.bg,
                        color: difficultyStyles.text,
                      }}
                    >
                      {trip.difficulty}
                    </div>

                    {/* Price */}
                    <div className={`price-tag ${trip.isFree ? 'free' : ''}`}>
                      {trip.price}
                      {trip.priceUnit && <span>{trip.priceUnit}</span>}
                    </div>

                    {/* Organizer Info */}
                    <div className="organizer-info">
                      <span className="organizer-name">{trip.organizer}</span>
                      {trip.isVerified && (
                        <span className="verified-badge">✓ Verified</span>
                      )}
                    </div>

                    {/* Guide & Rating */}
                    <div className="guide-rating">
                      <span className="guide-name">{trip.guide}</span>
                      <span className="rating">
                        <Star size={14} fill="currentColor" />
                        {trip.rating}
                      </span>
                    </div>

                    {/* Available Spots */}
                    <div className="spots-available">
                      <Users size={16} />
                      {trip.spots} spots available
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Load More Button */}
        <button className="load-more-btn">Load More Trips</button>
      </main>

      {/* CTA BANNER */}
      <section className="cta-banner">
        <div className="cta-content">
          <h2 className="cta-h2">Ready to organize your own adventure?</h2>
          <p className="cta-subtitle">
            Create a trip, set crew positions, and let adventurers find you.
          </p>
          <Link href="/trips/new" className="cta-button">
            <Plus size={20} />
            Create a Trip
          </Link>
        </div>
      </section>
    </div>
  );
}
