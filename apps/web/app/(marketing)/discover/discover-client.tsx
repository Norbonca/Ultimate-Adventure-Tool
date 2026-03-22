'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
} from 'lucide-react';

// Types matching Supabase query results exactly
interface Trip {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string;
  location_country: string;
  location_region: string | null;
  location_city: string | null;
  cover_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  price_amount: number | null;
  price_currency: string;
  is_cost_sharing: boolean;
  difficulty: number;
  category_id: string;
  max_participants: number;
  current_participants: number;
  status: string;
  visibility: string;
  categories: { id: string; name: string; name_localized: Record<string, string>; icon_name: string; color_hex: string } | { id: string; name: string; name_localized: Record<string, string>; icon_name: string; color_hex: string }[] | null;
  sub_disciplines: { id: string; name: string; name_localized: Record<string, string> } | null;
  profiles: { id: string; display_name: string; avatar_url: string | null; slug: string; subscription_tier: string } | { id: string; display_name: string; avatar_url: string | null; slug: string; subscription_tier: string }[] | null;
}

interface Category {
  id: string;
  name: string;
  name_localized: Record<string, string>;
  icon_name: string;
  color_hex: string;
  display_order: number;
}

interface DifficultyLevel {
  value: number;
  label: string;
  labelEn: string;
  color: string;
}

interface CategoryDisplayItem {
  name: string;
  nameHu: string;
  emoji: string;
  colorHex: string;
  icon: string;
  colorBg: string;
  colorText: string;
}

interface CategoryDisplay {
  [key: string]: CategoryDisplayItem;
}

interface DiscoverClientProps {
  trips: Trip[];
  categories: Category[];
  categoryDisplay: CategoryDisplay;
  difficultyLevels: DifficultyLevel[];
}

const categoryIconMap: Record<string, React.ComponentType<any>> = {
  Hiking: Mountain,
  Mountaineering: Triangle,
  'Water Sports': Waves,
  Cycling: Bike,
  Motorsport: Gauge,
  Running: Timer,
  'Winter Sports': Snowflake,
  Expedition: Compass,
};

const getCategoryIcon = (categoryName: string) => {
  return categoryIconMap[categoryName] || Mountain;
};

const formatDateRange = (startDate: string, endDate: string): string => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startFormatted = formatter.format(start);
  const endFormatted = formatter.format(end);

  return `${startFormatted}–${endFormatted}`;
};

const formatPrice = (priceAmount: number | null): string => {
  if (!priceAmount || priceAmount === 0) {
    return 'Free';
  }
  return `€${priceAmount} /person`;
};

