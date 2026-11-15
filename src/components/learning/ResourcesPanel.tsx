import { useState } from 'react';
import { BookOpen, Download, Plus, Trash2, Megaphone } from 'lucide-react';
import { getDocumentById } from '../../services/db';
import { publishAnnouncement, shareResource } from '../../services/learningActions';
import { dateLabel, downloadBlob, value } from './format';
import { ClassField, EmptyPanel, FormModal, PanelHeading, type LearningPanelProps } from './shared';

export function ResourcesPanel({ controller, classes, classId, role, documents, onOpenDocument }: LearningPanelProps) {
  const { data, busy, error, setError, commit } = controller;
  const [adding, setAdding] = useState(false);
  const [downloading, setDownloading] = useState('');
  const [query, setQuery] = useState('');
  const resources = data.resources.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId) && item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <>
    <PanelHeading title="Học liệu của lớp" description="Tài liệu được giáo viên chia sẻ từ kho bài giảng trên thiết bị này.">
      {role === 'teacher' && <><a className="learning-secondary" href="#/workspace">Mở kho bài giảng</a><button className="learning-primary" disabled={!classes.length || !documents.length} onClick={() => { setError(''); setAdding(true); }}><Plus size={17} />Chia sẻ học liệu</button></>}
    </PanelHeading>
    {role === 'teacher' && !documents.length && <p className="learning-notice">Tải tài liệu trong Phòng giảng bài trước, rồi quay lại chia sẻ cho lớp.</p>}
    <label className="learning-search">Tìm học liệu<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nhập tên học liệu…" /></label>
    {!resources.length && <EmptyPanel title="Chưa có học liệu phù hợp">{role === 'teacher' ? 'Chọn tài liệu trong kho và chia sẻ cho lớp học.' : 'Học liệu được chia sẻ cho lớp của em sẽ xuất hiện ở đây.'}</EmptyPanel>}
    <div className="learning-card-grid">{resources.map(item => {
      const document = documents.find(doc => doc.id === item.documentId);
      return <article className="learning-card" key={item.id}><div className="learning-card-top"><BookOpen size={22} /><span className="learning-subject">{classes.find(c => c.id === item.classId)?.name}</span></div><h3>{item.title}</h3>
        <p>{document ? `${document.name} · ${(document.size / 1024 / 1024).toFixed(1)} MB` : 'Tài liệu không còn trên thiết bị. Giáo viên cần chia sẻ lại.'}</p>
        <div className="learning-card-actions"><button disabled={!document} onClick={() => onOpenDocument(item.documentId)}>Mở học liệu</button><button disabled={!document || !!downloading} onClick={async () => {
          setDownloading(item.id); setError('');
          try {
            const file = await getDocumentById(item.documentId);
            if (!file) throw new Error('Không tìm thấy tài liệu.');
            downloadBlob(new Blob([file.data], { type: file.mimeType }), file.name);
          } catch (error) { setError(error instanceof Error ? error.message : 'Không thể tải tài liệu.'); }
          finally { setDownloading(''); }
        }}><Download size={16} />{downloading === item.id ? 'Đang tải…' : 'Tải bản gốc'}</button>
          {role === 'teacher' && <button aria-label={`Gỡ chia sẻ ${item.title}`} disabled={busy} onClick={() => {
            if (window.confirm(`Gỡ “${item.title}” khỏi lớp? Tài liệu gốc vẫn được giữ trong kho.`)) void commit(next => { next.resources = next.resources.filter(resource => resource.id !== item.id); }, 'Đã gỡ học liệu khỏi lớp.');
          }}><Trash2 size={16} /></button>}
        </div>
      </article>;
    })}</div>
    {adding && <FormModal title="Chia sẻ học liệu" busy={busy} error={error} onClose={() => setAdding(false)}>
      <form className="learning-form" onSubmit={async event => {
        event.preventDefault(); const form = new FormData(event.currentTarget);
        if (await commit(shareResource(value(form, 'classId'), value(form, 'documentId'), value(form, 'title')), 'Đã chia sẻ học liệu cho lớp.')) setAdding(false);
      }}><ClassField classes={classes} classId={classId} /><label>Tên học liệu<input name="title" maxLength={200} required /></label><label>Tài liệu trong kho<select name="documentId" required defaultValue=""><option value="" disabled>Chọn tài liệu</option>{documents.map(doc => <option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label><button className="learning-primary" type="submit">Chia sẻ cho lớp</button></form>
    </FormModal>}
  </>;
}

export function AnnouncementsPanel({ controller, classes, classId, role }: LearningPanelProps) {
  const { data, busy, error, setError, commit } = controller;
  const [adding, setAdding] = useState(false);
  const announcements = data.announcements.filter(item => classes.some(c => c.id === item.classId) && (!classId || item.classId === classId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <>
    <PanelHeading title="Thông báo lớp học" description="Dặn dò, nhắc lịch và những nội dung cần chuẩn bị.">{role === 'teacher' && <button className="learning-primary" disabled={!classes.length} onClick={() => { setError(''); setAdding(true); }}><Plus size={17} />Viết thông báo</button>}</PanelHeading>
    {!announcements.length && <EmptyPanel title="Chưa có thông báo">Thông báo của giáo viên sẽ xuất hiện ở đây.</EmptyPanel>}
    <div className="learning-list">{announcements.map(item => <article className="learning-card" key={item.id}>
      <div className="learning-card-top"><span className="learning-subject"><Megaphone size={15} />{classes.find(c => c.id === item.classId)?.name}</span><time dateTime={item.createdAt}>{dateLabel(item.createdAt)}</time></div>
      <h3>{item.title}</h3><p className="learning-preserve">{item.content}</p>
      {role === 'teacher' && <div className="learning-card-actions"><button disabled={busy} onClick={() => {
        if (window.confirm(`Xóa thông báo “${item.title}”?`)) void commit(next => { next.announcements = next.announcements.filter(notice => notice.id !== item.id); }, 'Đã xóa thông báo.');
      }}>Xóa thông báo</button></div>}
    </article>)}</div>
    {adding && <FormModal title="Viết thông báo" busy={busy} error={error} onClose={() => setAdding(false)}><form className="learning-form" onSubmit={async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget);
      if (await commit(publishAnnouncement(value(form, 'classId'), value(form, 'title'), value(form, 'content')), 'Đã đăng thông báo cho lớp.')) setAdding(false);
    }}><ClassField classes={classes} classId={classId} /><label>Tiêu đề thông báo<input name="title" maxLength={200} required /></label><label>Nội dung thông báo<textarea name="content" maxLength={5000} rows={5} required /></label><button className="learning-primary" type="submit">Đăng thông báo</button></form></FormModal>}
  </>;
}
