"use client";

import { useRouter } from "next/navigation";

export default function Landing() {
  const router = useRouter();

  const handlePlayClick = () => {
    router.push('/login');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #8b5a2b 0%, #e8be82 50%, #8b5a2b 100%)',
      fontFamily: "'VT323', monospace",
      color: '#3e1f08',
    }}>
      <h1 style={{
        fontSize: '3rem',
        marginBottom: '2rem',
        textShadow: '2px 2px 0 rgba(0, 0, 0, 0.3)',
        textAlign: 'center',
      }}>
        Base Realms
      </h1>
      <button
        onClick={handlePlayClick}
        style={{
          backgroundColor: '#e8be82',
          border: '2px solid #8b5a2b',
          borderRadius: '4px',
          padding: '12px 24px',
          fontSize: '1.5rem',
          fontFamily: 'inherit',
          color: '#3e1f08',
          fontWeight: 'bold',
          cursor: 'pointer',
          transition: 'transform 0.1s',
          boxShadow: `
            inset 0 0 8px rgba(139, 69, 19, 0.2),
            0 2px 0 #8b5a2b,
            0 3px 0 rgba(0, 0, 0, 0.3)
          `,
          textShadow: '0 1px 0 rgba(255, 255, 255, 0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(1px)';
          e.currentTarget.style.boxShadow = `
            inset 0 0 8px rgba(139, 69, 19, 0.2),
            0 1px 0 #8b5a2b,
            0 2px 0 rgba(0, 0, 0, 0.3)
          `;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `
            inset 0 0 8px rgba(139, 69, 19, 0.2),
            0 2px 0 #8b5a2b,
            0 3px 0 rgba(0, 0, 0, 0.3)
          `;
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(2px)';
          e.currentTarget.style.boxShadow = 'inset 0 0 8px rgba(139, 69, 19, 0.2)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = `
            inset 0 0 8px rgba(139, 69, 19, 0.2),
            0 2px 0 #8b5a2b,
            0 3px 0 rgba(0, 0, 0, 0.3)
          `;
        }}
      >
        Play
      </button>
    </div>
  );
}
