import React from 'react';
import './MagicBento.css';

const defaultItems = [
  {
    id: 'insights',
    title: 'Performance Insights',
    text: 'Zie in een oogopslag welke lessen stijgen in populariteit en waar capaciteit knelt.',
    accent: 'lime',
  },
  {
    id: 'automation',
    title: 'Auto Reminders',
    text: 'Plan automatische reminders voor no-show preventie en hogere opkomst.',
    accent: 'teal',
  },
  {
    id: 'security',
    title: 'MFA Adoption',
    text: 'Monitor MFA adoptie per rol en stuur gericht op beveiligingsniveau.',
    accent: 'blue',
  },
  {
    id: 'growth',
    title: 'Growth Signals',
    text: 'Volg terugkerende sporters, nieuwe aanmeldingen en engagement trends.',
    accent: 'orange',
  },
];

const MagicBento = ({ items = defaultItems }) => {
  const handleMove = (event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    card.style.setProperty('--mx', `${x}px`);
    card.style.setProperty('--my', `${y}px`);
  };

  return (
    <section className="magic-bento" aria-label="Slimme modules">
      {items.map((item) => (
        <article
          key={item.id}
          className={`bento-card accent-${item.accent}`}
          onMouseMove={handleMove}
        >
          <div className="bento-dot" aria-hidden="true" />
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </section>
  );
};

export default MagicBento;
