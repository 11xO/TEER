import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  componentDidCatch(error, info) { console.error('App error', error, info); }
  render() {
    if (this.state.error) return <div className="waiting-screen"><div className="waiting-card"><div className="waiting-title">حصل خطأ أثناء فتح التطبيق</div><p className="waiting-desc">أعد تحميل الصفحة للمحاولة مرة أخرى</p><button className="btn-main" onClick={() => location.reload()}>إعادة التحميل</button></div></div>;
    return this.props.children;
  }
}
