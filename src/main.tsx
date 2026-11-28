import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/style.css';
import { noSelect } from './ui/noselect';
import { mark } from './perf';
import { registerSW } from './sw-register';

mark('程式下載好');
registerSW();

noSelect(); // 遊戲畫面不能長按／右鍵反白（樂園介面設計原則）

createRoot(document.getElementById('root')!).render(<App />);
