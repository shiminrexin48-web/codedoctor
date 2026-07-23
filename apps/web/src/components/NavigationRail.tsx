import type { ActiveView } from '../workbenchState.js';

const navigationItems: Array<{ value: ActiveView; icon: string; label: string }> = [
  { value: 'overview', icon: '⌂', label: '总览' },
  { value: 'issues', icon: '⚑', label: '问题' },
  { value: 'ai', icon: 'AI', label: 'AI' },
  { value: 'reports', icon: '▣', label: '报告' }
];

export function NavigationRail({ activeView, onChange }: { activeView: ActiveView; onChange: (view: ActiveView) => void }) {
  return (
    <nav className="app-rail" aria-label="CodeDoctor 导航">
      <div className="rail-logo">CD</div>
      {navigationItems.map((item) => (
        <button
          aria-label={item.label}
          className={`rail-item ${activeView === item.value ? 'active' : ''}`}
          key={item.value}
          title={item.label}
          onClick={() => onChange(item.value)}
        >
          <strong>{item.icon}</strong>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
