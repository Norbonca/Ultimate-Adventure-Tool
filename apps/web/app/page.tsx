'use client';

import Link from 'next/link';
import {
  Menu,
  X,
  MapPin,
  Zap,
  Wallet,
  WifiOff,
  Mountain,
  Triangle,
  Waves,
  Bike,
  Gauge,
  Timer,
  Snowflake,
  Compass,
  Users,
  Shield,
  Package,
  CloudSun,
  Plane,
  Languages,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = [
    {
      name: 'Hiking',
      icon: Mountain,
      color: '#22C55E',
      label: 'Distance, elevation, terrain difficulty',
    },
    {
      name: 'Mountain',
      icon: Triangle,
      color: '#F97316',
      label: 'Technical grades, via ferrata, gear lists',
    },
    {
      name: 'Water Sports',
      icon: Waves,
      color: '#3B82F6',
      label: 'Sailing, kayaking, surfing, kite',
    },
    {
      name: 'Cycling',
      icon: Bike,
      color: '#EAB308',
      label: 'Road, MTB, gravel touring, eBike',
    },
    {
      name: 'Motorsport',
      icon: Gauge,
      color: '#B91C1C',
      label: 'Motorcycle touring, 4x4 off-road',
    },
    {
      name: 'Running',
      icon: Timer,
      color: '#EF4444',
      label: 'Road, trail, ultra, race planning',
    },
    {
      name: 'Winter Sports',
      icon: Snowflake,
      color: '#06B6D4',
      label: 'Skiing, snowboard, avalanche risk alerts',
    },
    {
      name: 'Expedition',
      icon: Compass,
      color: '#8B5CF6',
      label: 'Multi-sport combined adventures',
    },
  ];

  const secondaryFeatures = [
    {
      name: 'Community & Social',
      icon: Users,
      color: '#0D9488',
      desc: 'Follow adventurers, share trip reports, and discover hidden gems from the community.',
    },
    {
      name: 'Safety & Emergency',
      icon: Shield,
      color: '#FB7185',
      desc: 'SOS button, safety check-ins, and emergency contacts. Because adventure should be bold, not reckless.',
    },
    {
      name: 'Smart Packing Lists',
      icon: Package,
      color: '#FBBF24',
      desc: 'Auto-generated packing lists based on your activity, weather forecast, and trip duration.',
    },
    {
      name: 'Weather Intelligence',
      icon: CloudSun,
      color: '#06B6D4',
      desc: 'Real-time forecasts, historical weather data, and alerts tailored to your specific adventure location.',
    },
    {
      name: 'Booking Integration',
      icon: Plane,
      color: '#A78BFA',
      desc: 'Search flights, find accommodation, and book activities — all without leaving your trip plan.',
    },
    {
      name: '7 Languages',
      icon: Languages,
      color: '#22C55E',
      desc: 'Available in Hungarian, English, German, Slovak, Croatian, Slovenian, Romanian, and Czech.',
    },
  ];

  const testimonials = [
    {
      text: 'Finally, one app that understands hiking isn\'t the same as cycling. The category-specific planning is a game changer for our mountain club.',
      author: 'Márta K.',
      role: 'Mountain Club Organizer, Budapest',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80&fit=crop&auto=format',
    },
    {
      text: 'We used to lose hours reconciling expenses after every group trip. With trevu, costs are split in real-time and everyone stays in the loop.',
      author: 'Tomáš R.',
      role: 'Trail Running Group Leader, Bratislava',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&q=80&fit=crop&auto=format',
    },
    {
      text: 'Offline maps that actually work at 2,500m elevation? That alone sold me. But the packing lists and weather alerts make it indispensable.',
      author: 'Lukas H.',
      role: 'Alpine Guide, Innsbruck',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&q=80&fit=crop&auto=format',
    },
  ];

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: 'DM Sans', sans-serif;
          color: #0F172A;
          background-color: #FFFFFF;
        }

        /* Header */
        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(13, 148, 136, 0.1);
        }

        .header-content {
          max-width: 1280px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.5px;
        }

        .logo-tre {
          color: #0D9488;
        }

        .logo-vu {
          color: #0F172A;
        }

        .nav-desktop {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-desktop a {
          color: #0F172A;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-desktop a:hover {
          color: #0D9488;
        }

        .nav-right {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .btn-login {
          color: #0F172A;
          background: transparent;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
        }

        .btn-login:hover {
          color: #0D9488;
        }

        .btn-primary {
          background: #0D9488;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #0B8176;
        }

        .hamburger {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, #F8FAFC 0%, #E6F7F5 50%, #CCEFEB 100%);
          padding: 6rem 2rem;
          text-align: center;
        }

        .hero-content {
          max-width: 1280px;
          margin: 0 auto;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 999px;
          margin-bottom: 2rem;
          font-size: 13px;
          font-weight: 600;
          color: #166534;
        }

        .badge-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #22C55E;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .hero-headline {
          font-size: 72px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          letter-spacing: -1px;
          color: #0F172A;
        }

        .hero-subheadline {
          font-size: 18px;
          color: #475569;
          max-width: 700px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        .hero-ctas {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 4rem;
          flex-wrap: wrap;
        }

        .btn-cta-primary {
          background: #0D9488;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-cta-primary:hover {
          background: #0B8176;
        }

        .btn-cta-secondary {
          background: transparent;
          color: #0F172A;
          border: 2px solid #0F172A;
          padding: calc(1rem - 2px) calc(2rem - 2px);
          border-radius: 0.75rem;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cta-secondary:hover {
          background: #F8FAFC;
        }

        .hero-image {
          max-width: 900px;
          width: 100%;
          height: auto;
          border-radius: 1rem;
          margin-bottom: 3rem;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .hero-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .trust-text {
          color: #64748B;
          font-size: 14px;
          font-weight: 500;
        }

        .trust-countries {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .trust-country {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0F172A;
          font-size: 14px;
          font-weight: 500;
        }

        /* Problem Section */
        .problem {
          background: white;
          padding: 6rem 2rem;
        }

        .section-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .section-tag {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
        }

        .tag-coral {
          background: rgba(251, 113, 133, 0.1);
          color: #BE123C;
        }

        .tag-teal {
          background: rgba(13, 148, 136, 0.1);
          color: #0D9488;
        }

        .tag-light {
          background: rgba(13, 148, 136, 0.15);
          color: #0D9488;
        }

        .section-headline {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 1rem;
          color: #0F172A;
        }

        .section-description {
          font-size: 18px;
          color: #475569;
          margin-bottom: 3rem;
          max-width: 700px;
          line-height: 1.6;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }

        .card {
          background: #F8FAFC;
          padding: 2rem;
          border-radius: 1rem;
          border: 1px solid #E2E8F0;
        }

        .card-headline {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #0F172A;
        }

        .card-text {
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
        }

        /* Features Section */
        .features {
          background: #F8FAFC;
          padding: 6rem 2rem;
        }

        .feature-block {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          margin-bottom: 4rem;
        }

        .feature-block.reversed {
          direction: rtl;
        }

        .feature-block.reversed > * {
          direction: ltr;
        }

        .feature-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .feature-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: 0.75rem;
          margin-bottom: 1rem;
        }

        .feature-headline {
          font-size: 28px;
          font-weight: 700;
          color: #0F172A;
        }

        .feature-description {
          font-size: 16px;
          color: #475569;
          line-height: 1.6;
        }

        .feature-image {
          width: 100%;
          height: auto;
          border-radius: 1rem;
        }

        /* Categories Section */
        .categories {
          background: #0F172A;
          padding: 6rem 2rem;
        }

        .categories .section-headline {
          color: white;
        }

        .categories .section-description {
          color: #CBD5E1;
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
        }

        .category-card {
          background: #1E293B;
          border: 1px solid #334155;
          padding: 2rem;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.2s;
        }

        .category-card:hover {
          background: #334155;
          border-color: #475569;
        }

        .category-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 0.75rem;
        }

        .category-name {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .category-label {
          font-size: 14px;
          color: #94A3B8;
        }

        /* Secondary Features */
        .secondary-features {
          background: white;
          padding: 6rem 2rem;
        }

        .secondary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .secondary-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .secondary-icon-box {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 0.75rem;
        }

        .secondary-name {
          font-size: 18px;
          font-weight: 700;
          color: #0F172A;
        }

        .secondary-desc {
          font-size: 15px;
          color: #475569;
          line-height: 1.6;
        }

        /* Social Proof */
        .social-proof {
          background: #F8FAFC;
          padding: 4rem 2rem;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          margin-bottom: 4rem;
          text-align: center;
        }

        .stat-item {
          padding: 2rem;
          border-right: 1px solid #E2E8F0;
        }

        .stat-item:last-child {
          border-right: none;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 800;
          color: #0D9488;
        }

        .stat-label {
          font-size: 14px;
          color: #475569;
          margin-top: 0.5rem;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
        }

        .testimonial {
          background: white;
          padding: 2rem;
          border-radius: 1rem;
          border: 1px solid #E2E8F0;
        }

        .testimonial-text {
          font-size: 15px;
          color: #475569;
          margin-bottom: 1.5rem;
          line-height: 1.6;
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .testimonial-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .testimonial-info {
          display: flex;
          flex-direction: column;
        }

        .testimonial-name {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
        }

        .testimonial-role {
          font-size: 12px;
          color: #64748B;
        }

        /* Final CTA */
        .final-cta {
          background: linear-gradient(135deg, #0F172A 0%, #134E4A 100%);
          padding: 6rem 2rem;
          text-align: center;
          color: white;
        }

        .final-headline {
          font-size: 52px;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .final-subline {
          font-size: 18px;
          color: #CBD5E1;
          max-width: 600px;
          margin: 0 auto 2rem;
          line-height: 1.6;
        }

        .btn-final-cta {
          background: #14B8A6;
          color: #0F172A;
          border: none;
          padding: 1rem 2rem;
          border-radius: 0.75rem;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 2rem;
        }

        .btn-final-cta:hover {
          background: #0D9488;
        }

        .final-trust {
          font-size: 14px;
          color: #94A3B8;
        }

        /* Footer */
        .footer {
          background: #0F172A;
          color: #CBD5E1;
          padding: 4rem 2rem 2rem;
        }

        .footer-content {
          max-width: 1280px;
          margin: 0 auto;
        }

        .footer-top {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .footer-logo {
          font-size: 20px;
          font-weight: 800;
          color: #14B8A6;
        }

        .footer-tagline {
          font-size: 14px;
          line-height: 1.6;
          color: #94A3B8;
        }

        .footer-column h3 {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: white;
        }

        .footer-column ul {
          list-style: none;
        }

        .footer-column li {
          margin-bottom: 1rem;
        }

        .footer-column a {
          color: #CBD5E1;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .footer-column a:hover {
          color: #14B8A6;
        }

        .footer-divider {
          border-top: 1px solid #334155;
          margin: 2rem 0;
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .social-icons {
          display: flex;
          gap: 1.5rem;
        }

        .social-icon {
          color: #CBD5E1;
          width: 20px;
          height: 20px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .social-icon:hover {
          color: #14B8A6;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .nav-desktop {
            display: none;
          }

          .hamburger {
            display: block;
          }

          .hero-headline {
            font-size: 48px;
          }

          .hero-subheadline {
            font-size: 16px;
          }

          .hero-ctas {
            flex-direction: column;
            align-items: center;
          }

          .section-headline {
            font-size: 36px;
          }

          .cards-grid {
            grid-template-columns: 1fr;
          }

          .feature-block {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .categories-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .secondary-grid {
            grid-template-columns: 1fr;
          }

          .stats-row {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .stat-item {
            border-right: none;
            border-bottom: 1px solid #E2E8F0;
            padding: 1.5rem;
          }

          .stat-item:last-child {
            border-bottom: none;
          }

          .testimonials-grid {
            grid-template-columns: 1fr;
          }

          .footer-top {
            grid-template-columns: 1fr;
          }

          .footer-bottom {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .trust-hero {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>

      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-tre">tre</span>
            <span className="logo-vu">vu</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            <a href="#features">Features</a>
            <a href="#categories">Categories</a>
            <Link href="/discover">Discover Trips</Link>
            <Link href="/pricing">Pricing</Link>
          </nav>

          {/* Right side - Auth buttons */}
          <div className="nav-right">
            <Link href="/login" className="btn-login">Log in</Link>
            <Link href="/register" className="btn-primary">Get Started</Link>
          </div>

          {/* Mobile Menu */}
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1rem 2rem',
              borderTop: '1px solid #E2E8F0',
            }}
          >
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#categories" onClick={() => setMobileMenuOpen(false)}>Categories</a>
            <Link href="/discover" onClick={() => setMobileMenuOpen(false)}>Discover Trips</Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
            <Link href="/register" className="btn-primary" style={{textAlign:'center'}} onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Now in Early Access — Central Europe
          </div>

          <h1 className="hero-headline">Trek beyond ordinary</h1>

          <p className="hero-subheadline">
            The all-in-one adventure platform that replaces your trip planner,
            expense splitter, offline maps, and five other apps — so you can
            focus on the trail ahead.
          </p>

          <div className="hero-ctas">
            <Link href="/register" className="btn-cta-primary">Start Planning Free →</Link>
            <Link href="/discover" className="btn-cta-secondary">Explore Trips</Link>
          </div>

          <img
            src="https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=1200&q=80&fit=crop&auto=format"
            alt="Adventure sailboat"
            className="hero-image"
            loading="lazy"
          />

          <div className="hero-trust">
            <span className="trust-text">Trusted by adventurers across</span>
            <div className="trust-countries">
              <span className="trust-country">
                <MapPin size={16} />
                Hungary
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                Slovakia
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                Croatia
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                Germany
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem">
        <div className="section-container">
          <span className="section-tag tag-coral">THE PROBLEM</span>
          <h2 className="section-headline">One adventure. Seven apps. Zero fun.</h2>
          <p className="section-description">
            Trip planner here, expense tracker there, offline maps somewhere
            else. By the time you've organized your tools, you've lost the
            spark that made you want to go in the first place.
          </p>

          <div className="cards-grid">
            <div className="card">
              <div className="card-headline">Plan your adventure</div>
              <p className="card-text">
                Choose from 8 adventure categories. Add waypoints, set
                difficulty, pack the right gear — all in one place.
              </p>
            </div>
            <div className="card">
              <div className="card-headline">Go together, split fairly</div>
              <p className="card-text">
                Invite your crew, split costs in any currency, and settle
                debts with one tap. No more awkward spreadsheets after the
                trip.
              </p>
            </div>
            <div className="card">
              <div className="card-headline">
                Stay connected, even offline
              </div>
              <p className="card-text">
                Full offline support means your plans, maps, and packing lists
                work at the summit, on the water, or deep in the forest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-container">
          <span className="section-tag tag-teal">CORE FEATURES</span>
          <h2 className="section-headline">Your adventure multitool</h2>
          <p className="section-description">
            Everything you need, nothing you don't. Each feature is
            purpose-built for outdoor adventures.
          </p>

          {/* Feature 1 */}
          <div className="feature-block">
            <div className="feature-content">
              <div
                className="feature-icon-box"
                style={{ backgroundColor: '#CCF0EB' }}
              >
                <Zap size={32} color="#0D9488" />
              </div>
              <h3 className="feature-headline">Smart Trip Planning</h3>
              <p className="feature-description">
                Build trips across 8 adventure categories with category-specific
                planning tools. From elevation profiles for hikers to avalanche
                risk for skiers — every sport gets the intelligence it deserves.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80&fit=crop&auto=format"
              alt="Smart trip planning"
              className="feature-image"
              loading="lazy"
            />
          </div>

          {/* Feature 2 */}
          <div className="feature-block reversed">
            <div className="feature-content">
              <div
                className="feature-icon-box"
                style={{ backgroundColor: '#FCE7E6' }}
              >
                <Wallet size={32} color="#FB7185" />
              </div>
              <h3 className="feature-headline">Effortless Expense Splitting</h3>
              <p className="feature-description">
                Multi-currency cost splitting that actually understands group
                trips. Add expenses on the go, see who owes what instantly, and
                export clean reports when you're home.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80&fit=crop&auto=format"
              alt="Expense splitting"
              className="feature-image"
              loading="lazy"
            />
          </div>

          {/* Feature 3 */}
          <div className="feature-block">
            <div className="feature-content">
              <div
                className="feature-icon-box"
                style={{ backgroundColor: '#F3E8FF' }}
              >
                <WifiOff size={32} color="#A78BFA" />
              </div>
              <h3 className="feature-headline">Offline-First, Always Ready</h3>
              <p className="feature-description">
                Your plans, maps, and packing lists work without internet.
                Because summits, rivers, and forests don't come with Wi-Fi.
                Everything syncs automatically when you're back online.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80&fit=crop&auto=format"
              alt="Offline maps"
              className="feature-image"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories" id="categories">
        <div className="section-container">
          <span className="section-tag tag-light">8 ADVENTURE CATEGORIES</span>
          <h2 className="section-headline">One platform. Every adventure.</h2>
          <p className="section-description">
            Whether you're summiting peaks, catching waves, or pedaling through
            valleys — trevu speaks your sport's language.
          </p>

          <div className="categories-grid">
            {categories.map((cat, idx) => {
              const IconComponent = cat.icon;
              return (
                <div key={idx} className="category-card">
                  <div
                    className="category-icon-box"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    <IconComponent size={28} color={cat.color} />
                  </div>
                  <div className="category-name">{cat.name}</div>
                  <div className="category-label">{cat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secondary Features */}
      <section className="secondary-features">
        <div className="section-container">
          <span className="section-tag tag-teal">MORE TO EXPLORE</span>
          <h2 className="section-headline">
            Built for the way adventurers actually travel
          </h2>

          <div className="secondary-grid">
            {secondaryFeatures.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="secondary-card">
                  <div
                    className="secondary-icon-box"
                    style={{ backgroundColor: feature.color + '20' }}
                  >
                    <IconComponent size={28} color={feature.color} />
                  </div>
                  <div className="secondary-name">{feature.name}</div>
                  <div className="secondary-desc">{feature.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="social-proof">
        <div className="section-container">
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-number">8</div>
              <div className="stat-label">Adventure Categories</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Offline Capable</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">16+</div>
              <div className="stat-label">Integrated Services</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">7</div>
              <div className="stat-label">Languages Supported</div>
            </div>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial, idx) => (
              <div key={idx} className="testimonial">
                <p className="testimonial-text">"{testimonial.text}"</p>
                <div className="testimonial-author">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.author}
                    className="testimonial-avatar"
                    loading="lazy"
                  />
                  <div className="testimonial-info">
                    <div className="testimonial-name">{testimonial.author}</div>
                    <div className="testimonial-role">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="section-container">
          <h2 className="final-headline">Your next adventure starts here</h2>
          <p className="final-subline">
            Join thousands of adventurers across Central Europe who plan, share,
            and explore with trevu.
          </p>
          <Link href="/register" className="btn-final-cta">Start Planning Free →</Link>
          <div className="final-trust">
            Free forever for personal use. No credit card required.
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">trevu</div>
              <p className="footer-tagline">
                Trek beyond ordinary. The all-in-one adventure platform for
                Central Europe and beyond.
              </p>
            </div>

            <div className="footer-column">
              <h3>Product</h3>
              <ul>
                <li>
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#categories">Categories</a>
                </li>
                <li>
                  <Link href="/pricing">Pricing</Link>
                </li>
                <li>
                  <a href="#">Roadmap</a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>Company</h3>
              <ul>
                <li>
                  <a href="#">About</a>
                </li>
                <li>
                  <a href="#">Blog</a>
                </li>
                <li>
                  <a href="#">Careers</a>
                </li>
                <li>
                  <a href="#">Contact</a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>Legal</h3>
              <ul>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
                <li>
                  <a href="#">Terms of Service</a>
                </li>
                <li>
                  <a href="#">Cookie Policy</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <div>© 2026 Trevu. All rights reserved.</div>
            <div className="social-icons">
              <Instagram className="social-icon" />
              <Twitter className="social-icon" />
              <Facebook className="social-icon" />
              <Youtube className="social-icon" />
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