export default function DiscoverClient({
  trips,
  categories,
  categoryDisplay,
  difficultyLevels,
}: DiscoverClientProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [selectedSpots, setSelectedSpots] = useState<string>('all');

  // Helper: resolve Supabase join (can be object or array)
  const resolveJoin = <T,>(val: T | T[] | null): T | null => {
    if (!val) return null;
    if (Array.isArray(val)) return val[0] || null;
    return val;
  };

  const filteredTrips = trips.filter((trip) => {
    if (activeCategory !== 'all' && trip.category_id !== activeCategory) {
      return false;
    }
    if (
      searchQuery &&
      !trip.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (selectedDifficulty !== 'all' && String(trip.difficulty) !== selectedDifficulty) {
      return false;
    }
    return true;
  });

  const getDifficultyLabel = (level: number) => {
    return difficultyLevels.find((d) => d.value === level) || difficultyLevels[0];
  };

  const getCategoryInfo = (trip: Trip) => {
    const cat = resolveJoin(trip.categories);
    if (!cat) return null;
    return { ...categoryDisplay[cat.name], dbCat: cat };
  };

  const getOrganizer = (trip: Trip) => {
    return resolveJoin(trip.profiles);
  };

  const getSpotsLeft = (trip: Trip) => {
    return trip.max_participants - (trip.current_participants || 0);
  };

  const getLocation = (trip: Trip) => {
    return trip.location_city || trip.location_region || trip.location_country || '';
  };

  return (
    <div className="discover-page">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f9fafb;
          color: #1f2937;
        }

        .discover-page {
          width: 100%;
          min-height: 100vh;
        }

        /* HEADER */
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 2rem;
        }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }

        .header-logo-link {
          text-decoration: none;
          flex-shrink: 0;
        }

        .header-logo {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .header-logo span {
          color: #0d9488;
        }

        .header-nav {
          display: none;
          gap: 2rem;
          flex: 1;
        }

        .header-nav a {
          text-decoration: none;
          color: #6b7280;
          font-size: 0.95rem;
          transition: color 0.3s;
          position: relative;
        }

        .header-nav a:hover {
          color: #0f172a;
        }

        .header-nav a.active {
          color: #0d9488;
          font-weight: 600;
        }

        .header-nav a.active::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          right: 0;
          height: 2px;
          background-color: #0d9488;
        }

        .header-search {
          flex: 1;
          max-width: 300px;
          display: none;
        }

        .header-search input {
          width: 100%;
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.9rem;
          background-color: #f3f4f6;
        }

        .header-search input:focus {
          outline: none;
          border-color: #0d9488;
          background-color: #fff;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex-shrink: 0;
        }

        .bell-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          transition: color 0.3s;
          padding: 0.5rem;
        }

        .bell-btn:hover {
          color: #0f172a;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.2s;
        }

        .user-avatar:hover {
          transform: scale(1.1);
        }

        .mobile-menu-btn {
          display: flex;
          background: none;
          border: none;
          cursor: pointer;
          color: #0f172a;
        }

        @media (min-width: 1024px) {
          .header {
            padding: 1.25rem 2rem;
          }

          .header-nav {
            display: flex;
          }

          .header-search {
            display: block;
          }

          .mobile-menu-btn {
            display: none;
          }
        }

        /* HERO */
        .hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.2;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: #cbd5e1;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .search-bar {
          display: flex;
          background: var(--text-white, #fff);
          border-radius: 12px;
          overflow: hidden;
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        }

        .search-field {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          border-right: 1px solid var(--border-subtle, #E2E8F0);
        }

        .search-field:last-of-type { border-right: none; }

        .search-field svg { color: var(--text-muted, #94A3B8); flex-shrink: 0; }

        .search-field input,
        .search-field select {
          border: none;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: var(--text-primary, #0F172A);
          background: transparent;
          width: 100%;
        }

        .search-field input::placeholder,
        .search-field select { color: var(--text-muted, #94A3B8); }
        .search-field select option { color: var(--text-primary, #0F172A); }

        .search-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px 20px;
          background: var(--trevu-teal, #0D9488);
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
          color: white;
        }

        .search-btn:hover { background: var(--trevu-teal-dark, #0F766E); }

        @media (max-width: 1024px) {
          .search-bar { flex-direction: column; max-width: 500px; }
          .search-field { border-right: none; border-bottom: 1px solid var(--border-subtle, #E2E8F0); }
          .search-field:last-of-type { border-bottom: none; }
        }

        @media (min-width: 768px) {
          .search-fields-placeholder {
            display: none;
          }
        }

        .category-pills {
          display: flex;
          gap: 0.75rem;
          margin-top: 2rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .pill {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
        }

        .pill-default {
          background-color: #1e293b;
          color: white;
        }

        .pill-default:hover {
          background-color: #334155;
        }

        .pill-active {
          background-color: #0d9488;
          color: white;
        }

        .pill svg {
          width: 16px;
          height: 16px;
        }

        @media (min-width: 640px) {
          .hero-title {
            font-size: 3rem;
          }

          .hero-subtitle {
            font-size: 1.25rem;
          }
        }

        /* FILTER BAR */
        .filter-bar {
          background-color: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 1.5rem 2rem;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-bar-content {
          max-width: 1280px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .filter-group label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .filter-select {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background-color: #f9fafb;
          font-size: 0.9rem;
          cursor: pointer;
          color: #1f2937;
        }

        .filter-select:hover {
          border-color: #0d9488;
        }

        .filter-select:focus {
          outline: none;
          border-color: #0d9488;
          box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.1);
        }

        .sort-toggle {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #1f2937;
          transition: all 0.3s;
        }

        .sort-toggle:hover {
          border-color: #0d9488;
        }

        .sort-toggle svg {
          width: 16px;
          height: 16px;
          color: #0d9488;
        }

        @media (max-width: 640px) {
          .filter-bar {
            padding: 1rem;
          }

          .filter-bar-content {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            flex: 1;
            flex-direction: column;
          }

          .filter-select {
            width: 100%;
          }

          .sort-toggle {
            margin-left: 0;
            width: 100%;
            justify-content: center;
          }
        }

        /* MAIN CONTENT */
        .main-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 2rem;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .results-count {
          font-size: 1.1rem;
          color: #1f2937;
          font-weight: 600;
        }

        .view-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .view-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background-color: white;
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.3s;
          color: #6b7280;
        }

        .view-btn.active {
          background-color: #0d9488;
          color: white;
          border-color: #0d9488;
        }

        .view-btn svg {
          width: 16px;
          height: 16px;
        }

        .trips-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          margin-bottom: 3rem;
        }

        @media (min-width: 640px) {
          .trips-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .trips-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .trip-card {
          background-color: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .trip-card:hover {
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .trip-card-image {
          position: relative;
          width: 100%;
          height: 240px;
          background-color: #e5e7eb;
          overflow: hidden;
        }

        .trip-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .trip-card-image.gradient {
          background: linear-gradient(135deg, var(--category-color-1) 0%, var(--category-color-2) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 3rem;
        }

        .trip-card-badges {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .badge-category {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }

        .badge-spots {
          margin-left: auto;
          padding: 0.4rem 0.8rem;
          background-color: rgba(15, 23, 42, 0.9);
          color: white;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .trip-card-body {
          padding: 1.5rem;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .trip-card-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          color: #0f172a;
          line-height: 1.4;
        }

        .trip-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #6b7280;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .meta-item svg {
          width: 16px;
          height: 16px;
          color: #0d9488;
          flex-shrink: 0;
        }

        .trip-card-details {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .badge-difficulty {
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
        }

        .trip-card-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: #0d9488;
        }

        .trip-card-price.free {
          color: #16a34a;
        }

        .trip-card-footer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .organizer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .organizer-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: #e5e7eb;
          flex-shrink: 0;
        }

        .organizer-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .organizer-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .organizer-name {
          font-size: 0.9rem;
          font-weight: 600;
          color: #0f172a;
        }

        .organizer-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .organizer-rating svg {
          width: 14px;
          height: 14px;
          color: #fbbf24;
          fill: #fbbf24;
        }

        .trip-card-footer.corporate {
          flex-direction: column;
          align-items: stretch;
          gap: 1rem;
        }

        .corp-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background-color: #f0fdf4;
          border-radius: 6px;
        }

        .corp-logo {
          width: 40px;
          height: 40px;
          background-color: white;
          border-radius: 4px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .corp-logo img {
          max-width: 100%;
          max-height: 100%;
        }

        .corp-name {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #0f766e;
          flex: 1;
        }

        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background-color: #0d9488;
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .guide-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: #0f766e;
        }

        .guide-row svg {
          width: 16px;
          height: 16px;
        }

        /* LOAD MORE */
        .load-more {
          text-align: center;
          margin: 2rem 0;
        }

        .btn-load-more {
          padding: 0.75rem 2rem;
          background-color: white;
          color: #0d9488;
          border: 2px solid #0d9488;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-load-more:hover {
          background-color: #0d9488;
          color: white;
        }

        /* CTA BANNER */
        .cta-banner {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 4rem 2rem;
          text-align: center;
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          line-height: 1.4;
        }

        .cta-subtitle {
          font-size: 1.1rem;
          color: #cbd5e1;
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 2rem;
          background-color: #0d9488;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.3s;
        }

        .cta-btn:hover {
          background-color: #0f766e;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6b7280;
        }

        .empty-state h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }
      `}</style>

      {/* HEADER */}
      <header className="header">
        <div className="header-content">
          <Link href="/" className="header-logo-link">
            <span className="header-logo">
              tre<span>vu</span>
            </span>
          </Link>

          <nav className="header-nav">
            <a href="/discover" className="active">
              Discover
            </a>
            <a href="/trips">My Trips</a>
            <a href="/planner">Travel Planner</a>
            <a href="/community">Community</a>
          </nav>

          <div className="header-search">
            <input
              type="text"
              placeholder="Search trips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header-right">
            <button className="bell-btn">
              <Bell size={20} />
            </button>
            <Link href="/profile" className="user-avatar">
              MK
            </Link>
          </div>

          <button className="mobile-menu-btn">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Find your next adventure</h1>
          <p className="hero-subtitle">
            Browse trips organized by experienced adventurers across Central Europe
          </p>

          <div className="search-bar">
              <div className="search-field">
                <MapPin size={18} />
                <input
                  type="text"
                  placeholder="Where to?"
                />
              </div>
              <div className="search-field">
                <Calendar size={18} />
                <input
                  type="text"
                  placeholder="When?"
                />
              </div>
              <div className="search-field">
                <Compass size={18} />
                <select>
                  <option value="">Activity type</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="search-btn">
                <Search size={20} />
              </button>
          </div>

          <div className="category-pills">
            <button
              className={`pill ${activeCategory === 'all' ? 'pill-active' : 'pill-default'}`}
              onClick={() => setActiveCategory('all')}
            >
              All Trips
            </button>
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              return (
                <button
                  key={category.id}
                  className={`pill ${activeCategory === category.id ? 'pill-active' : 'pill-default'}`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon size={14} />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="filter-bar">
        <div className="filter-bar-content">
          <div className="filter-group">
            <label htmlFor="difficulty">Difficulty</label>
            <select
              id="difficulty"
              className="filter-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="all">All Levels</option>
              {difficultyLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="price">Price Range</label>
            <select
              id="price"
              className="filter-select"
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="budget">&lt;€300</option>
              <option value="mid">€300-€600</option>
              <option value="premium">&gt;€600</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="duration">Duration</label>
            <select
              id="duration"
              className="filter-select"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
            >
              <option value="all">Any Duration</option>
              <option value="weekend">Weekend</option>
              <option value="week">1 Week</option>
              <option value="long">2+ Weeks</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="spots">Available Spots</label>
            <select
              id="spots"
              className="filter-select"
              value={selectedSpots}
              onChange={(e) => setSelectedSpots(e.target.value)}
            >
              <option value="all">Any</option>
              <option value="1">1-3 Spots</option>
              <option value="4">4+ Spots</option>
              <option value="10">10+ Spots</option>
            </select>
          </div>

          <button className="sort-toggle">
            <ArrowUpDown size={16} />
            Most Recent
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="results-header">
          <div className="results-count">
            {filteredTrips.length === 0
              ? 'No trips yet'
              : `${filteredTrips.length} trips available`}
          </div>
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {filteredTrips.length === 0 ? (
          <div className="empty-state">
            <h2>No trips found</h2>
            <p>Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <>
            <div className="trips-grid">
              {filteredTrips.map((trip) => {
                const catInfo = getCategoryInfo(trip);
                const organizer = getOrganizer(trip);
                const spotsLeft = getSpotsLeft(trip);
                const diffLevel = getDifficultyLabel(trip.difficulty);
                const location = getLocation(trip);
                const isCorporate = organizer && organizer.subscription_tier !== 'free';
                const CatIcon = catInfo?.dbCat ? getCategoryIcon(catInfo.dbCat.name) : Mountain;

                return (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.slug}`}
                    className="trip-card"
                  >
                    {/* Image */}
                    <div className="trip-card-image" style={
                      !trip.cover_image_url ? {
                        background: `linear-gradient(135deg, ${catInfo?.colorHex || '#0D9488'}30, ${catInfo?.colorHex || '#0D9488'}60)`
                      } : undefined
                    }>
                      {trip.cover_image_url && (
                        <img src={trip.cover_image_url} alt={trip.title} loading="lazy" />
                      )}
                      <div className="trip-card-badges">
                        {catInfo && (
                          <span className="badge-category" style={{ background: catInfo.colorHex }}>
                            <CatIcon size={12} /> {catInfo.dbCat?.name || ''}
                          </span>
                        )}
                        <span className="badge-spots">
                          <Users size={12} /> {spotsLeft} spots left
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="trip-card-body">
                      <h3 className="trip-card-title">{trip.title}</h3>
                      <div className="trip-card-meta">
                        <span><MapPin size={14} /> {location}</span>
                        {trip.start_date && (
                          <span><Calendar size={14} /> {trip.end_date ? formatDateRange(trip.start_date, trip.end_date) : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(trip.start_date))}</span>
                        )}
                      </div>
                      <div className="trip-card-details">
                        <span className="badge-difficulty" style={{
                          background: diffLevel.color + '20',
                          color: diffLevel.color
                        }}>
                          {diffLevel.labelEn}
                        </span>
                        {trip.price_amount && trip.price_amount > 0 ? (
                          <span className="trip-card-price">€{trip.price_amount} <span>/person</span></span>
                        ) : (
                          <span className="trip-card-price" style={{ color: '#22C55E' }}>Free</span>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={`trip-card-footer${isCorporate ? ' corporate' : ''}`}>
                      {isCorporate ? (
                        <>
                          <div className="corp-row">
                            <div className="corp-logo" style={{ background: catInfo?.colorHex || '#0D9488' }}>
                              {(organizer?.display_name || 'O')[0]}
                            </div>
                            <span className="corp-name">{organizer?.display_name}</span>
                            <span className="corp-spacer"></span>
                            <span className="verified-badge">
                              <span className="verified-badge-logo">T</span> Verified Org
                            </span>
                          </div>
                          <div className="guide-row">
                            <div className="organizer-avatar" style={{ background: catInfo?.colorHex || '#0D9488', width: 20, height: 20 }}></div>
                            <span className="organizer-name">Guide: {organizer?.display_name}</span>
                            <span className="corp-spacer"></span>
                            <div className="organizer-rating"><Star size={12} /> 4.8</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="organizer">
                            <div className="organizer-avatar" style={{ background: catInfo?.colorHex || '#0D9488' }}></div>
                            <span className="organizer-name">{organizer?.display_name || 'Organizer'}</span>
                          </div>
                          <div className="organizer-rating">
                            <Star size={14} /> 4.8
                          </div>
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {filteredTrips.length > 6 && (
              <div className="load-more">
                <button className="btn-load-more">Load More Trips</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* CTA BANNER */}
      <section className="cta-banner">
        <div className="cta-content">
          <h2 className="cta-title">Ready to organize your own adventure?</h2>
          <p className="cta-subtitle">
            Create a trip, set crew positions, and let adventurers find you.
          </p>
          <Link href="/trips/new" className="cta-btn">
            Create a Trip
          </Link>
        </div>
      </section>
    </div>
  );
}
