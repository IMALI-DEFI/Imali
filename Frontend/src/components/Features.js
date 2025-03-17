import React from 'react';
import './Animations.css';

const Features = () => {
  const featureList = [
    { title: 'Fast Lending', description: 'Get quick access to funds anytime.' },
    { title: 'Low Interest Rates', description: 'Borrow with the lowest rates in DeFi.' },
    { title: 'Secure Platform', description: 'Safe and secure blockchain-based platform.' }
  ];

  return (
    <section style={styles.features}>
      {featureList.map((feature, index) => (
        <div key={index} style={styles.card} className="card">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
    </section>
  );
};

const styles = {
  features: { display: 'flex', justifyContent: 'center', gap: '2rem', margin: '2rem 0' },
  card: { background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', width: '250px', textAlign: 'center' }
};

export default Features;
