import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/style.css';
import { mark } from './perf';
import { registerSW } from './sw-register';

mark('程式下載好');
registerSW();

createRoot(document.getElementById('root')!).render(<App />);
