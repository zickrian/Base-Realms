"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import styles from "./landing.module.css";

export default function Landing() {
  const router = useRouter();
  const { isConnected, isConnecting } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isConnected && !isConnecting) {
      router.replace('/home');
    }
  }, [mounted, isConnected, isConnecting, router]);

  const handlePlayClick = () => {
    setMobileMenuOpen(false);
    router.push('/login');
  };

  if (!mounted) return <div className={styles.container} />;

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        {/* Mobile: Hamburger (strip tiga) */}
        <button
          type="button"
          className={styles.navHamburger}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>

        {/* Logo on Left (hidden on mobile, logo not in middle) */}
        <div className={styles.navLogo}>
          <Image 
            src="/logoke.png" 
            alt="Base Realms" 
            width={150} 
            height={80} 
            style={{ width: '100%', height: 'auto' }}
            priority
          />
        </div>

        {/* Links Center (desktop only) */}
        <div className={styles.navLinks}>
          <a href="#" className={styles.navLink}>Home</a>
          <a href="#" className={styles.navLink}>Docs</a>
          <a href="#" className={styles.navLink}>Tutorial</a>
          <a href="#" className={styles.navLink}>Economy</a>
        </div>
        
        {/* Play Button Right (desktop: visible, mobile: in drawer) */}
        <div className={styles.navRight}>
          <button
            type="button"
            className={styles.playButtonWrap}
            onClick={handlePlayClick}
            aria-label="Play Now"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/playterbaru.svg"
              alt=""
              className={styles.playButtonSvg}
              width={200}
              height={52}
            />
            <span className={styles.playNowLabel}>Play Now</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer (open when hamburger clicked) - no logo in middle */}
      <div
        className={`${styles.navDrawerBackdrop} ${mobileMenuOpen ? styles.navDrawerBackdropOpen : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden
      />
      <div className={`${styles.navDrawer} ${mobileMenuOpen ? styles.navDrawerOpen : ''}`}>
        <div className={styles.navDrawerHeader}>
          <button
            type="button"
            className={styles.navDrawerClose}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>
        <div className={styles.navDrawerLinks}>
          <a href="#" className={styles.navDrawerLink} onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#" className={styles.navDrawerLink} onClick={() => setMobileMenuOpen(false)}>Docs</a>
          <a href="#" className={styles.navDrawerLink} onClick={() => setMobileMenuOpen(false)}>Tutorial</a>
          <a href="#" className={styles.navDrawerLink} onClick={() => setMobileMenuOpen(false)}>Economy</a>
        </div>
      </div>

      {/* Hero Section */}
      <header className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          {/* NO LOGO HERE as requested "di hero jangan kasih logo base realms di kiri atas aja" interpreted as move logo to navbar only */}
          
          <h1 className={styles.heroSubtitle}>
            Mint a Character for Free,<br />
            Enter Battles, and<br />
            Compete to Win Rewards!
          </h1>
        </div>
        
        {/* NO Scroll Indicator as requested */}
      </header>

      {/* Main Content (Connect & Economy) - Ensure visible for scrolling test */}
      <section className={styles.section}>
        <div className={styles.cardGrid}>
          {/* Card 1 */}
          <div className={styles.pixelCard}>
            <div style={{ 
              width: 100, height: 100, 
              background: '#000', 
              borderRadius: '50%',
              border: '4px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
               <Image src="/avatar/avatar1.svg" alt="Char" width={80} height={80} />
            </div>
            <h2 className={styles.cardTitle}>1. Connect and Start</h2>
            <p className={styles.cardText}>
              Welcome to Base Realms - where strategy meets fortune. 
              Mint your hero and step into the arena.
              <br/><br/>
              Whether you&apos;re here to fight or collect, the realm is open.
            </p>
          </div>

          {/* Card 2 */}
          <div className={styles.pixelCard}>
            <div style={{ 
              width: 100, height: 100, 
              background: '#000', 
              borderRadius: '50%',
              border: '4px solid #fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', color: '#fcd34d'
            }}>
               IDRX
            </div>
            <h2 className={styles.cardTitle}>2. Join the Economy</h2>
            <p className={styles.cardText}>
              Earn IDRX through battles. Stake in the Battle Bank. 
              The more you play, the more you earn.
              <br/><br/>
              Transparent, onchain, and fair.
            </p>
          </div>
        </div>
      </section>

      {/* Character Showcase - same bg as section above (masukrumah.png) */}
      <section className={`${styles.section} ${styles.showcaseSection}`}>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <h2 style={{ fontSize: '3rem', color: '#fff', textShadow: '2px 2px 0 rgba(0,0,0,0.2)', marginBottom: '3rem' }}>
            MEET THE WARRIORS
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
             {['1000.png', '955.png', '819.png'].map((img, i) => (
               <div key={i} style={{ 
                 background: '#fff', padding: '10px 10px 40px 10px', 
                 transform: `rotate(${i % 2 === 0 ? '-3deg' : '3deg'})`,
                 boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
               }}>
                 <Image src={`/${img}`} alt="Warrior" width={200} height={200} style={{ border: '1px solid #eee' }} />
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* Footer: logo top, then one row left copyright / right legal */}
      <footer className={styles.footerSection}>
        <div className={styles.footerGrid}>
          <div className={styles.footerLogoWrap}>
            <Image
              src="/logoke.png"
              alt="Base Realms"
              width={200}
              height={100}
              className={styles.footerLogoImg}
            />
          </div>
          <div className={styles.footerBottomRow}>
            <div className={styles.footerCopyright}>
              2026 Base Realms. All rights reserved.
            </div>
            <div className={styles.footerLegal}>
              <a href="#">Terms of Service</a>
              <span className={styles.footerLegalDot}>·</span>
              <a href="#">Privacy Policy</a>
              <span className={styles.footerLegalDot}>·</span>
              <a href="#">Docs</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
