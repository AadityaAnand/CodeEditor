import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-text">
          <h2>Collaborate on code — in real time</h2>
          <p>Open projects, invite collaborators, see presence and cursors, and revert to previous versions. Built with React, Monaco, Socket.io and MongoDB.</p>
        </div>
        <div className="hero-cta">
          <a className="btn primary" href="#editor">Try the editor</a>
        </div>
      </div>
    </section>
  );
}
