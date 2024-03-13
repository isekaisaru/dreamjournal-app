// pages/index.tsx
import React, { useEffect, useState } from 'react';
import { fetchDreams } from '../servicesモジュール/dreamService';
import DreamCard from '../components/DreamCard';

const HomePage = () => {
  const [dreams, setDreams] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const fetchedDreams = await fetchDreams();
      setDreams(fetchedDreams);
    };

    loadData();
  }, []);

  return (
    <div>
      {dreams.map(dream => (
        <DreamCard key={dream.id} title={dream.title} description={dream.description} />
      ))}
    </div>
  );
};

export default HomePage;
