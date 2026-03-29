'use client';

import Link from 'next/link';
import {
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
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AppHeader } from '@/components/AppHeader';

export default function HomePage() {
  const { t } = useTranslation();

  const categories = [
    {
      name: t('categories.hiking'),
      icon: Mountain,
      color: '#22C55E',
      label: t('landing.categoryHikingLabel'),
    },
    {
      name: t('categories.mountaineering'),
      icon: Triangle,
      color: '#F97316',
      label: t('landing.categoryMountainLabel'),
    },
    {
      name: t('categories.waterSports'),
      icon: Waves,
      color: '#3B82F6',
      label: t('landing.categoryWaterLabel'),
    },
    {
      name: t('categories.cycling'),
      icon: Bike,
      color: '#EAB308',
      label: t('landing.categoryCyclingLabel'),
    },
    {
      name: t('categories.motorsport'),
      icon: Gauge,
      color: '#B91C1C',
      label: t('landing.categoryMotorsportLabel'),
    },
    {
      name: t('categories.running'),
      icon: Timer,
      color: '#EF4444',
      label: t('landing.categoryRunningLabel'),
    },
    {
      name: t('categories.winterSports'),
      icon: Snowflake,
      color: '#06B6D4',
      label: t('landing.categoryWinterLabel'),
    },
    {
      name: t('categories.expedition'),
      icon: Compass,
      color: '#8B5CF6',
      label: t('landing.categoryExpeditionLabel'),
    },
  ];

  const secondaryFeatures = [
    {
      name: t('landing.secondaryCommunity'),
      icon: Users,
      color: '#0D9488',
      desc: t('landing.secondaryCommunityDesc'),
    },
    {
      name: t('landing.secondarySafety'),
      icon: Shield,
      color: '#FB7185',
      desc: t('landing.secondarySafetyDesc'),
    },
    {
      name: t('landing.secondaryPacking'),
      icon: Package,
      color: '#FBBF24',
      desc: t('landing.secondaryPackingDesc'),
    },
    {
      name: t('landing.secondaryWeather'),
      icon: CloudSun,
      color: '#06B6D4',
      desc: t('landing.secondaryWeatherDesc'),
    },
    {
      name: t('landing.secondaryBooking'),
      icon: Plane,
      color: '#A78BFA',
      desc: t('landing.secondaryBookingDesc'),
    },
    {
      name: t('landing.secondaryLanguages'),
      icon: Languages,
      color: '#22C55E',
      desc: t('landing.secondaryLanguagesDesc'),
    },
  ];

  const testimonials = [
    {
      text: t('landing.testimonial1Text'),
      author: t('landing.testimonial1Author'),
      role: t('landing.testimonial1Role'),
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&q=80&fit=crop&auto=format',
    },
    {
      text: t('landing.testimonial2Text'),
      author: t('landing.testimonial2Author'),
      role: t('landing.testimonial2Role'),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&q=80&fit=crop&auto=format',
    },
    {
      text: t('landing.testimonial3Text'),
      author: t('landing.testimonial3Author'),
      role: t('landing.testimonial3Role'),
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
          display: block;
          max-width: 900px;
          width: 100%;
          height: 500px;
          object-fit: cover;
          border-radius: 1rem;
          margin: 0 auto 3rem;
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

      <AppHeader anchors={[
        { label: t('nav.features'), href: '#features' },
        { label: t('nav.categories'), href: '#categories' },
        { label: t('nav.about'), href: '#about' },
      ]} />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            {t('landing.heroBadge')}
          </div>

          <h1 className="hero-headline">{t('landing.heroHeadline')}</h1>

          <p className="hero-subheadline">
            {t('landing.heroSubheadline')}
          </p>

          <div className="hero-ctas">
            <Link href="/register" className="btn-cta-primary">{t('landing.heroCta')}</Link>
            <Link href="/discover" className="btn-cta-secondary">{t('landing.heroCtaSecondary')}</Link>
          </div>

          <img
            src="https://images.unsplash.com/photo-1504681869696-d977211a5f4c?w=1200&q=80&fit=crop&auto=format"
            alt="Adventure sailboat"
            className="hero-image"
            loading="lazy"
          />

          <div className="hero-trust">
            <span className="trust-text">{t('landing.heroTrust')}</span>
            <div className="trust-countries">
              <span className="trust-country">
                <MapPin size={16} />
                {t('landing.heroCountryHungary')}
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                {t('landing.heroCountrySlovakia')}
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                {t('landing.heroCountryCroatia')}
              </span>
              <span className="trust-country">
                <MapPin size={16} />
                {t('landing.heroCountryGermany')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem">
        <div className="section-container">
          <span className="section-tag tag-coral">{t('landing.problemTag')}</span>
          <h2 className="section-headline">{t('landing.problemHeadline')}</h2>
          <p className="section-description">
            {t('landing.problemDescription')}
          </p>

          <div className="cards-grid">
            <div className="card">
              <div className="card-headline">{t('landing.problemCard1Title')}</div>
              <p className="card-text">{t('landing.problemCard1Text')}</p>
            </div>
            <div className="card">
              <div className="card-headline">{t('landing.problemCard2Title')}</div>
              <p className="card-text">{t('landing.problemCard2Text')}</p>
            </div>
            <div className="card">
              <div className="card-headline">{t('landing.problemCard3Title')}</div>
              <p className="card-text">{t('landing.problemCard3Text')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="section-container">
          <span className="section-tag tag-teal">{t('landing.featuresTag')}</span>
          <h2 className="section-headline">{t('landing.featuresHeadline')}</h2>
          <p className="section-description">
            {t('landing.featuresDescription')}
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
              <h3 className="feature-headline">{t('landing.feature1Title')}</h3>
              <p className="feature-description">
                {t('landing.feature1Description')}
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
              <h3 className="feature-headline">{t('landing.feature2Title')}</h3>
              <p className="feature-description">
                {t('landing.feature2Description')}
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
              <h3 className="feature-headline">{t('landing.feature3Title')}</h3>
              <p className="feature-description">
                {t('landing.feature3Description')}
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
          <span className="section-tag tag-light">{t('landing.categoriesTag')}</span>
          <h2 className="section-headline">{t('landing.categoriesHeadline')}</h2>
          <p className="section-description">
            {t('landing.categoriesDescription')}
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
          <span className="section-tag tag-teal">{t('landing.moreTag')}</span>
          <h2 className="section-headline">
            {t('landing.moreHeadline')}
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
              <div className="stat-label">{t('landing.statCategories')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">{t('landing.statOffline')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">16+</div>
              <div className="stat-label">{t('landing.statServices')}</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">7</div>
              <div className="stat-label">{t('landing.statLanguages')}</div>
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
          <h2 className="final-headline">{t('landing.finalHeadline')}</h2>
          <p className="final-subline">
            {t('landing.finalSubline')}
          </p>
          <Link href="/register" className="btn-final-cta">{t('landing.finalCta')}</Link>
          <div className="final-trust">
            {t('landing.finalTrust')}
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
                {t('landing.footerTagline')}
              </p>
            </div>

            <div className="footer-column">
              <h3>{t('landing.footerProduct')}</h3>
              <ul>
                <li>
                  <a href="#features">{t('landing.footerFeatures')}</a>
                </li>
                <li>
                  <a href="#categories">{t('landing.footerCategories')}</a>
                </li>
                <li>
                  <a href="#" title="Coming soon" className="opacity-50 cursor-default">{t('landing.footerPricing')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerRoadmap')}</a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>{t('landing.footerCompany')}</h3>
              <ul>
                <li>
                  <a href="#">{t('landing.footerAbout')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerBlog')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerCareers')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerContact')}</a>
                </li>
              </ul>
            </div>

            <div className="footer-column">
              <h3>{t('landing.footerLegal')}</h3>
              <ul>
                <li>
                  <a href="#">{t('landing.footerPrivacy')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerTerms')}</a>
                </li>
                <li>
                  <a href="#">{t('landing.footerCookies')}</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-divider"></div>

          <div className="footer-bottom">
            <div>{t('landing.footerCopyright')}</div>
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
