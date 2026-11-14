import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { DocumentItem, DocType, GoogleUser, DrawTool, DrawStroke } from './types/document';
import {
  getAllDocuments,
  getAllAnnotations,
  saveDocument,
  updateDocumentProgress,
  deleteDocument,
  clearAllDocuments,
} from './services/db';
import {
  createGoogleTokenClient,
  getGoogleUserInfo,
  ensureStudentLessonPath,
  uploadFileToDrive,
} from './services/googleDriveService';
import { Header } from './components/Header';
import { DocumentTabBar } from './components/DocumentTabBar';
import { DocumentSidebar } from './components/DocumentSidebar';
import { useAnnotations } from './hooks/useAnnotations';
import { ImageViewer } from './components/ImageViewer';
import { Toolbar } from './components/Toolbar';
import { MathDrawingToolbar } from './components/MathDrawingToolbar';
import { MathScratchpad } from './components/MathScratchpad';
import { MathFormulaModal } from './components/MathFormulaModal';
import { EmptyState } from './components/EmptyState';
import { MeetGuideModal } from './components/MeetGuideModal';
import { GoogleDriveSettingsModal } from './components/GoogleDriveSettingsModal';
import { createSamplePdfBuffer, createSampleImageBuffer } from './utils/sampleGenerator';

const PDFViewer = lazy(() => import('./components/PDFViewer').then((module) => ({ default: module.PDFViewer })));
const WordViewer = lazy(() => import('./components/WordViewer').then((module) => ({ default: module.WordViewer })));

