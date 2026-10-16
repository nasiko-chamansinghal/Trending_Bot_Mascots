import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EmotionBallPage } from '../app/pages/EmotionBallPage';
import '../styles/emotion-ball.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <EmotionBallPage />
  </StrictMode>,
);
