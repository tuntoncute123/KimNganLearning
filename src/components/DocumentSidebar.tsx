import React, { useState, useMemo } from 'react';
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  Upload,
  X,
  HardDrive,
  AlertTriangle,
  Cloud,
  ExternalLink,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Home,
  BookOpen,
  User,
} from 'lucide-react';
import type { DocumentItem } from '../types/document';

interface DocumentSidebarProps {
  isOpen: boolean;
  documents: DocumentItem[];
  activeId: string | null;
  onClose: () => void;
  onSelectDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onClearAll: () => void;
  onOpenUpload: () => void;
  /** Trả về màn hình chính (EmptyState) */
  onGoHome?: () => void;
}

// ========================
// Cấu trúc cây thư mục
// ========================
interface FolderNode {
  studentName: string;
  lessons: {
    lessonName: string;
    docs: DocumentItem[];
  }[];
}

function buildTree(docs: DocumentItem[]): FolderNode[] {
  const studentMap: Record<string, Record<string, DocumentItem[]>> = {};

  for (const doc of docs) {
    const student = doc.studentName?.trim() || 'Chưa phân loại';
    const lesson = doc.lessonName?.trim() || 'Buổi học';

    if (!studentMap[student]) studentMap[student] = {};
    if (!studentMap[student][lesson]) studentMap[student][lesson] = [];
    studentMap[student][lesson].push(doc);
  }

  return Object.entries(studentMap).map(([studentName, lessonMap]) => ({
    studentName,
    lessons: Object.entries(lessonMap).map(([lessonName, docList]) => ({
      lessonName,
      docs: docList,
    })),
  }));
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ========================
// Sub-component: File row
// ========================
const FileRow: React.FC<{
  doc: DocumentItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ doc, isActive, onSelect, onDelete }) => {
  const isPdf = doc.type === 'pdf';
  const isWord = doc.type === 'word';
  const isDrive = !!doc.driveFileId;

  return (
    <div
      className={`sidebar-file-row ${isActive ? 'is-active' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      title={doc.name}
    >
      <span className="sidebar-file-icon">
        {isPdf ? (
          <FileText size={15} className="text-pdf-icon" />
        ) : isWord ? (
          <FileText size={15} className="text-word-icon" />
        ) : (
          <ImageIcon size={15} className="text-img-icon" />
        )}
      </span>

      <span className="sidebar-file-name">{doc.name}</span>

      <span className="sidebar-file-badges">
        {isDrive && (
          <span className="file-drive-badge" title="Đã lưu Google Drive">
            <Cloud size={11} />
          </span>
        )}
        {isWord && (
          <span className="file-meta-text docx-tag">DOCX</span>
        )}
        {isPdf && (
          <span className="file-meta-text">{doc.totalPages || 1}tr</span>
        )}
        <span className="file-meta-text">{formatBytes(doc.size)}</span>
      </span>

      <div className="sidebar-file-actions">
        {doc.driveWebViewLink && (
          <a
            href={doc.driveWebViewLink}
            target="_blank"
            rel="noreferrer"
            className="card-icon-btn"
            onClick={(e) => e.stopPropagation()}
            title="Mở trên Google Drive"
          >
            <ExternalLink size={13} />
          </a>
        )}
        <button
          type="button"
          className="card-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Bạn có chắc muốn xóa "${doc.name}" khỏi Workspace?`)) {
              onDelete();
            }
          }}
          title="Xóa tài liệu"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
};

