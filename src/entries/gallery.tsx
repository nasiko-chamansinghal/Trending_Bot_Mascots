import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GalleryPage } from '../app/pages/GalleryPage';
import '../styles/gallery.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <GalleryPage />
  </StrictMode>,
);
