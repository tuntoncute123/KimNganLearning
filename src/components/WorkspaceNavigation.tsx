import { GraduationCap, Presentation, School } from 'lucide-react';

import type { ApplicationPage } from '../hooks/useApplicationRoute';

export function WorkspaceNavigation({ page, beforeNavigate }: { page: ApplicationPage; beforeNavigate: () => Promise<boolean> }) {
  return <nav className="application-navigation" aria-label="Khu vực ứng dụng">
    {[{ id: 'workspace', label: 'Phòng giảng bài', Icon: Presentation }, { id: 'teacher', label: 'Giáo viên', Icon: School }, { id: 'student', label: 'Học sinh', Icon: GraduationCap }].map(({ id, label, Icon }) => <a key={id} href={`#/${id}`} aria-current={page === id ? 'page' : undefined} onClick={async event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); if (await beforeNavigate()) window.location.hash = `/${id}`;
    }}><Icon size={17} /><span>{label}</span></a>)}
    <span className="application-local-label">Dữ liệu trên thiết bị này</span>
  </nav>;
}