// ========================
// Sub-component: Lesson folder
// ========================
const LessonFolder: React.FC<{
  lessonName: string;
  docs: DocumentItem[];
  activeId: string | null;
  onSelectDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onClose: () => void;
}> = ({ lessonName, docs, activeId, onSelectDoc, onDeleteDoc, onClose }) => {
  const [expanded, setExpanded] = useState(true);
  const hasActive = docs.some((d) => d.id === activeId);

  return (
    <div className="tree-lesson-node">
      <button
        type="button"
        className={`tree-lesson-header ${hasActive ? 'has-active' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="tree-indent" />
        <span className="tree-chevron">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        {expanded ? <FolderOpen size={14} className="tree-folder-icon open" /> : <Folder size={14} className="tree-folder-icon" />}
        <span className="tree-lesson-name">{lessonName}</span>
        <span className="tree-count-badge">{docs.length}</span>
      </button>

      {expanded && (
        <div className="tree-lesson-children">
          {docs.map((doc) => (
            <FileRow
              key={doc.id}
              doc={doc}
              isActive={doc.id === activeId}
              onSelect={() => {
                onSelectDoc(doc.id);
                onClose();
              }}
              onDelete={() => onDeleteDoc(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ========================
// Sub-component: Student folder
// ========================
const StudentFolder: React.FC<{
  node: FolderNode;
  activeId: string | null;
  onSelectDoc: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onClose: () => void;
}> = ({ node, activeId, onSelectDoc, onDeleteDoc, onClose }) => {
  const [expanded, setExpanded] = useState(true);
  const totalDocs = node.lessons.reduce((acc, l) => acc + l.docs.length, 0);
  const hasActive = node.lessons.some((l) => l.docs.some((d) => d.id === activeId));

  return (
    <div className="tree-student-node">
      <button
        type="button"
        className={`tree-student-header ${hasActive ? 'has-active' : ''}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="tree-chevron">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <User size={14} className="tree-student-icon" />
        <span className="tree-student-name">{node.studentName}</span>
        <span className="tree-count-badge secondary">{totalDocs} file</span>
      </button>

      {expanded && (
        <div className="tree-student-children">
          {node.lessons.map((lesson) => (
            <LessonFolder
              key={lesson.lessonName}
              lessonName={lesson.lessonName}
              docs={lesson.docs}
              activeId={activeId}
              onSelectDoc={onSelectDoc}
              onDeleteDoc={onDeleteDoc}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ========================
// Main Component
// ========================
export const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  isOpen,
  documents,
  activeId,
  onClose,
  onSelectDoc,
  onDeleteDoc,
  onClearAll,
  onOpenUpload,
  onGoHome,
}) => {
  if (!isOpen) return null;

  const tree = useMemo(() => buildTree(documents), [documents]);
  const totalSize = documents.reduce((acc, d) => acc + d.size, 0);

  return (
    <>
      <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="document-sidebar-panel" aria-label="Kho tài liệu bài giảng">

        {/* ─── HEADER ─── */}
        <div className="sidebar-header">
          <div className="sidebar-title-group">
            <div className="sidebar-title-row">
              <HardDrive size={16} className="opacity-60" />
              <h2 className="sidebar-heading">Thư Mục Tài Liệu</h2>
            </div>
            <span className="sidebar-subtitle">
              {documents.length} tài liệu • {formatBytes(totalSize)}
            </span>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            title="Đóng"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── NHANH: Tải thêm + Về trang chủ ─── */}
        <div className="sidebar-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ flex: 1 }}
            onClick={onOpenUpload}
          >
            <Upload size={15} />
            <span>Tải Tài Liệu Mới</span>
          </button>

          {onGoHome && (
            <button
              type="button"
              className="btn btn-secondary btn-sm sidebar-home-btn"
              onClick={() => {
                onClose();
                onGoHome();
              }}
              title="Thoát về màn hình chọn tài liệu"
            >
              <Home size={15} />
              <span>Màn hình chính</span>
            </button>
          )}
        </div>

        {/* ─── CÂY THƯ MỤC ─── */}
        <div className="sidebar-tree-container">
          {documents.length === 0 ? (
            <div className="sidebar-empty-state">
              <HardDrive size={32} className="opacity-40" />
              <p>Chưa có tài liệu nào trong Workspace.</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onOpenUpload}
              >
                Tải lên ngay
              </button>
            </div>
          ) : (
            <div className="tree-root">
              {/* Nhãn "Workspace" root */}
              <div className="tree-root-label">
                <BookOpen size={14} className="opacity-60" />
                <span>Workspace</span>
              </div>

              {tree.map((node) => (
                <StudentFolder
                  key={node.studentName}
                  node={node}
                  activeId={activeId}
                  onSelectDoc={onSelectDoc}
                  onDeleteDoc={onDeleteDoc}
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </div>

        {/* ─── FOOTER ─── */}
        {documents.length > 0 && (
          <div className="sidebar-footer">
            <button
              type="button"
              className="btn-danger-outline btn-sm w-full"
              onClick={() => {
                if (
                  confirm(
                    'Xóa TẤT CẢ tài liệu trong Workspace? Hành động này không thể hoàn tác.'
                  )
                ) {
                  onClearAll();
                }
              }}
            >
              <AlertTriangle size={14} />
              <span>Xóa hết Workspace ({documents.length} file)</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
