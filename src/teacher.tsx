import { createRoot } from 'react-dom/client';
import { TeacherPage } from './ui/TeacherPage';
import './ui/style.css';
import './ui/teacher.css';

createRoot(document.getElementById('root')!).render(<TeacherPage />);