export const App: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isDriveSettingsOpen, setIsDriveSettingsOpen] = useState<boolean>(false);
  const [isLaserActive, setIsLaserActive] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Hiển thị màn hình chủ (chọn file) khi người dùng chủ động thoát khỏi tài liệu
  const [forceShowHome, setForceShowHome] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('holotutor_theme') as 'light' | 'dark') || 'light';
  });

  // Google Drive State
  const envClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return envClientId || localStorage.getItem('holotutor_google_client_id') || '';
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [driveErrorMsg, setDriveErrorMsg] = useState<string | null>(null);
  const [currentStudentName, setCurrentStudentName] = useState<string>('Học sinh A');
  const [currentLessonName, setCurrentLessonName] = useState<string>('Lesson 01');

  // Math & Drawing Annotation State
  const [activeDrawTool, setActiveDrawTool] = useState<DrawTool>('select');
  const [drawColor, setDrawColor] = useState<string>('#ef4444');
  const [drawStrokeWidth, setDrawStrokeWidth] = useState<number>(2);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState<boolean>(false);
  const [selectedStrokeId, setSelectedStrokeId] = useState<string | null>(null);
  const [isMathModalOpen, setIsMathModalOpen] = useState<boolean>(false);
  const [editingStroke, setEditingStroke] = useState<DrawStroke | null>(null);
  const [mathFormulaClickPos, setMathFormulaClickPos] = useState<{ x: number; y: number } | null>(null);

  const [isRestoring, setIsRestoring] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const activeDoc = documents.find((doc) => doc.id === activeId) || null;
  const annotations = useAnnotations(activeDoc?.id || null, activeDoc?.currentPage || 1);
  const {
    currentPageStrokes, scratchpadStrokes, setScratchpadStrokes,
    canUndo, canRedo, handlePageStrokesChange, handleUndo, handleRedo,
    handleClearCurrentPage, hydrate,
  } = annotations;
  const reportStorageError = useCallback((error: unknown) => {
    console.error('Lỗi lưu trữ:', error);
    setStorageError('Không thể lưu thay đổi trên thiết bị. Hãy kiểm tra dung lượng trống và quyền lưu trữ của trình duyệt.');
  }, []);

  const appContainerRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef<number>(1.0);
  const tokenClientRef = useRef<any>(null);

  // 1. Theme (Light / Dark)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('holotutor_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // 2. Khởi tạo danh sách tài liệu từ IndexedDB
  useEffect(() => {
    let cancelled = false;
    const loadSavedDocs = async () => {
      try {
        const [saved, drawings] = await Promise.all([getAllDocuments(), getAllAnnotations()]);
        if (cancelled) return;
        hydrate(drawings);
        setDocuments(saved);
        if (saved.length > 0) {
          const mostRecent = [...saved].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0];
          setActiveId(mostRecent ? mostRecent.id : saved[0].id);
        }
      } catch (err) {
        if (!cancelled) setStorageError(err instanceof Error ? err.message : 'Không thể khôi phục tài liệu trên thiết bị.');
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    };

    loadSavedDocs();
    return () => { cancelled = true; };
  }, [hydrate]);

  // 3. Toàn màn hình
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appContainerRef.current?.requestFullscreen().catch((err) => {
        console.warn('Không thể mở toàn màn hình:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Lỗi thoát toàn màn hình:', err);
      });
    }
  };

  // 4. Lưu Google Client ID
  const handleSaveClientId = (newId: string) => {
    setGoogleClientId(newId);
    localStorage.setItem('holotutor_google_client_id', newId);
    tokenClientRef.current = null;
  };

  // 5. Đăng nhập Google Drive OAuth 2.0
  const handleLoginGoogle = () => {
    if (!googleClientId) {
      setIsDriveSettingsOpen(true);
      return;
    }

    setDriveErrorMsg(null);
    setIsConnectingDrive(true);

    try {
      tokenClientRef.current = createGoogleTokenClient(
        googleClientId,
        async (token: string) => {
          setGoogleAccessToken(token);
          try {
            const userInfo = await getGoogleUserInfo(token);
            setGoogleUser(userInfo);
            setIsConnectingDrive(false);
          } catch (err: any) {
            console.error('Lỗi lấy thông tin Google User:', err);
            setGoogleUser({ email: 'Google Drive Account' });
            setIsConnectingDrive(false);
          }
        },
        (err: any) => {
          console.error('Lỗi OAuth Google:', err);
          setDriveErrorMsg(typeof err === 'string' ? err : 'Đăng nhập Google thất bại hoặc bạn đã đóng popup.');
          setIsConnectingDrive(false);
        }
      );

      tokenClientRef.current.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      setDriveErrorMsg(err.message || 'Chưa thể tải Google Identity Services SDK');
      setIsConnectingDrive(false);
    }
  };

  // 6. Đăng xuất Google Drive
  const handleLogoutGoogle = () => {
    setGoogleAccessToken(null);
    setGoogleUser(null);
    tokenClientRef.current = null;
  };

  // 8. Chuyển đổi tài liệu tức thì
  const handleSelectDoc = useCallback((id: string) => {
    setActiveId(id);
    setForceShowHome(false);
    setSelectedStrokeId(null);
    const now = Date.now();
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, lastOpenedAt: now } : d))
    );
    void updateDocumentProgress(id, { lastOpenedAt: now }).catch(reportStorageError);
  }, [reportStorageError]);

  // 9. Xử lý tải file lên
  const handleFilesSelected = async (
    files: FileList | File[],
    studentName: string,
    lessonName: string
  ) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setCurrentStudentName(studentName);
    setCurrentLessonName(lessonName);

    let driveTargetFolderId: string | null = null;
    let driveTargetFolderPath: string | null = null;

    if (googleAccessToken) {
      try {
        const folderResult = await ensureStudentLessonPath(
          studentName,
          lessonName,
          googleAccessToken
        );
        driveTargetFolderId = folderResult.folderId;
        driveTargetFolderPath = folderResult.folderPath;
      } catch (err) {
        console.error('Lỗi khi tạo/tìm thư mục trên Google Drive:', err);
      }
    }

    const newDocs: DocumentItem[] = [];

    for (const file of fileArray) {
      try {
        const buffer = await file.arrayBuffer();
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name);
        const isWord = file.name.toLowerCase().endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        if (!isPdf && !isImage && !isWord) {
          alert(`File "${file.name}" không được hỗ trợ. Vui lòng chọn file PDF, Word (.docx) hoặc Hình ảnh.`);
          continue;
        }

        const docType: DocType = isPdf ? 'pdf' : isWord ? 'word' : 'image';
        const docMimeType = file.type || (
          isPdf ? 'application/pdf' :
          isWord ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
          'image/png'
        );

        let driveFileId: string | undefined;
        let driveWebViewLink: string | undefined;

        if (googleAccessToken && driveTargetFolderId) {
          try {
            const driveUpload = await uploadFileToDrive(
              { name: file.name, mimeType: docMimeType, data: buffer },
              driveTargetFolderId,
              googleAccessToken
            );
            driveFileId = driveUpload.id;
            driveWebViewLink = driveUpload.webViewLink;
          } catch (err) {
            console.error(`Không thể lưu file "${file.name}" lên Drive:`, err);
          }
        }

        const docItem: DocumentItem = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: docType,
          mimeType: docMimeType,
          size: file.size,
          data: buffer,
          createdAt: Date.now(),
          lastOpenedAt: Date.now(),
          currentPage: 1,
          totalPages: 1,
          zoom: 1.0,
          rotation: 0,
          studentName: studentName.trim() || undefined,
          lessonName: lessonName.trim() || undefined,
          driveFileId,
          driveFolderId: driveTargetFolderId || undefined,
          driveFolderPath: driveTargetFolderPath || undefined,
          driveWebViewLink,
        };

        await saveDocument(docItem);
        newDocs.push(docItem);
      } catch (err) {
        reportStorageError(err);
      }
    }

    if (newDocs.length > 0) {
      setDocuments((prev) => [...prev, ...newDocs]);
      setActiveId(newDocs[newDocs.length - 1].id);
      setForceShowHome(false);
    }
  };

  // 10. Xóa 1 tài liệu
  const handleDeleteDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await annotations.flush();
      await deleteDocument(id);
      annotations.forgetDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setActiveId((current) => current === id ? (documents.filter((doc) => doc.id !== id).at(-1)?.id || null) : current);
    } catch (err) {
      reportStorageError(err);
    }
  };

  // 11. Dọn sạch toàn bộ kho tài liệu
  const handleClearAll = async () => {
    try {
      await annotations.flush();
      await clearAllDocuments();
      annotations.reset();
      setDocuments([]);
      setActiveId(null);
      setIsSidebarOpen(false);
    } catch (err) {
      reportStorageError(err);
    }
  };

  // 12. Sinh tài liệu mẫu
  const handleLoadSample = async (studentName: string, lessonName: string) => {
    try {
      const samplePdfBuffer = createSamplePdfBuffer(
        'Toán 12 - Hình Học Không Gian & Tích Phân',
        `Học sinh: ${studentName} • ${lessonName}`,
        3
      );
      const sampleImgBuffer = await createSampleImageBuffer(
        `Phiếu Bài Tập Hình Học - ${studentName}`,
        lessonName
      );

      const samplePdf: DocumentItem = {
        id: `sample_pdf_${Date.now()}`,
        name: 'Toan_12_HinhHoc.pdf',
        type: 'pdf',
        mimeType: 'application/pdf',
        size: samplePdfBuffer.byteLength,
        data: samplePdfBuffer,
        createdAt: Date.now(),
        lastOpenedAt: Date.now(),
        currentPage: 1,
        totalPages: 3,
        zoom: 1.15,
        rotation: 0,
        studentName,
        lessonName,
        driveFolderPath: `HoloTutor Materials / ${studentName} / ${lessonName}`,
      };

      const sampleImg: DocumentItem = {
        id: `sample_img_${Date.now()}`,
        name: 'BaiTap_Toan_Oxy.png',
        type: 'image',
        mimeType: 'image/png',
        size: sampleImgBuffer.byteLength,
        data: sampleImgBuffer,
        createdAt: Date.now() + 1,
        lastOpenedAt: 0,
        currentPage: 1,
        totalPages: 1,
        zoom: 0.9,
        rotation: 0,
        studentName,
        lessonName,
        driveFolderPath: `HoloTutor Materials / ${studentName} / ${lessonName}`,
      };

      await saveDocument(samplePdf);
      await saveDocument(sampleImg);

      setDocuments((previous) => [...previous, samplePdf, sampleImg]);
      setForceShowHome(false);
      setActiveId(samplePdf.id);
    } catch (err) {
      reportStorageError(err);
    }
  };

  // Persist outside state updaters: React StrictMode may invoke an updater twice.
  const handlePageChange = useCallback((newPage: number, totalPages?: number) => {
    if (!activeId) return;
    const updates = { currentPage: newPage, ...(totalPages !== undefined ? { totalPages } : {}) };
    setDocuments((prev) => prev.map((doc) => doc.id === activeId ? { ...doc, ...updates } : doc));
    setSelectedStrokeId(null);
    void updateDocumentProgress(activeId, updates).catch(reportStorageError);
  }, [activeId, reportStorageError]);

  const handleZoomChange = useCallback((newZoom: number) => {
    if (!activeId) return;
    setDocuments((prev) => prev.map((doc) => doc.id === activeId ? { ...doc, zoom: newZoom } : doc));
    void updateDocumentProgress(activeId, { zoom: newZoom }).catch(reportStorageError);
  }, [activeId, reportStorageError]);

  const handleResetZoom = useCallback(() => {
    handleZoomChange(1.0);
  }, [handleZoomChange]);

  const handleFitWidth = useCallback(() => {
    if (fitScaleRef.current > 0) {
      handleZoomChange(Number(fitScaleRef.current.toFixed(2)));
    }
  }, [handleZoomChange]);

  const handleRotate = () => {
    if (!activeDoc) return;
    const rotation = (activeDoc.rotation + 90) % 360;
    setDocuments((prev) => prev.map((doc) => doc.id === activeDoc.id ? { ...doc, rotation } : doc));
    void updateDocumentProgress(activeDoc.id, { rotation }).catch(reportStorageError);
  };

  const handleFitWidthCalculated = useCallback((scale: number) => {
    fitScaleRef.current = scale;
  }, []);

  const handleEditMathFormula = (stroke: DrawStroke) => {
    setEditingStroke(stroke);
    setMathFormulaClickPos(stroke.points[0] || { x: 140, y: 180 });
    setIsMathModalOpen(true);
  };

  const handleOpenMathFormulaModal = (pos?: { x: number; y: number }, editStroke?: DrawStroke) => {
    if (editStroke) {
      handleEditMathFormula(editStroke);
      return;
    }
    setEditingStroke(null);
    setMathFormulaClickPos(pos || { x: 140, y: 180 });
    setIsMathModalOpen(true);
  };

  const handleInsertMathFormula = (formulaText: string) => {
    if (editingStroke) {
      // 1. Chỉnh sửa công thức đã có
      const targetId = editingStroke.id;

      // Cập nhật trên bài giảng chính nếu nét thuộc bài giảng
      const isCurrentPage = currentPageStrokes.some((s) => s.id === targetId);
      if (isCurrentPage) {
        const updated = currentPageStrokes.map((s) =>
          s.id === targetId ? { ...s, text: formulaText } : s
        );
        handlePageStrokesChange(updated);
      }

      // Cập nhật trên bảng nháp nếu nét thuộc bảng nháp
      const isScratchpad = scratchpadStrokes.some((s) => s.id === targetId);
      if (isScratchpad) {
        setScratchpadStrokes((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, text: formulaText } : s))
        );
      }

      setSelectedStrokeId(targetId);
      setEditingStroke(null);
    } else {
      // 2. Chèn công thức mới vào bài giảng
      const newStroke: DrawStroke = {
        id: `math_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tool: 'math-text',
        color: drawColor,
        width: drawStrokeWidth,
        points: [mathFormulaClickPos || { x: 140, y: 180 }],
        text: formulaText,
        fontSize: 18,
      };

      handlePageStrokesChange([...currentPageStrokes, newStroke]);
      setSelectedStrokeId(newStroke.id);
    }
  };

  // Phím tắt Undo / Redo toàn cục
  useEffect(() => {
    const handleKeyShortcut = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable], [role="dialog"], .modal-backdrop')) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            handleRedo();
          } else {
            e.preventDefault();
            handleUndo();
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyShortcut);
    return () => window.removeEventListener('keydown', handleKeyShortcut);
  });

  return (
    <div ref={appContainerRef} className={`app-workspace-root ${isFullscreen ? 'is-fullscreen-mode' : ''}`}>
      {/* 1. Header trên cùng */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenDriveSettings={() => setIsDriveSettingsOpen(true)}
        googleUser={googleUser}
        activeDocName={activeDoc?.name}
        activeDocFolder={
          activeDoc?.studentName
            ? `${activeDoc.studentName} / ${activeDoc.lessonName || 'Lesson'}`
            : undefined
        }
        onToggleSidebar={() => setIsSidebarOpen(true)}
      />

      {storageError && (
        <div className="workspace-storage-alert" role="alert">
          <span>{storageError}</span>
          <button type="button" onClick={() => setStorageError(null)} aria-label="Đóng thông báo">×</button>
        </div>
      )}
      {!isRestoring && documents.length > 0 && (
        <div className={`workspace-save-status is-${annotations.saveStatus}`} role="status" aria-live="polite">
          {annotations.saveStatus === 'saving' ? 'Đang lưu nét vẽ…' : annotations.saveStatus === 'error'
            ? 'Chưa lưu được nét vẽ. Hãy kiểm tra bộ nhớ trình duyệt trước khi đóng trang.'
            : 'Nét vẽ được lưu trên thiết bị này'}
          {annotations.saveStatus === 'error' && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={annotations.retrySaving}>Thử lưu lại</button>
          )}
        </div>
      )}

      {/* 2. Thanh tab ngang chuyển tài liệu tức thì */}
      {documents.length > 0 && (
        <DocumentTabBar
          documents={documents}
          activeId={activeId}
          onSelectDoc={handleSelectDoc}
          onCloseDoc={handleDeleteDoc}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      {/* 3. Thanh công cụ vẽ Toán học & Annotation nổi */}
      {activeDoc && !forceShowHome && (
        <MathDrawingToolbar
          activeTool={activeDrawTool}
          onSelectTool={(tool) => {
            setActiveDrawTool(tool);
            if (tool !== 'select' && isLaserActive) {
              setIsLaserActive(false);
            }
          }}
          color={drawColor}
          onSelectColor={setDrawColor}
          strokeWidth={drawStrokeWidth}
          onSelectStrokeWidth={setDrawStrokeWidth}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClearPage={handleClearCurrentPage}
          isScratchpadOpen={isScratchpadOpen}
          onToggleScratchpad={() => setIsScratchpadOpen(!isScratchpadOpen)}
          hasDrawings={currentPageStrokes.length > 0}
          onOpenMathFormulaModal={() => handleOpenMathFormulaModal()}
        />
      )}

      {/* 4. Vùng nội dung bài giảng chính (Hỗ trợ chia đôi với Lề nháp Toán) */}
      <main
        className={`workspace-main-content ${isScratchpadOpen ? 'is-split-scratchpad' : ''}`}
        role="region"
        aria-label="Khu vực trình bày bài giảng"
      >
        {isRestoring ? (
          <div className="viewer-state-message" role="status">Đang khôi phục tài liệu và nét vẽ…</div>
        ) : documents.length === 0 || forceShowHome ? (
          <EmptyState
            onFilesSelected={(files, sn, ln) => {
              setForceShowHome(false);
              handleFilesSelected(files, sn, ln);
            }}
            onLoadSample={(sn, ln) => {
              setForceShowHome(false);
              handleLoadSample(sn, ln);
            }}
            googleUser={googleUser}
            onOpenDriveSettings={() => setIsDriveSettingsOpen(true)}
            defaultStudentName={currentStudentName}
            defaultLessonName={currentLessonName}
          />
        ) : activeDoc ? (
          <div className="workspace-split-container">
            {/* Cột bên trái: Tài liệu bài học gốc (PDF hoặc Ảnh) */}
            <div className="active-viewer-container">
              <Suspense fallback={<div className="viewer-state-message" role="status">Đang tải bộ đọc tài liệu…</div>}>
              {activeDoc.type === 'pdf' ? (
                <PDFViewer
                  key={activeDoc.id}
                  documentId={activeDoc.id}
                  data={activeDoc.data}
                  currentPage={activeDoc.currentPage || 1}
                  zoom={activeDoc.zoom || 1.0}
                  rotation={activeDoc.rotation || 0}
                  isLaserActive={isLaserActive}
                  onPageChange={handlePageChange}
                  onZoomChange={handleZoomChange}
                  onFitWidthCalculated={handleFitWidthCalculated}
                  activeDrawTool={activeDrawTool}
                  drawColor={drawColor}
                  drawStrokeWidth={drawStrokeWidth}
                  pageStrokes={currentPageStrokes}
                  onPageStrokesChange={handlePageStrokesChange}
                  onOpenMathFormulaModal={handleOpenMathFormulaModal}
                  onEditMathFormula={handleEditMathFormula}
                  selectedStrokeId={selectedStrokeId}
                  onSelectStroke={setSelectedStrokeId}
                />
              ) : activeDoc.type === 'word' ? (
                <WordViewer
                  key={activeDoc.id}
                  documentId={activeDoc.id}
                  data={activeDoc.data}
                  zoom={activeDoc.zoom || 1.0}
                  rotation={activeDoc.rotation || 0}
                  isLaserActive={isLaserActive}
                  onZoomChange={handleZoomChange}
                  onFitWidthCalculated={handleFitWidthCalculated}
                  activeDrawTool={activeDrawTool}
                  drawColor={drawColor}
                  drawStrokeWidth={drawStrokeWidth}
                  pageStrokes={currentPageStrokes}
                  onPageStrokesChange={handlePageStrokesChange}
                  onOpenMathFormulaModal={handleOpenMathFormulaModal}
                  onEditMathFormula={handleEditMathFormula}
                  selectedStrokeId={selectedStrokeId}
                  onSelectStroke={setSelectedStrokeId}
                />
              ) : (
                <ImageViewer
                  key={activeDoc.id}
                  documentId={activeDoc.id}
                  data={activeDoc.data}
                  mimeType={activeDoc.mimeType}
                  zoom={activeDoc.zoom || 1.0}
                  rotation={activeDoc.rotation || 0}
                  isLaserActive={isLaserActive}
                  onFitWidthCalculated={handleFitWidthCalculated}
                  activeDrawTool={activeDrawTool}
                  drawColor={drawColor}
                  drawStrokeWidth={drawStrokeWidth}
                  pageStrokes={currentPageStrokes}
                  onPageStrokesChange={handlePageStrokesChange}
                  onOpenMathFormulaModal={handleOpenMathFormulaModal}
                  onEditMathFormula={handleEditMathFormula}
                  selectedStrokeId={selectedStrokeId}
                  onSelectStroke={setSelectedStrokeId}
                />
              )}

              </Suspense>

              {/* Thanh điều khiển nổi phía dưới (Phân trang, Zoom, Laser) */}
              <Toolbar
                docType={activeDoc.type}
                currentPage={activeDoc.currentPage || 1}
                totalPages={activeDoc.totalPages || 1}
                zoom={activeDoc.zoom || 1.0}
                rotation={activeDoc.rotation || 0}
                isLaserActive={isLaserActive}
                isFullscreen={isFullscreen}
                onPageChange={handlePageChange}
                onZoomChange={handleZoomChange}
                onFitWidth={handleFitWidth}
                onResetZoom={handleResetZoom}
                onRotate={handleRotate}
                onToggleLaser={() => {
                  setIsLaserActive((v) => !v);
                  if (!isLaserActive) {
                    setActiveDrawTool('select');
                  }
                }}
                onToggleFullscreen={toggleFullscreen}
              />
            </div>

            {/* Cột bên phải: Lề nháp giải toán song song */}
            {isScratchpadOpen && (
              <MathScratchpad
                isOpen={isScratchpadOpen}
                onClose={() => setIsScratchpadOpen(false)}
                activeTool={activeDrawTool}
                color={drawColor}
                strokeWidth={drawStrokeWidth}
                strokes={scratchpadStrokes}
                onStrokesChange={setScratchpadStrokes}
                onClear={() => setScratchpadStrokes([])}
                onOpenMathFormulaModal={handleOpenMathFormulaModal}
                onEditMathFormula={handleEditMathFormula}
                selectedStrokeId={selectedStrokeId}
                onSelectStroke={setSelectedStrokeId}
              />
            )}
          </div>
        ) : (
          <div className="empty-state-full-screen">
            <p>Vui lòng chọn một tài liệu trên thanh tab để bắt đầu giảng dạy.</p>
          </div>
        )}
      </main>

      {/* 5. Drawer quản lý toàn bộ kho tài liệu (Cây thư mục) */}
      <DocumentSidebar
        isOpen={isSidebarOpen}
        documents={documents}
        activeId={activeId}
        onClose={() => setIsSidebarOpen(false)}
        onSelectDoc={(id) => {
          handleSelectDoc(id);
          setForceShowHome(false);
        }}
        onDeleteDoc={(id) => handleDeleteDoc(id)}
        onClearAll={handleClearAll}
        onOpenUpload={() => {
          setIsSidebarOpen(false);
          setIsUploadModalOpen(true);
        }}
        onGoHome={() => {
          setForceShowHome(true);
          setActiveId(null);
        }}
      />

      {/* 6. Modal tải thêm tài liệu */}
      {isUploadModalOpen && (
        <EmptyState
          isModal={true}
          onCloseModal={() => setIsUploadModalOpen(false)}
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          googleUser={googleUser}
          onOpenDriveSettings={() => {
            setIsUploadModalOpen(false);
            setIsDriveSettingsOpen(true);
          }}
          defaultStudentName={currentStudentName}
          defaultLessonName={currentLessonName}
        />
      )}

      {/* 7. Modal hướng dẫn tích hợp Google Meet & PiP */}
      <MeetGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* 8. Modal cài đặt Google Drive */}
      <GoogleDriveSettingsModal
        isOpen={isDriveSettingsOpen}
        onClose={() => setIsDriveSettingsOpen(false)}
        clientId={googleClientId}
        isEnvConfigured={!!envClientId}
        onSaveClientId={handleSaveClientId}
        user={googleUser}
        onLogin={handleLoginGoogle}
        onLogout={handleLogoutGoogle}
        isConnecting={isConnectingDrive}
        errorMsg={driveErrorMsg}
      />

      {/* 9. Modal chèn & chỉnh sửa công thức Toán học */}
      <MathFormulaModal
        isOpen={isMathModalOpen}
        onClose={() => {
          setIsMathModalOpen(false);
          setEditingStroke(null);
        }}
        onInsertFormula={handleInsertMathFormula}
        initialText={editingStroke?.text || ''}
        isEditing={!!editingStroke}
      />
    </div>
  );
};

export default App;
