// services/dreamService.ts
import axios from 'axios';

const API_ENDPOINT = 'http://localhost:8000/api/dreams';

export const fetchDreams = async () => {
  try {
    const response = await axios.get(API_ENDPOINT);
    return response.data;
  } catch (error) {
    console.error("APIから夢のデータを取得できませんでした。", error);
    return [];
  }
};
