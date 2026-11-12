import { Empty, Icon, Loader, Modal } from './ui.jsx';
import { useApp } from '../context/AppContext.jsx';
export default function AreaPicker({ value, onSelect, onClose }) {
  const { areas, areasLoading, areasError } = useApp();
  return <Modal id="areaSheet" title="اختر منطقتك" subtitle="اضغط على المنطقة" icon="fa-map-marker-alt" gradient="linear-gradient(135deg,var(--warning),#d97706)" onClose={onClose}>
    {areasLoading ? <Loader /> : areasError ? <Empty icon="fa-wifi" message="تعذر تحميل المناطق، تأكد من الاتصال" /> : !areas.length ? <Empty icon="fa-map" message="لا توجد مناطق" /> : areas.map((area) => <button type="button" className="dest-option area-option" key={area} onClick={() => onSelect(area)} style={area === value ? { borderColor: 'var(--primary)', background: 'rgba(139,92,246,.1)' } : undefined}>
      <Icon name="fa-map-marker-alt" /><span className="name" style={{ flex: 1 }}>{area}</span>{area === value && <Icon name="fa-check-circle" style={{ color: 'var(--success)' }} />}
    </button>)}
  </Modal>;
}
