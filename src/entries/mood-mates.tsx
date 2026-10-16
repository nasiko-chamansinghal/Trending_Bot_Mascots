import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MoodMatesPage } from '../app/pages/MoodMatesPage';
import '../styles/mood-mates.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <MoodMatesPage />
  </StrictMode>,
);
