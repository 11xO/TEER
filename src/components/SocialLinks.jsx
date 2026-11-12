import { useApp } from '../context/AppContext.jsx';
import { Icon } from './ui.jsx';
export default function SocialLinks({ floating = false }) {
  const { socialLinks } = useApp();
  if (!socialLinks.length) return null;
  return <div className={floating ? 'social-fab' : `social-grid ${socialLinks.length > 1 ? 'two-cols' : ''}`}>{socialLinks.map((link) => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer" className={`${floating ? '' : 'social-btn '}${link.key}`} aria-label={link.label}><Icon name={link.icon} brand />{!floating && <span>{link.label}</span>}</a>)}</div>;
}
