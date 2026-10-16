import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RingEditorPage } from '../app/pages/RingEditorPage';
import '../styles/ring-editor.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <RingEditorPage />
  </StrictMode>,
);
