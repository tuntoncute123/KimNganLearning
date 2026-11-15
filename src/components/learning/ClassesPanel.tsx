import { useState } from 'react';
import { Plus, Users, Archive, Pencil, Download } from 'lucide-react';
import type { Classroom } from '../../types/learning';
import { addStudent, archiveClass, saveClass } from '../../services/learningActions';
import { downloadCsv, value } from './format';
import { EmptyPanel, FormModal, PanelHeading, type LearningPanelProps } from './shared';

export function ClassesPanel({ controller, classes, classId }: LearningPanelProps) {
  const { data, commit, busy, error, setError } = controller;
  const [editing, setEditing] = useState<Classroom | 'new' | null>(null);
  const [rosterId, setRosterId] = useState('');
  const [existingId, setExistingId] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const roster = data.classes.find(item => item.id === rosterId);
  const shown = showArchived ? data.classes.filter(item => item.archived) : classes.filter(item => !classId || item.id === classId);
  const openEditor = (item: Classroom | 'new') => { setError(''); setEditing(item); };
  return <>
    <PanelHeading title="Lớp học & học sinh" description="Tổ chức lớp học, danh sách học sinh và thông tin môn học.">
      <button className="learning-primary" onClick={() => openEditor('new')}><Plus size={17} />Tạo lớp học</button>
    </PanelHeading>
    <div className="learning-filter-row"><label className="learning-search">Tìm lớp<input type="search" placeholder="Tên lớp hoặc môn học…" value={search} onChange={event => setSearch(event.target.value)} /></label>
      <label className="learning-checkbox"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />Lớp đã lưu trữ</label></div>
    {!shown.length && <EmptyPanel title={showArchived ? 'Chưa có lớp được lưu trữ' : 'Bắt đầu với lớp học đầu tiên'}>Tạo lớp, thêm học sinh, sau đó lên lịch và giao bài tập.</EmptyPanel>}
    {!!shown.length && !shown.some(item => `${item.name} ${item.subject}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <EmptyPanel title="Không tìm thấy lớp">Thử từ khóa khác.</EmptyPanel>}
    <div className="learning-card-grid">{shown.filter(item => `${item.name} ${item.subject}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(item => <article className="learning-card" key={item.id}>
      <div className="learning-card-top"><span className="learning-subject">{item.subject}</span><span className="learning-tag">{item.archived ? 'Đã lưu trữ' : 'Đang học'}</span></div>
      <h3>{item.name}</h3><p className="learning-preserve">{item.description || 'Chưa có mô tả lớp học.'}</p>
      <div className="learning-meta"><Users size={16} />{item.studentIds.length} học sinh · {data.assignments.filter(a => a.classId === item.id).length} bài tập</div>
      <div className="learning-card-actions">
        {!item.archived && <><button onClick={() => { setError(''); setRosterId(item.id); setExistingId(''); }}>Danh sách học sinh</button><button aria-label={`Sửa lớp ${item.name}`} onClick={() => openEditor(item)}><Pencil size={16} /></button></>}
        <button disabled={busy} onClick={() => {
          if (item.archived || window.confirm(`Lưu trữ lớp “${item.name}”? Dữ liệu được giữ lại; lớp sẽ tạm ẩn khỏi trang học sinh.`)) {
            void commit(archiveClass(item.id, !item.archived), item.archived ? 'Đã khôi phục lớp học.' : 'Đã lưu trữ lớp học.');
          }
        }}><Archive size={16} />{item.archived ? 'Khôi phục lớp' : 'Lưu trữ'}</button>
      </div>
    </article>)}</div>
    {editing && <FormModal title={editing === 'new' ? 'Tạo lớp học' : 'Chỉnh sửa lớp học'} onClose={() => setEditing(null)} busy={busy} error={error}>
      <form className="learning-form" onSubmit={async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        if (await commit(saveClass({ id: editing === 'new' ? crypto.randomUUID() : editing.id, name: value(form, 'name'), subject: value(form, 'subject'), description: value(form, 'description') }), 'Đã lưu lớp học.')) setEditing(null);
      }}>
        <label>Tên lớp<input name="name" required maxLength={100} placeholder="Ví dụ: Toán 9 · Nhóm buổi tối" defaultValue={editing === 'new' ? '' : editing.name} /></label>
        <label>Môn học<input name="subject" required maxLength={100} placeholder="Ví dụ: Toán học" defaultValue={editing === 'new' ? '' : editing.subject} /></label>
        <label>Mô tả lớp<textarea name="description" maxLength={2000} rows={3} defaultValue={editing === 'new' ? '' : editing.description} /></label>
        <button className="learning-primary" type="submit">Lưu lớp học</button>
      </form>
    </FormModal>}
    {roster && <FormModal title={`Học sinh · ${roster.name}`} onClose={() => setRosterId('')} busy={busy} error={error}>
      <div className="learning-roster">{roster.studentIds.length ? roster.studentIds.map(id => {
        const student = data.students.find(item => item.id === id)!;
        return <div className="learning-person" key={id}><span className="learning-avatar">{student.name.slice(0, 1)}</span><div><strong>{student.name}</strong><p>{student.email || 'Chưa có email'}</p></div></div>;
      }) : <p className="learning-muted">Lớp chưa có học sinh. Thêm học sinh bên dưới để bắt đầu.</p>}</div>
      {!!roster.studentIds.length && <button className="learning-secondary" onClick={() => downloadCsv([
        ['Họ tên', 'Email'], ...roster.studentIds.map(id => { const student = data.students.find(item => item.id === id)!; return [student.name, student.email]; }),
      ], 'danh-sach-hoc-sinh.csv')}><Download size={16} />Xuất danh sách CSV</button>}
      <form className="learning-form learning-divider" onSubmit={async event => {
        event.preventDefault(); const element = event.currentTarget, form = new FormData(element);
        const student = data.students.find(item => item.id === existingId) ?? { id: crypto.randomUUID(), name: value(form, 'name'), email: value(form, 'email') };
        if (await commit(addStudent(roster.id, student), `Đã thêm ${student.name} vào lớp.`)) { element.reset(); setExistingId(''); }
      }}>
        <h3>Thêm học sinh vào lớp</h3>
        <label>Hồ sơ học sinh<select value={existingId} onChange={event => setExistingId(event.target.value)}><option value="">Tạo hồ sơ mới</option>{data.students.filter(item => !roster.studentIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}{item.email ? ` · ${item.email}` : ''}</option>)}</select></label>
        {!existingId && <><label>Họ tên học sinh<input name="name" required maxLength={100} /></label><label>Email (không bắt buộc)<input name="email" type="email" maxLength={254} /></label></>}
        <button className="learning-primary" type="submit"><Plus size={16} />Thêm học sinh</button>
      </form>
    </FormModal>}
  </>;
}
