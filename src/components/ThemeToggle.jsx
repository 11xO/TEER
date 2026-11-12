import { useTheme } from '../context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن';
  return <button type="button" className="settings-icon theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
    <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} aria-hidden="true" />
  </button>;
}
