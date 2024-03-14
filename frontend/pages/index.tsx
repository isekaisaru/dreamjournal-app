import React, { useEffect, useState } from 'react';
import { fetchDreams } from '../services/dreamService';
import DreamCard from '../components/DreamCard';
import { Dream } from '../types';
import { GetServerSideProps } from 'next';

const HomePage = () => {
  const [dreams, setDreams] = useState<Dream[]>([]);

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
export const getServerSideProps: GetServerSideProps = async () => {
  const dreams = await fetchDreams();
  return { props: { dreams } };
};
export default HomePage;
