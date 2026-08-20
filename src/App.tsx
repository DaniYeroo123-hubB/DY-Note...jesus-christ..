import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Pin, 
  Trash2, 
  X, 
  Check, 
  Copy, 
  Clock, 
  Calendar,
  Plus, 
  Search,
  ChevronLeft,
  RotateCcw,
  Settings,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Info,
  Sparkles,
  Heart,
  Users,
  Moon,
  Code2,
  Coffee,
  Feather,
  Palette,
  Shield,
  Zap,
  Star,
  Award,
  Compass
} from 'lucide-react';
import { Note } from './types';
import { INITIAL_NOTES } from './data';
import foundersImg from './utils/5963147175640370457 (1).jpg';
import {
  playClickSound,
  playPopSound,
  playPinSound,
  playDeleteSound,
  playCopySound,
  playNotificationSound,
  playDismissSound,
  setSoundMuted,
  getSoundMuted,
  setSoundVolume,
  getSoundVolume
} from './utils/audio';
import { LiquidGlassSlider } from './components/LiquidGlassSlider';
import { RichEditable, RichEditableRef } from './components/RichEditable';
import { stripHtml, RichTextRenderer } from './utils/richText';

interface DeletedNoteState {
  note: Note;
  originalIndex: number;
}

const COLOR_PRESETS = [
  { name: 'Black', value: '#000000' },
  { name: 'Apple Blue', value: '#007AFF' },
];

const APPLE_HIG_PALETTE = [
  { name: 'Apple Blue', value: '#007AFF' },
  { name: 'Indigo', value: '#5856D6' },
  { name: 'Purple', value: '#AF52DE' },
  { name: 'Pink', value: '#FF2D55' },
  { name: 'Red', value: '#FF3B30' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Emerald', value: '#34C759' },
  { name: 'Mint', value: '#00C7BE' },
  { name: 'Cyan', value: '#32ADE6' },
  { name: 'Coral', value: '#FF6B6B' },
  { name: 'Charcoal', value: '#3A3A3C' },
];

export default function App() {
  // Persistence in localStorage
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('dy_notes_clean_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore fallback
    }
    return INITIAL_NOTES;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dy_notes_clean_data', JSON.stringify(notes));
    } catch {
      // LocalStorage full or private browsing issue
    }
  }, [notes]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(() => getSoundMuted());
  const [soundVolume, setSoundVolumeState] = useState(() => getSoundVolume());

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setSoundMuted(newMuted);
    if (!newMuted) {
      playClickSound();
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setSoundVolumeState(newVol);
    setSoundVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      setSoundMuted(false);
    }
  };
  
  // Note Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Friendship Cheers counter for interactive modal celebration
  const [friendshipCheers, setFriendshipCheers] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dy_friendship_cheers');
      return saved ? parseInt(saved, 10) : 170;
    } catch {
      return 170;
    }
  });

  const handleCheer = () => {
    const nextCount = friendshipCheers + 1;
    setFriendshipCheers(nextCount);
    try {
      localStorage.setItem('dy_friendship_cheers', nextCount.toString());
    } catch {
      // Ignore
    }
    playPopSound();
  };

  // Editor form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [copied, setCopied] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Rich editor refs for active selection styling
  const titleEditorRef = useRef<RichEditableRef>(null);
  const contentEditorRef = useRef<RichEditableRef>(null);
  const lastActiveEditorRef = useRef<'title' | 'content'>('content');

  // Undo Delete state
  const [deletedNoteInfo, setDeletedNoteInfo] = useState<DeletedNoteState | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  // Open note editor for new note
  const handleOpenNewNote = () => {
    playPopSound();
    setActiveNoteId(null);
    setTitle('');
    setContent('');
    setIsPinned(false);
    setSelectedColor('#000000');
    setIsColorPickerOpen(false);
    lastActiveEditorRef.current = 'content';
    setIsEditorOpen(true);
  };

  // Open note editor for existing note
  const handleEditNote = (note: Note) => {
    playPopSound();
    setActiveNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setIsPinned(!!note.isPinned);
    setSelectedColor(note.accentColor || note.color || '#000000');
    setIsColorPickerOpen(false);
    lastActiveEditorRef.current = 'content';
    setIsEditorOpen(true);
  };

  // Apply chosen color to whichever editor is focused or has text selected
  const handleColorSelect = (newColor: string) => {
    setSelectedColor(newColor);
    
    // Check if selection is inside title or content
    const sel = window.getSelection();
    let applied = false;
    
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const anchorNode = sel.anchorNode;
      if (anchorNode) {
        if (titleEditorRef.current?.containsNode(anchorNode)) {
          titleEditorRef.current.applyColor(newColor);
          titleEditorRef.current.focus();
          applied = true;
        } else if (contentEditorRef.current?.containsNode(anchorNode)) {
          contentEditorRef.current.applyColor(newColor);
          contentEditorRef.current.focus();
          applied = true;
        }
      }
    }

    if (!applied) {
      // Apply directly to whichever editor user was actively working in and keep caret alive
      if (lastActiveEditorRef.current === 'title') {
        titleEditorRef.current?.applyColor(newColor);
        titleEditorRef.current?.focus();
      } else {
        contentEditorRef.current?.applyColor(newColor);
        contentEditorRef.current?.focus();
      }
    }
  };

  // Save current note
  const handleSaveNote = () => {
    playClickSound();
    setIsColorPickerOpen(false);

    const finalTitleHtml = titleEditorRef.current?.getHtml() || title;
    const finalContentHtml = contentEditorRef.current?.getHtml() || content;

    const plainTitle = stripHtml(finalTitleHtml).trim();
    const plainContent = stripHtml(finalContentHtml).trim();

    if (!plainTitle && !plainContent) {
      setIsEditorOpen(false);
      return;
    }

    const now = Date.now();
    const noteColor = selectedColor || '#000000';
    if (activeNoteId) {
      // Update
      setNotes(prev =>
        prev.map(n =>
          n.id === activeNoteId
            ? {
                ...n,
                title: finalTitleHtml.trim() || 'Untitled Note',
                content: finalContentHtml.trim(),
                isPinned,
                color: noteColor,
                accentColor: noteColor,
                updatedAt: now,
              }
            : n
        )
      );
    } else {
      // Create new
      const newNote: Note = {
        id: `note-${now}-${Math.random().toString(36).substring(2, 6)}`,
        title: finalTitleHtml.trim() || 'Untitled Note',
        content: finalContentHtml.trim(),
        isPinned,
        color: noteColor,
        accentColor: noteColor,
        updatedAt: now,
      };
      setNotes(prev => [newNote, ...prev]);
    }

    setIsEditorOpen(false);
  };

  // Delete note with Undo support
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playDeleteSound();
    setTimeout(() => playNotificationSound(), 100);

    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    const originalIndex = notes.findIndex(n => n.id === id);

    // Clear active timer if a note was previously pending deletion
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    // Immediately remove note from active view
    setNotes(prev => prev.filter(n => n.id !== id));

    if (activeNoteId === id) {
      setIsEditorOpen(false);
    }

    // Store pending deleted note data
    setDeletedNoteInfo({
      note: noteToDelete,
      originalIndex,
    });

    // Schedule permanent deletion cleanup after 5 seconds
    undoTimerRef.current = setTimeout(() => {
      playDismissSound();
      setDeletedNoteInfo(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  // Undo deletion handler
  const handleUndoDelete = () => {
    if (!deletedNoteInfo) return;

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }

    playClickSound();

    const restoredNote = deletedNoteInfo.note;
    const restoredIndex = deletedNoteInfo.originalIndex;

    setNotes(prev => {
      if (prev.some(n => n.id === restoredNote.id)) return prev;
      const copy = [...prev];
      const insertAt = Math.min(restoredIndex, copy.length);
      copy.splice(insertAt, 0, restoredNote);
      return copy;
    });

    setDeletedNoteInfo(null);
  };

  // Toggle pin directly from card
  const handleTogglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playPinSound();
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  // Filter & sort notes (pinned first)
  const filteredNotes = useMemo(() => {
    const list = notes.filter(note => {
      const q = searchQuery.toLowerCase();
      const plainTitle = stripHtml(note.title).toLowerCase();
      const plainContent = stripHtml(note.content).toLowerCase();
      return (
        plainTitle.includes(q) ||
        plainContent.includes(q)
      );
    });

    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, searchQuery]);

  // Copy note text
  const handleCopy = () => {
    playCopySound();
    const cleanTitleText = stripHtml(title);
    const cleanContentText = stripHtml(content);
    const fullText = `${cleanTitleText}\n\n${cleanContentText}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper date format: 'Aug 13, 6:33 PM'
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${monthDay}, ${time}`;
  };

  return (
    <div className="app-layout-root relative min-h-screen w-full flex flex-col items-center justify-between pb-36 pt-8 sm:pt-10 selection:bg-white/40" style={{ paddingLeft: '32px', paddingRight: '32px', boxSizing: 'border-box' }}>
      
      {/* Top Right Settings Icon Button */}
      <motion.button
        whileHover={{ scale: 1.12, rotate: 30 }}
        whileTap={{ scale: 0.88 }}
        type="button"
        onClick={() => {
          playClickSound();
          setIsSettingsOpen(true);
        }}
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 50, width: '52px', height: '52px' }}
        className="p-2.5 sm:p-3 rounded-full liquid-glass-btn text-slate-700 hover:text-slate-900 shadow-md cursor-pointer transition-all border border-white/80 flex items-center justify-center"
        title="Settings"
        aria-label="Settings"
      >
        <svg 
          viewBox="0 0 24 24"
          style={{ width: '30px', height: '30px' }}
          className="w-[30px] h-[30px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 2.8
               10.9 2.8
               10.3 5.1
               8.6 5.8
               6.5 4.4
               5.1 5.8
               6.2 7.9
               5.5 9.6
               3.2 10.2
               3.2 12
               3.2 13.8
               5.5 14.4
               6.2 16.1
               5.1 18.2
               6.5 19.6
               8.6 18.2
               10.3 18.9
               10.9 21.2
               12 21.2
               13.1 21.2
               13.7 18.9
               15.4 18.2
               17.5 19.6
               18.9 18.2
               17.8 16.1
               18.5 14.4
               20.8 13.8
               20.8 12
               20.8 10.2
               18.5 9.6
               17.8 7.9
               18.9 5.8
               17.5 4.4
               15.4 5.8
               13.7 5.1
               13.1 2.8
               12 2.8Z"
          />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      </motion.button>

      {/* Liquid Ambient Canvas Background */}
      <div className="liquid-bg">
        <div className="liquid-orb-1" />
        <div className="liquid-orb-2" />
        <div className="liquid-orb-3" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-8 box-border">
        
        {/* Header Title with Spring Entrance */}
        <motion.header 
          initial={{ opacity: 0, y: -25, scale: 0.95, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="relative flex flex-col items-center justify-center pb-2 text-center w-full h-[170px]"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900/90 drop-shadow-sm text-center">
            All Notes
          </h1>
          <p className="text-sm sm:text-base font-semibold text-slate-500/90 mt-1.5 tracking-tight">
            {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
          </p>
        </motion.header>

        {/* Notes Grid */}
        <main className="space-y-6 w-full box-border">
          <AnimatePresence mode="wait">
            {filteredNotes.length === 0 ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, scale: 0.92, y: 20, filter: 'blur(8px)' }}
                animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.92, y: -15, filter: 'blur(8px)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="glass-panel rounded-3xl w-full my-6 box-border overflow-hidden"
              >
                <div className="note-card-safe-area flex flex-col items-center justify-center text-center space-y-4 py-10 sm:py-12 px-6 sm:px-8">
                  <motion.div 
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-14 h-14 rounded-full glass-pill flex items-center justify-center text-slate-500 shadow-inner"
                  >
                    <Search className="w-6 h-6" />
                  </motion.div>
                  <div className="space-y-1">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800" style={{ textAlign: 'center', fontSize: '15px', lineHeight: '25px' }}>No notes found</h3>
                    <p className="text-xs text-slate-600 max-w-xs leading-relaxed mx-auto">
                      {searchQuery 
                        ? `No notes matching "${searchQuery}". Try a different term or clear search.`
                        : `Click the (+) button below to create your first note.`}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.06, filter: 'brightness(1.08)' }}
                    whileTap={{ scale: 0.94 }}
                    type="button"
                    onClick={handleOpenNewNote}
                    className="liquid-glass-capsule gap-2 px-5 cursor-pointer"
                    title="Create Note"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Note</span>
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full box-border"
              >
                <AnimatePresence mode="popLayout">
                  {filteredNotes.map((note, index) => (
                    <NoteCard
                      key={note.id}
                      index={index}
                      note={note}
                      onEdit={handleEditNote}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDeleteNote}
                      formatDate={formatDate}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Bottom Floating Bar - Animated Slide Entrance/Exit */}
      <AnimatePresence>
        {!isEditorOpen && !isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 70, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="bottom-bar"
          >
            <div 
              className="search-wrapper" 
              style={{ 
                paddingLeft: '10px', 
                paddingRight: '10px', 
                paddingTop: '10px', 
                paddingBottom: '10px', 
                marginLeft: '0px',
                height: '59px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
            >
              <div className="search-icon-btn" title="Search">
                <Search className="w-[22px] h-[22px] text-slate-700 stroke-[2.2]" />
              </div>
              <input
                type="text"
                className="search-box"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: '100%', flex: 1 }}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', damping: 18, stiffness: 350 }}
              className="add addnotebtnclass" 
              onClick={handleOpenNewNote} 
              title="New Note"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
              }}
            >
              <svg
                className="add-note-icon"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* SQUARE ROUNDED NOTE */}
                <g transform="rotate(-7 48 50)">
                  {/* Main square note */}
                  <path
                    className="note-paper"
                    d="
                      M20 18
                      C20 12 24 9 30 9
                      H67
                      C73 9 77 13 77 19
                      V70
                      C77 76 73 80 67 80
                      H30
                      C24 80 20 76 20 70
                      Z
                    "
                  />

                  {/* Curved inner paper surface */}
                  <path
                    className="note-paper-inner"
                    d="
                      M26 23
                      C26 20 28 17 32 17
                      H65
                      C68 17 71 20 71 23
                      V66
                      C71 69 68 72 65 72
                      H32
                      C28 72 26 69 26 66
                      Z
                    "
                  />

                  {/* Top binding details */}
                  <path
                    className="note-line"
                    d="M35 11 V18"
                  />

                  <path
                    className="note-line"
                    d="M48 11 V18"
                  />

                  <path
                    className="note-line"
                    d="M61 11 V18"
                  />

                  {/* NOTE WRITING */}
                  <path
                    className="note-line"
                    d="M34 32 C42 30.5 51 29 61 28"
                  />

                  <path
                    className="note-line"
                    d="M34 42 C42 40.5 51 39 61 38"
                  />

                  <path
                    className="note-line"
                    d="M34 53 C40 52 46 51 52 50"
                  />

                  <path
                    className="note-line"
                    d="M34 63 C39 62 44 61 49 60"
                  />
                </g>

                {/* PENCIL */}
                <path
                  className="pencil"
                  d="
                    M53 56
                    L72 29
                    C75 24 79 22 83 24
                    L88 28
                    C92 31 93 35 90 39
                    L70 65
                    L58 62
                    Z
                  "
                />

                {/* Pencil highlights */}
                <path
                  className="pencil-line"
                  d="M64 59 L83 33"
                />

                <path
                  className="pencil-line"
                  d="M70 63 L89 37"
                />

                {/* Pencil tip */}
                <path
                  className="pencil-tip"
                  d="
                    M53 56
                    L54 67
                    C54 70 57 72 60 69
                    L70 65
                    Z
                  "
                />

                {/* Pencil tip detail */}
                <path
                  className="pencil-tip-line"
                  d="M57 65 L60 69"
                />

                {/* SMALL PLUS = ADD NOTE */}
                <g className="add-note-plus">
                  {/* Vertical + */}
                  <path
                    className="note-line"
                    d="M68 17 V25"
                  />

                  {/* Horizontal + */}
                  <path
                    className="note-line"
                    d="M64 21 H72"
                  />
                </g>
              </svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Liquid Glass Note Editor Screen */}
      <AnimatePresence>
        {isEditorOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40, filter: 'blur(16px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: 30, filter: 'blur(16px)' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-0 z-50 flex flex-col justify-between glass-modal p-6 sm:p-8 md:p-10 overflow-y-auto"
          >
            {/* Header Bar */}
            <div 
              className="flex items-center justify-between pb-4 border-b border-white/50 max-w-5xl w-full mx-auto px-1 sm:px-3"
              style={{ paddingLeft: '17px', paddingRight: '18px', paddingTop: '17px', paddingBottom: '8px', height: '72.6667px' }}
            >
              <div 
                className="flex items-center gap-2.5"
                style={{ paddingRight: '10px', paddingTop: '0px', paddingBottom: '10px' }}
              >
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  type="button"
                  onClick={handleSaveNote}
                  className="liquid-glass-capsule gap-1.5 cursor-pointer"
                  title="Back to Notes"
                  style={{ marginRight: '0px', marginTop: '-10px', marginLeft: '-10px', paddingRight: '16px' }}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                  <span>Back to Notes</span>
                </motion.button>
              </div>

              <div 
                className="flex items-center gap-2.5 sm:gap-3"
                style={{ paddingLeft: '10px', paddingRight: '0px', paddingTop: '0px', paddingBottom: '10px', marginLeft: '0px', marginTop: '-10px', marginBottom: '7px', marginRight: '-10px', height: '55px' }}
              >
                {/* Copy Button */}
                {(title || content) && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={handleCopy}
                    className="liquid-glass-btn text-slate-700 hover:text-slate-900 cursor-pointer"
                    title="Copy to Clipboard"
                    style={{ paddingLeft: '0px', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', marginLeft: '0px', marginRight: '0px', marginTop: '0px', marginBottom: '0px' }}
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    ) : (
                      <Copy className="w-4 h-4 stroke-[2.2]" />
                    )}
                  </motion.button>
                )}

                {/* Delete Button */}
                {activeNoteId && (
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => handleDeleteNote(activeNoteId)}
                    className="liquid-glass-btn text-rose-600 hover:text-rose-700 cursor-pointer"
                    title="Delete Note"
                    style={!(title || content) ? { paddingLeft: '14px', paddingTop: '0px', paddingRight: '14px', paddingBottom: '0px', marginLeft: '0px', marginRight: '7px', marginTop: '7px', marginBottom: '0px' } : undefined}
                  >
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                  </motion.button>
                )}

                {/* Save Button */}
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  animate={
                    (title.length > 0 || content.length > 0)
                      ? {
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            '0 10px 28px -6px rgba(0, 122, 255, 0.2), inset 0 2px 1.5px 0 rgba(255, 255, 255, 1)',
                            '0 14px 34px -4px rgba(0, 122, 255, 0.5), inset 0 2px 1.5px 0 rgba(255, 255, 255, 1), 0 0 0 3px rgba(0, 122, 255, 0.25)',
                            '0 10px 28px -6px rgba(0, 122, 255, 0.2), inset 0 2px 1.5px 0 rgba(255, 255, 255, 1)',
                          ],
                        }
                      : { scale: 1 }
                  }
                  transition={
                    (title.length > 0 || content.length > 0)
                      ? {
                          duration: 1.8,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : { duration: 0.2 }
                  }
                  type="button"
                  onClick={handleSaveNote}
                  className="liquid-glass-capsule px-5 font-extrabold text-slate-900 cursor-pointer"
                  title="Save and Close"
                  style={!(title || content) && !activeNoteId ? { paddingLeft: '14px', paddingTop: '0px', paddingRight: '14px', paddingBottom: '0px', marginLeft: '0px', marginRight: '7px', marginTop: '7px', marginBottom: '0px' } : undefined}
                >
                  <span>Save</span>
                </motion.button>
              </div>
            </div>

            {/* Title & Body Inputs (Fullscreen canvas) */}
            <div className="max-w-5xl w-full mx-auto my-auto py-8 flex-1 flex flex-col space-y-6">
              <RichEditable
                ref={titleEditorRef}
                placeholder="Title..."
                initialValue={title}
                onChange={val => setTitle(val)}
                onFocus={() => {
                  lastActiveEditorRef.current = 'title';
                }}
                defaultColor="#0f172a"
                activeColor={selectedColor}
                isSingleLine={true}
                className="w-full bg-transparent text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-center"
                style={{
                  minHeight: '70px',
                  lineHeight: '1.2',
                }}
                autoFocus
              />

              <RichEditable
                ref={contentEditorRef}
                placeholder="Start typing your note here..."
                initialValue={content}
                onChange={val => setContent(val)}
                onFocus={() => {
                  lastActiveEditorRef.current = 'content';
                }}
                defaultColor="#334155"
                activeColor={selectedColor}
                isSingleLine={false}
                className="w-full flex-1 min-h-[50vh] bg-transparent text-base sm:text-lg md:text-xl leading-relaxed font-normal"
                style={{
                  minHeight: '50vh',
                }}
              />
            </div>

            {/* Footer Toolbar */}
            <div 
              className="pt-4 border-t border-white/50 w-full mx-auto flex items-center justify-center text-center"
              style={{ marginBottom: '5px' }}
            >
              {/* Color Presets & Apple Custom Color Picker */}
              <div className="flex items-center justify-center gap-3 flex-wrap sm:flex-nowrap mx-auto text-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Text Color:</span>
                <div className="flex items-center justify-center gap-2.5 relative mx-auto">
                  {COLOR_PRESETS.map((c, idx) => {
                    const isSelected = selectedColor.toLowerCase() === c.value.toLowerCase();
                    return (
                      <motion.button
                        key={c.value}
                        initial={{ opacity: 0, scale: 0.8, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ 
                          delay: idx * 0.04,
                          type: 'spring', 
                          stiffness: 420, 
                          damping: 20 
                        }}
                        whileHover={{ 
                          scale: 1.3, 
                          y: -3,
                          boxShadow: `0 8px 18px ${c.value}55, inset 0 1.5px 2px rgba(255,255,255,0.75)` 
                        }}
                        whileTap={{ scale: 0.85 }}
                        type="button"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          playClickSound();
                          handleColorSelect(c.value);
                          setIsColorPickerOpen(false);
                        }}
                        className={`w-6 h-6 rounded-full cursor-pointer relative flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-600 scale-110 shadow-lg' 
                            : 'hover:opacity-100'
                        }`}
                        style={{ 
                          backgroundColor: c.value,
                          padding: 0,
                          margin: 0,
                          boxShadow: isSelected 
                            ? `0 6px 16px ${c.value}66, inset 0 1.5px 2px rgba(255, 255, 255, 0.85), inset 0 -1px 2px rgba(0,0,0,0.25)` 
                            : '0 3px 8px rgba(0,0,0,0.18), inset 0 1px 1.5px rgba(255, 255, 255, 0.65), inset 0 -1px 1.5px rgba(0,0,0,0.18)',
                          border: '1px solid rgba(255, 255, 255, 0.45)'
                        }}
                        title={c.name}
                      >
                        {isSelected && (
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="w-2 h-2 rounded-full bg-white shadow-sm" 
                          />
                        )}
                      </motion.button>
                    );
                  })}

                  {/* Apple Custom Color Picker Trigger Button */}
                  <motion.div 
                    className="relative flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.8, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ 
                      delay: COLOR_PRESETS.length * 0.04,
                      type: 'spring', 
                      stiffness: 420, 
                      damping: 20 
                    }}
                    style={{ padding: 0, margin: 0 }}
                  >
                    <motion.button
                      whileHover={{ 
                        scale: 1.3, 
                        y: -3,
                        boxShadow: '0 8px 22px rgba(255, 45, 85, 0.4), 0 4px 12px rgba(0, 122, 255, 0.35)' 
                      }}
                      whileTap={{ scale: 0.85 }}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        playClickSound();
                        setIsColorPickerOpen(prev => !prev);
                      }}
                      className={`w-7 h-7 rounded-full p-[2px] cursor-pointer transition-all flex items-center justify-center relative overflow-hidden group ${
                        !COLOR_PRESETS.some(c => c.value.toLowerCase() === selectedColor.toLowerCase())
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-600 scale-110 shadow-xl'
                          : 'shadow-md'
                      }`}
                      style={{
                        padding: 0,
                        margin: 0,
                        background: 'linear-gradient(135deg, #FF2D55 0%, #AF52DE 25%, #007AFF 50%, #34C759 75%, #FF9500 100%)',
                        border: '1.5px solid rgba(255, 255, 255, 0.65)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.8)'
                      }}
                      title="Apple Custom Color Picker"
                    >
                      <div 
                        className="w-full h-full rounded-full flex items-center justify-center text-white transition-colors"
                        style={{
                          backgroundColor: !COLOR_PRESETS.some(c => c.value.toLowerCase() === selectedColor.toLowerCase())
                            ? selectedColor
                            : 'rgba(0, 0, 0, 0.28)',
                          backdropFilter: 'blur(2px)',
                          WebkitBackdropFilter: 'blur(2px)'
                        }}
                      >
                        <motion.div
                          whileHover={{ rotate: 35, scale: 1.15 }}
                          transition={{ type: 'spring', stiffness: 350, damping: 15 }}
                          className="flex items-center justify-center"
                        >
                          <Palette className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[2.4]" />
                        </motion.div>
                      </div>
                    </motion.button>

                    {/* Hidden Native HTML Color Input for Device System Color Picker */}
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={selectedColor.startsWith('#') ? selectedColor : '#007AFF'}
                      onInput={e => {
                        const val = (e.target as HTMLInputElement).value;
                        handleColorSelect(val);
                      }}
                      onChange={e => {
                        const val = e.target.value;
                        handleColorSelect(val);
                        setIsColorPickerOpen(false);
                      }}
                      className="sr-only fixed pointer-events-none opacity-0"
                      tabIndex={-1}
                    />

                    {/* Apple Liquid Glass Color Picker Popover */}
                    <AnimatePresence>
                      {isColorPickerOpen && (
                        <>
                          {/* Backdrop to close popover on outside tap */}
                          <div 
                            className="fixed inset-0 z-40 cursor-default" 
                            onClick={() => {
                              setIsColorPickerOpen(false);
                              const target = lastActiveEditorRef.current === 'title' ? titleEditorRef.current : contentEditorRef.current;
                              target?.focus();
                            }} 
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.88, y: 15, x: '-50%', filter: 'blur(8px)' }}
                            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%', filter: 'blur(0px)' }}
                            exit={{ opacity: 0, scale: 0.88, y: 15, x: '-50%', filter: 'blur(8px)' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            className="fixed z-50 flex flex-col gap-3"
                            style={{
                              position: 'fixed',
                              top: 'auto',
                              right: 'auto',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              bottom: '65px',
                              paddingLeft: '9px', 
                              paddingRight: '9px',
                              paddingTop: '9px',
                              paddingBottom: '8px',
                              marginLeft: '0px',
                              marginRight: '0px',
                              marginTop: '0px',
                              marginBottom: '0px',
                              width: '270px',
                              borderRadius: '29px',
                              background: 'rgba(255, 255, 255, 0.85)',
                              backdropFilter: 'blur(30px) saturate(100%)',
                              WebkitBackdropFilter: 'blur(30px) saturate(100%)',
                              border: '1px solid rgba(255, 255, 255, 0.8)',
                              boxShadow: '0 30px 60px rgba(0, 0, 0, 0.22), 0 12px 30px rgba(0, 0, 0, 0.12), inset 0 1.5px 2px rgba(255, 255, 255, 0.9)',
                            }}
                            onClick={e => e.stopPropagation()}
                           >
                            <div 
                              className="flex items-center justify-between px-1"
                              style={{
                                width: '250px',
                                height: '33px',
                                paddingLeft: '17px', 
                                paddingRight: '17px',
                                paddingTop: '17px',
                                paddingBottom: '17px',
                                marginLeft: '0px',
                                marginRight: '0px',
                                marginTop: '7px',
                                marginBottom: '0px',
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded-full border border-black/10 shadow-xs"
                                  style={{ backgroundColor: selectedColor }}
                                />
                                <span 
                                  className="text-[13px] font-extrabold uppercase tracking-wider text-slate-950 inline-block"
                                  style={{ width: '130px' }}
                                >
                                  Theme Colors
                                </span>
                              </div>

                              <button
                                type="button"
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setIsColorPickerOpen(false);
                                  const target = lastActiveEditorRef.current === 'title' ? titleEditorRef.current : contentEditorRef.current;
                                  target?.focus();
                                }}
                                className="p-1 rounded-full hover:bg-black/10 text-slate-950 hover:text-black transition-colors cursor-pointer"
                                style={{
                                  paddingLeft: '14px', 
                                  paddingRight: '14px',
                                  paddingTop: '14px',
                                  paddingBottom: '14px',
                                  marginLeft: '14px',
                                  marginRight: '14px',
                                  marginTop: '14px',
                                  marginBottom: '14px',
                                }}
                                title="Close"
                              >
                                <X className="w-4.5 h-4.5 stroke-[2.5]" />
                              </button>
                            </div>

                            {/* Grid of Apple HIG Colors */}
                            <div 
                              className="grid grid-cols-6 gap-2.5 py-1 justify-items-center justify-center mx-auto"
                              style={{
                                width: 'auto',
                                maxWidth: '240px',
                                paddingLeft: '0px',
                                paddingRight: '0px',
                                paddingTop: '6px',
                                paddingBottom: '6px',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                                marginTop: '0px',
                                marginBottom: '0px',
                              }}
                            >
                              {APPLE_HIG_PALETTE.map((item, index) => {
                                const isSwatchSelected = selectedColor.toLowerCase() === item.value.toLowerCase();
                                return (
                                  <motion.button
                                    key={item.value}
                                    initial={{ scale: 0.6, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ 
                                      delay: index * 0.015,
                                      type: 'spring', 
                                      stiffness: 450, 
                                      damping: 22 
                                    }}
                                    whileHover={{ 
                                      scale: 1.28, 
                                      y: -2,
                                      boxShadow: `0 8px 18px ${item.value}66, inset 0 1.5px 2px rgba(255,255,255,0.8)` 
                                    }}
                                    whileTap={{ scale: 0.86 }}
                                    type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      playClickSound();
                                      handleColorSelect(item.value);
                                      setIsColorPickerOpen(false);
                                    }}
                                    className={`w-7 h-7 rounded-full cursor-pointer transition-all relative flex items-center justify-center ${
                                      isSwatchSelected
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-600 scale-110 shadow-lg'
                                        : 'shadow-xs hover:shadow-md'
                                    }`}
                                    style={{ 
                                      backgroundColor: item.value,
                                      border: '1px solid rgba(255, 255, 255, 0.5)',
                                      boxShadow: isSwatchSelected 
                                        ? `0 6px 16px ${item.value}66, inset 0 1.5px 2px rgba(255, 255, 255, 0.85)` 
                                        : '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 1.5px rgba(255, 255, 255, 0.6)'
                                    }}
                                    title={item.name}
                                  >
                                    {isSwatchSelected && (
                                      <motion.div
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                      >
                                        <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow-md" />
                                      </motion.div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </div>

                            {/* Custom Spectrum Wheel trigger */}
                            <motion.button
                              whileHover={{ scale: 1.02, translateY: -1 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onMouseDown={e => e.preventDefault()}
                              onClick={() => {
                                playClickSound();
                                colorInputRef.current?.click();
                              }}
                              style={{
                                width: '236px',
                                height: '44px',
                                marginLeft: 'auto',
                                marginRight: 'auto',
                                marginBottom: '4px',
                                borderRadius: '29px',
                                background: 'rgba(255, 255, 255, 0.018)',
                                backdropFilter: 'blur(0px) saturate(100%) contrast(100%) brightness(1.0)',
                                WebkitBackdropFilter: 'blur(0px) saturate(100%) contrast(100%) brightness(1.0)',
                                border: '1px solid rgba(255, 255, 255, 0.32)',
                                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.42), 0 12px 30px rgba(0, 0, 0, 0.18), 0 0 35px rgba(255, 255, 255, 0.08), inset 0 1.5px 2px rgba(255, 255, 255, 0.65), inset 0 -1.5px 2px rgba(0, 0, 0, 0.18), inset 1px 0 1px rgba(255, 255, 255, 0.28), inset -1px 0 1px rgba(255, 255, 255, 0.12)',
                                overflow: 'hidden',
                                color: '#1a1a1c',
                                cursor: 'pointer',
                                transition: 'transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease',
                              }}
                              className="flex items-center justify-center gap-2.5 text-xs font-bold"
                            >
                              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 via-blue-500 to-amber-400 p-[1.5px] shrink-0 shadow-xs flex items-center justify-center">
                                <div className="w-full h-full rounded-full bg-white/20" />
                              </div>
                              <span className="tracking-wide">Custom Color Wheel...</span>
                            </motion.button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/20 backdrop-blur-xl overflow-y-auto"
            onClick={() => {
              playDismissSound();
              setIsSettingsOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 15, opacity: 0, filter: 'blur(12px)' }}
              animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ scale: 0.92, y: 15, opacity: 0, filter: 'blur(12px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '316px',
                minHeight: '270px',
                paddingLeft: '9px',
                paddingRight: '9px',
                paddingTop: '9px',
                paddingBottom: '14px',
              }}
              className="glass-panel-modal my-auto max-w-sm sm:max-w-md rounded-3xl space-y-4 shadow-2xl relative overflow-hidden border border-white/80"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-none border-transparent bg-transparent shadow-none" style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', marginTop: '4px', backgroundColor: 'transparent', borderColor: 'transparent', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                <div className="flex items-center gap-3" style={{ marginLeft: '8px', marginTop: '2px', marginBottom: '2px' }}>
                  <div className="p-2 rounded-2xl bg-transparent text-slate-800 border-none border-transparent shadow-none" style={{ backgroundColor: 'transparent', borderColor: 'transparent', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    <motion.svg 
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.17, ease: "linear" }}
                      viewBox="0 0 24 24"
                      className="w-[27px] h-[27px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      style={{ width: '27px', height: '27px', marginLeft: '2px', marginRight: '2px', marginTop: '2px', marginBottom: '2px', transformOrigin: 'center' }}
                    >
                      <path
                        d="M12 2.8
                           10.9 2.8
                           10.3 5.1
                           8.6 5.8
                           6.5 4.4
                           5.1 5.8
                           6.2 7.9
                           5.5 9.6
                           3.2 10.2
                           3.2 12
                           3.2 13.8
                           5.5 14.4
                           6.2 16.1
                           5.1 18.2
                           6.5 19.6
                           8.6 18.2
                           10.3 18.9
                           10.9 21.2
                           12 21.2
                           13.1 21.2
                           13.7 18.9
                           15.4 18.2
                           17.5 19.6
                           18.9 18.2
                           17.8 16.1
                           18.5 14.4
                           20.8 13.8
                           20.8 12
                           20.8 10.2
                           18.5 9.6
                           17.8 7.9
                           18.9 5.8
                           17.5 4.4
                           15.4 5.8
                           13.7 5.1
                           13.1 2.8
                           12 2.8Z"
                      />
                      <circle cx="12" cy="12" r="3.2" />
                    </motion.svg>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Settings
                  </h2>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    playDismissSound();
                    setIsSettingsOpen(false);
                  }}
                  style={{ marginTop: '2px', marginBottom: '2px', marginRight: '4px', marginLeft: '4px', backgroundColor: 'transparent', borderColor: 'transparent', border: 'none', background: 'transparent', boxShadow: 'none' }}
                  className="p-2 rounded-full hover:bg-white/40 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer bg-transparent border-none border-transparent shadow-none"
                  title="Close Settings"
                >
                  <X className="w-5 h-5" style={{ marginLeft: '3px', marginRight: '3px', marginTop: '3px', marginBottom: '3px' }} />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="space-y-3 flex flex-col items-center justify-center w-full" style={{ marginTop: '6px', marginLeft: '0px' }}>
                {/* Sound Volume Controller with Liquid Glass Slider */}
                <div 
                  className="flex flex-col rounded-2xl liquid-glass-row gap-1.5"
                  style={{ 
                    width: '272px', 
                    marginLeft: 'auto', 
                    marginRight: 'auto', 
                    marginTop: '2px', 
                    marginBottom: '2px',
                    paddingLeft: '21px',
                    paddingRight: '21px',
                    paddingTop: '14px',
                    paddingBottom: '8px'
                  }}
                >
                  <div className="flex items-center justify-between px-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={handleToggleMute}
                        title={isMuted ? "Unmute" : "Mute"}
                        className="p-1 rounded-lg hover:bg-white/40 transition-colors cursor-pointer flex items-center justify-center border-none bg-transparent"
                      >
                        {isMuted || soundVolume === 0 ? (
                          <VolumeX className="w-4 h-4 text-slate-500 stroke-[2.2]" />
                        ) : soundVolume < 50 ? (
                          <Volume1 className="w-4 h-4 text-blue-600 stroke-[2.2]" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-blue-600 stroke-[2.2]" />
                        )}
                      </motion.button>
                      <span className="text-xs font-bold text-slate-800">Sound Volume</span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={handleToggleMute}
                      style={{
                        backgroundColor: 'transparent',
                        background: 'transparent',
                        borderColor: 'transparent',
                        border: 'none',
                        boxShadow: 'none',
                      }}
                      className="text-[11px] font-black text-slate-700 hover:text-slate-900 px-2 py-0.5 rounded-lg bg-transparent border-transparent shadow-none cursor-pointer transition-colors"
                    >
                      {isMuted ? 'Muted' : `${soundVolume}%`}
                    </motion.button>
                  </div>

                  <div className="pb-0.5 pt-1 flex items-center justify-center">
                    <LiquidGlassSlider
                      value={isMuted ? 0 : soundVolume}
                      disabled={false}
                      style={{
                        paddingLeft: '0px',
                        marginLeft: '14px',
                        marginRight: '15px',
                        marginTop: '0px',
                        marginBottom: '0px',
                        width: '193px',
                      }}
                      onChange={(newVal) => {
                        handleVolumeChange(newVal);
                      }}
                      onChangeEnd={(newVal) => {
                        if (!isMuted && newVal > 0) {
                          playClickSound();
                        }
                      }}
                    />
                  </div>
                </div>

                {/* About us Option */}
                <div 
                  className="flex items-center justify-between p-3.5 rounded-2xl liquid-glass-row"
                  style={{ width: '272px', height: '48px', paddingTop: '10px', paddingBottom: '10px', marginLeft: 'auto', marginRight: 'auto', marginTop: '2px', marginBottom: '2px' }}
                >
                  <div className="flex items-center gap-3" style={{ paddingLeft: '6px', paddingRight: '6px', paddingTop: '2px', paddingBottom: '2px', marginLeft: '8px', marginRight: '0px' }}>
                    <div style={{ backgroundColor: 'transparent', borderColor: 'transparent', border: 'none', background: 'transparent', boxShadow: 'none' }} className="p-1 rounded-xl bg-transparent border-none border-transparent shadow-none flex items-center justify-center">
                      <Info className="w-5 h-5 text-blue-600 stroke-[2.2]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-600">About us</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsAboutOpen(true);
                    }}
                    style={{ paddingLeft: '12px', paddingRight: '12px', paddingTop: '6px', paddingBottom: '6px', marginLeft: '0px', marginRight: '8px', backgroundColor: '#ffffff', borderColor: '#ffffff', color: '#000000', boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.16)' }}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg border liquid-glass-toggle-active"
                  >
                    <span className="text-slate-900 font-extrabold" style={{ color: '#000000' }}>View</span>
                  </motion.button>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-1 flex items-center justify-center w-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', textAlign: 'center' }}>
                <div className="w-full flex items-center justify-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', marginLeft: 'auto', marginRight: 'auto', textAlign: 'center' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => {
                      playDismissSound();
                      setIsSettingsOpen(false);
                    }}
                    style={{ width: '272px', marginLeft: 'auto', marginRight: 'auto', marginTop: '4px', marginBottom: '8px', paddingTop: '12px', paddingBottom: '12px', paddingLeft: '0px', paddingRight: '0px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', backgroundColor: '#ffffff', borderColor: '#ffffff' }}
                    className="rounded-2xl font-black text-sm liquid-glass-btn-cta tracking-wide cursor-pointer text-center flex items-center justify-center"
                  >
                    <span style={{ textAlign: 'center', color: '#000000', borderColor: '#ffffff', display: 'inline-block', width: '100%' }}>Done</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About Us Modal Screen */}
      <AnimatePresence>
        {isAboutOpen && (
          <motion.div
            id="about-modal"
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              playDismissSound();
              setIsAboutOpen(false);
            }}
          >
            <motion.div
              className="modal-card about-fullscreen-card"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* About Header */}
              <div className="about-header">
                <div className="about-title-group">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <h2>About Us</h2>
                </div>
                <button
                  id="about-close-btn"
                  type="button"
                  className="close-btn"
                  title="Close About Us Section"
                  onClick={() => {
                    playDismissSound();
                    setIsAboutOpen(false);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              {/* About Content */}
              <div className="about-content">
                {/* Founders Image & App Title */}
                <motion.div 
                  className="about-hero"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="avatar-ring-wrapper">
                    <div className="avatar-glow-ring"></div>
                    <div className="avatar-frame">
                      <img
                        id="founders-img"
                        className="avatar-img"
                        src={foundersImg}
                        alt="Daniel Kidanu & Yerosen Desalegn - DY NOTE Founders"
                        referrerPolicy="no-referrer"
                        style={{
                            objectPosition: "50% 24%",
                        }}
                      />
                    </div>
                  </div>
                  <h1 className="about-app-title">DY Note</h1>
                  <p className="about-app-subtitle">Designed &amp; Developed By Daniel Kidanu &amp; Yerosen Desalegn</p>
                </motion.div>

                {/* THE ANOTHER STORY CARD FOR THE FOUNDERS IMAGE */}
                <motion.div 
                  className="story-card-forfounders-image"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                >
                  <div className="story-header-of-foundersimage">
                    <img
                      id="founders-img-card"
                      className="avatar-img"
                      src={foundersImg}
                      alt="Daniel Kidanu & Yerosen Desalegn - DY NOTE Founders"
                      referrerPolicy="no-referrer"
                      style={{ border: 'none', outline: 'none' }}
                    />
                  </div>
                  <div className="story-header-of-foundersimagee">
                    <div className="story-header-of-foundersimageee">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <b style={{ textAlign: 'center' }}>Best Friends &amp; Co-Founders</b>
                    </div>
                    <h3 className="h3ofnameoffounders">Daniel Kidanu &amp; Yerosen Desalegn</h3>
                    <p className="poffounders">
                      This photo captures a friendship built on mutual trust, audacious dreams, and timeless memories. Daniel and Yerosen created DY Note together through hundreds of midnight sessions, technical challenges, genuine laughs, and unbreakable teamwork.
                    </p>
                    <p className="pofff">
                      Daniel Kidanu <span>+</span> Yerosen Desalegn
                    </p>
                  </div>
                </motion.div>

                {/* The Story Behind DY Card */}
                <motion.div 
                  className="story-card"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                >
                  <div className="thehederofcardofthestorybehinditclass">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 548 548"
                      className="w-[130px] h-[60px] inline-block shrink-0 text-slate-800"
                      style={{ width: '130px', height: '60px' }}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <title>Transparent Handshake</title>
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="M140 172 L139 173 L137 173 L135 174 L133 176 L131 180 L131 188 L132 190 L135 193 L139 195 L144 195 L145 194 L147 194 L149 193 L151 191 L153 187 L153 180 L151 176 L147 173 L145 173 L144 172 Z M140 178 L144 178 L147 181 L148 183 L148 185 L144 189 L140 189 L137 186 L136 184 L137 181 Z M509 258 L507 256 L507 255 L505 253 L505 252 L497 241 L496 238 L494 236 L494 235 L492 233 L492 232 L484 221 L483 218 L475 207 L474 204 L472 202 L472 201 L464 190 L463 187 L457 179 L456 176 L450 168 L449 165 L443 157 L442 154 L439 151 L438 148 L432 140 L431 137 L429 136 L427 136 L425 138 L424 138 L421 141 L420 141 L417 144 L416 144 L413 147 L412 147 L409 150 L408 150 L405 153 L404 153 L401 156 L400 156 L397 159 L396 159 L393 162 L392 162 L381 171 L377 173 L372 178 L372 180 L377 188 L371 193 L363 197 L361 197 L360 198 L347 198 L346 197 L338 197 L337 196 L333 196 L332 195 L327 195 L326 194 L321 194 L320 193 L316 193 L315 192 L312 192 L311 191 L307 191 L306 190 L302 190 L301 189 L297 189 L296 188 L286 188 L285 189 L282 189 L281 190 L279 190 L274 193 L269 193 L266 191 L264 191 L260 189 L255 189 L253 188 L252 189 L248 189 L247 190 L242 191 L239 193 L237 193 L236 194 L231 195 L228 197 L226 197 L225 198 L223 198 L222 199 L220 199 L219 200 L217 200 L213 202 L210 202 L209 203 L204 203 L203 204 L194 203 L191 201 L189 201 L185 199 L183 197 L171 191 L169 189 L169 188 L171 186 L172 183 L174 181 L175 179 L175 177 L167 170 L166 170 L160 165 L159 165 L157 163 L153 161 L150 158 L149 158 L147 156 L143 154 L140 151 L139 151 L137 149 L136 149 L134 147 L130 145 L127 142 L126 142 L122 139 L120 139 L118 140 L118 141 L116 143 L115 146 L113 148 L109 156 L105 161 L104 164 L102 166 L98 174 L94 179 L93 182 L91 184 L87 192 L83 197 L79 205 L75 210 L74 213 L72 215 L68 223 L62 231 L60 236 L58 238 L58 239 L54 244 L53 247 L51 249 L50 252 L46 257 L45 260 L42 264 L42 266 L45 269 L52 272 L54 274 L54 275 L65 280 L67 282 L76 286 L78 288 L96 297 L98 299 L102 299 L105 296 L106 293 L108 291 L109 288 L111 286 L119 290 L121 292 L128 295 L130 297 L133 298 L135 300 L136 300 L141 305 L142 305 L146 309 L146 310 L148 312 L149 312 L150 314 L154 318 L154 320 L152 324 L152 336 L153 337 L153 339 L154 341 L160 347 L164 349 L167 349 L168 350 L171 350 L172 349 L176 349 L177 350 L177 359 L178 360 L178 362 L179 364 L185 370 L191 373 L201 373 L203 372 L204 373 L204 378 L207 384 L212 389 L218 392 L229 392 L230 391 L232 391 L233 392 L233 394 L234 395 L234 398 L235 400 L240 406 L246 409 L248 409 L249 410 L255 410 L256 409 L258 409 L262 407 L268 402 L280 408 L283 408 L284 409 L292 409 L293 408 L296 408 L300 406 L304 402 L308 394 L310 395 L314 395 L315 396 L319 396 L320 395 L323 395 L329 392 L335 386 L338 380 L338 375 L340 373 L341 374 L352 374 L353 373 L355 373 L359 371 L365 365 L365 364 L368 360 L368 357 L369 356 L369 347 L370 346 L372 346 L373 347 L379 347 L380 346 L382 346 L383 345 L385 345 L387 344 L393 339 L393 338 L396 334 L396 332 L397 331 L397 328 L398 327 L398 322 L397 321 L397 318 L394 313 L413 294 L416 293 L418 291 L423 289 L427 286 L429 286 L436 282 L438 282 L441 286 L441 287 L443 289 L443 290 L445 292 L445 293 L447 295 L447 296 L452 296 L454 294 L457 293 L459 291 L464 289 L466 287 L471 285 L473 283 L476 282 L478 280 L488 275 L488 274 L490 272 L495 270 L497 268 L507 263 L509 261 Z M286 377 L301 391 L301 393 L299 397 L294 401 L292 401 L291 402 L285 402 L284 401 L279 400 L275 398 L273 396 L273 395 L276 392 L276 391 L281 386 L282 383 L284 381 L284 379 Z M273 364 L277 368 L277 370 L278 371 L278 377 L277 379 L270 387 L270 388 L265 393 L265 394 L258 401 L256 402 L254 402 L253 403 L251 403 L250 402 L248 402 L246 401 L242 397 L241 395 L241 393 L240 392 L241 387 L247 381 L247 380 L252 375 L252 374 L263 363 L271 363 Z M254 337 L255 339 L258 342 L258 344 L259 345 L259 349 L256 355 L244 368 L244 369 L237 376 L237 377 L230 384 L228 385 L225 385 L224 386 L223 385 L220 385 L216 383 L214 381 L214 380 L211 376 L211 370 L214 366 L214 365 L220 359 L220 358 L227 351 L227 350 L239 337 L240 337 L242 335 L250 335 Z M161 323 L166 323 L172 326 L176 330 L178 334 L178 338 L174 342 L171 342 L170 343 L164 341 L161 338 L159 334 L159 326 Z M220 322 L226 328 L226 330 L227 331 L227 335 L226 336 L226 338 L225 340 L219 346 L219 347 L213 353 L213 354 L202 365 L200 366 L193 366 L189 364 L184 358 L184 350 L185 348 L193 339 L193 338 L200 331 L200 330 L208 322 L210 321 L218 321 Z M165 196 L170 198 L172 200 L194 211 L196 213 L200 215 L204 219 L204 217 L200 212 L202 210 L210 210 L211 209 L218 208 L221 206 L223 206 L224 205 L226 205 L227 204 L232 203 L235 201 L237 201 L243 198 L245 198 L249 196 L252 196 L253 195 L255 196 L259 196 L260 197 L258 199 L256 200 L254 200 L253 201 L251 201 L250 202 L248 202 L245 204 L240 205 L236 208 L235 208 L231 212 L229 217 L227 219 L227 221 L215 245 L213 247 L207 259 L208 264 L214 270 L216 271 L218 271 L222 273 L232 273 L233 272 L235 272 L236 271 L241 270 L243 268 L246 267 L250 263 L251 263 L258 256 L258 255 L264 248 L265 245 L268 242 L272 242 L273 241 L277 241 L278 240 L283 240 L284 239 L291 238 L293 240 L296 241 L298 243 L302 245 L305 248 L309 250 L312 253 L316 255 L319 258 L320 258 L323 261 L324 261 L327 264 L328 264 L331 267 L332 267 L335 270 L336 270 L339 273 L340 273 L343 277 L344 277 L348 281 L349 281 L353 285 L354 285 L366 296 L367 296 L376 305 L377 305 L388 316 L390 320 L390 322 L391 323 L391 326 L390 327 L390 330 L389 332 L383 338 L381 339 L379 339 L378 340 L373 340 L372 339 L370 339 L366 337 L358 331 L357 331 L354 328 L350 326 L347 323 L346 323 L344 321 L343 321 L341 319 L340 319 L338 317 L337 317 L326 309 L321 307 L317 304 L315 304 L336 324 L337 324 L342 329 L343 329 L347 333 L348 333 L352 337 L353 337 L361 345 L361 347 L362 348 L362 355 L361 356 L361 358 L355 365 L351 367 L342 367 L338 364 L337 364 L335 362 L334 362 L332 360 L331 360 L328 357 L327 357 L325 355 L324 355 L322 353 L318 351 L312 346 L309 345 L301 339 L296 337 L292 334 L292 335 L307 350 L308 350 L314 356 L315 356 L320 361 L321 361 L325 365 L326 365 L331 370 L331 378 L329 382 L325 386 L321 388 L318 388 L317 389 L312 388 L306 385 L303 382 L300 381 L295 377 L287 373 L285 371 L284 369 L284 367 L282 363 L277 358 L273 356 L265 356 L264 354 L266 350 L266 343 L265 342 L265 340 L264 338 L258 331 L252 328 L247 328 L246 327 L245 328 L241 328 L240 329 L238 329 L235 331 L233 329 L233 326 L230 322 L230 321 L226 317 L220 314 L215 314 L213 313 L212 314 L208 314 L202 317 L187 334 L185 332 L182 326 L176 320 L170 317 L168 317 L167 316 L163 316 L143 296 L142 296 L134 290 L125 286 L123 284 L115 280 L115 278 L117 276 L117 274 L119 272 L121 267 L123 265 L124 262 L126 260 L127 257 L129 255 L133 247 L137 242 L138 239 L140 237 L141 234 L143 232 L144 229 L146 227 L147 224 L149 222 L150 219 L152 217 L156 209 L158 207 L161 201 Z M433 275 L421 281 L419 283 L414 285 L412 287 L406 290 L401 295 L401 296 L393 304 L392 304 L389 307 L370 289 L369 289 L363 283 L362 283 L358 279 L357 279 L353 275 L353 274 L352 274 L348 270 L346 269 L347 268 L352 268 L353 267 L357 267 L358 266 L360 266 L364 264 L369 260 L367 261 L365 261 L364 262 L362 262 L361 263 L344 263 L343 262 L340 262 L339 261 L337 261 L331 258 L329 256 L328 256 L317 247 L316 247 L310 242 L309 242 L307 240 L303 238 L300 235 L299 235 L297 233 L300 230 L301 228 L299 228 L295 230 L292 230 L291 231 L287 231 L286 232 L282 232 L281 233 L272 234 L271 235 L267 235 L265 233 L263 229 L262 229 L262 236 L258 244 L256 246 L256 247 L242 261 L241 261 L239 263 L237 264 L235 264 L234 265 L232 265 L231 266 L223 266 L222 265 L220 265 L218 264 L215 261 L215 259 L220 249 L222 247 L233 225 L233 223 L236 217 L240 213 L242 212 L244 212 L250 209 L255 208 L260 205 L265 204 L268 202 L270 202 L273 200 L278 199 L281 197 L283 197 L287 195 L295 195 L296 196 L300 196 L301 197 L305 197 L306 198 L310 198 L311 199 L315 199 L316 200 L320 200 L321 201 L325 201 L326 202 L331 202 L332 203 L337 203 L338 204 L346 204 L347 205 L361 205 L362 204 L365 204 L373 200 L381 194 L383 196 L383 197 L387 202 L388 205 L390 207 L390 208 L398 219 L399 222 L402 225 L403 228 L405 230 L405 231 L413 242 L414 245 L416 247 L416 248 L424 259 L425 262 L433 273 Z M122 148 L126 151 L127 151 L129 153 L130 153 L132 155 L133 155 L136 158 L137 158 L139 160 L143 162 L146 165 L150 167 L153 170 L157 172 L160 175 L164 177 L166 179 L166 180 L164 182 L163 185 L161 187 L160 190 L158 192 L154 200 L150 205 L149 208 L147 210 L146 213 L144 215 L143 218 L141 220 L140 223 L138 225 L137 228 L135 230 L134 233 L132 235 L128 243 L124 248 L119 258 L117 260 L114 266 L112 268 L111 271 L109 273 L109 275 L108 277 L106 279 L105 282 L103 284 L103 285 L101 287 L99 291 L91 287 L89 285 L82 282 L80 280 L71 276 L70 274 L69 274 L67 272 L53 265 L52 264 L52 262 L54 258 L58 253 L59 250 L61 248 L62 245 L66 240 L67 237 L71 232 L75 224 L79 219 L80 216 L82 214 L83 211 L85 209 L89 201 L93 196 L94 193 L96 191 L100 183 L104 178 L105 175 L107 173 L108 170 L112 165 L113 162 L115 160 L116 157 L118 155 L119 152 Z M427 146 L430 149 L430 150 L434 155 L435 158 L443 169 L444 172 L452 183 L453 186 L461 197 L462 200 L468 208 L469 211 L471 213 L471 214 L479 225 L480 228 L482 230 L482 231 L484 233 L484 234 L490 242 L491 245 L493 247 L493 248 L495 250 L495 251 L497 253 L497 254 L500 258 L498 260 L495 261 L493 263 L488 265 L486 267 L476 272 L474 274 L473 274 L472 276 L469 277 L467 279 L462 281 L460 283 L457 284 L455 286 L451 288 L443 277 L441 272 L435 264 L434 261 L432 259 L432 258 L430 256 L430 255 L428 253 L428 252 L420 241 L419 238 L417 236 L417 235 L415 233 L415 232 L413 230 L413 229 L411 227 L411 226 L403 215 L402 212 L400 210 L400 209 L398 207 L398 206 L396 204 L396 203 L394 201 L394 200 L392 198 L392 197 L384 186 L383 183 L381 181 L381 180 L385 176 L389 174 L392 171 L393 171 L396 168 L397 168 L401 164 L405 162 L408 159 L409 159 L412 156 L413 156 L416 153 L417 153 L420 150 L421 150 L424 147 Z"
                      />
                    </svg>
                    <b style={{ textAlign: 'center' }}>Two Best Friends, One Shared Vision</b>
                  </div>
                  <div className="story-header">
                    <h3>The Story Behind &quot;DY&quot;</h3>
                    <p className="story-subtitle">How two best friends turned a shared dream into reality</p>
                  </div>

                  <p className="story-text">
                    The name <strong>DY Note</strong> carries a deep personal story. It comes directly from the first letters of our names:{' '}
                    <span className="highlight-blue">Daniel Kidanu</span> and <span className="highlight-blue">Yerosen Desalegn</span>.
                  </p>

                  <p className="story-text">
                    What started as late-night study sessions evolved into an unbreakable bond of friendship and a passion for craftsmanship. Late into the night, when the world was quiet, we spent countless hours sitting side-by-side—fueled by late-night coffee, exchanging ideas, debating micro-interactions, and perfecting every pixel of this liquid glass interface.
                  </p>

                  <div className="story-quote">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                    </svg>
                    <p>
                      &quot;We built DY Note not just as a note-taking tool, but as a reflection of our friendship—clean, reliable, effortless, and designed to stay completely offline so your thoughts remain private forever.&quot;
                    </p>
                  </div>
                </motion.div>

                {/* THE FRIENDSHIP DNA SECTION (4 CORE PILLARS) */}
                <div className="friendship-dna-section">
                  <div className="section-hero-title">
                    <div className="section-title-combo">
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20 shrink-0" />
                      <h3>The DNA of Our Brotherhood</h3>
                    </div>
                    <p>What fuels our synergy and creative partnership</p>
                  </div>

                  <div className="friendship-grid">
                    {/* Card 1 */}
                    <div className="friendship-card">
                      <div className="flex items-center gap-3">
                        <div className="friendship-card-icon-wrap icon-wrap-blue">
                          <Shield className="w-5 h-5" />
                        </div>
                        <h4 className="friendship-card-title">Zero Ego &amp; Radical Trust</h4>
                      </div>
                      <p className="friendship-card-desc">
                        Where many partnerships stumble over ego, ours thrives on complete selflessness. Every design decision is made with mutual respect, honesty, and a shared pursuit of perfection.
                      </p>
                    </div>

                    {/* Card 2 */}
                    <div className="friendship-card">
                      <div className="flex items-center gap-3">
                        <div className="friendship-card-icon-wrap icon-wrap-purple">
                          <Coffee className="w-5 h-5" />
                        </div>
                        <h4 className="friendship-card-title">The 2:00 AM Coffee Philosophy</h4>
                      </div>
                      <p className="friendship-card-desc">
                        Our best breakthroughs never happened in formal meetings; they sparked at 2 AM with cold air outside, warm mugs in hand, brainstorming how to make notes feel alive.
                      </p>
                    </div>

                    {/* Card 3 */}
                    <div className="friendship-card">
                      <div className="flex items-center gap-3">
                        <div className="friendship-card-icon-wrap icon-wrap-emerald">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="friendship-card-title">Apple-Grade Craftsmanship</h4>
                      </div>
                      <p className="friendship-card-desc">
                        We debated for hours over single-pixel border radiuses, liquid friction curves, and sound pitch resonance. We believe personal tools should bring aesthetic delight.
                      </p>
                    </div>

                    {/* Card 4 */}
                    <div className="friendship-card">
                      <div className="flex items-center gap-3">
                        <div className="friendship-card-icon-wrap icon-wrap-amber">
                          <Zap className="w-5 h-5" />
                        </div>
                        <h4 className="friendship-card-title">Mutual Elevation &amp; Energy</h4>
                      </div>
                      <p className="friendship-card-desc">
                        When one was exhausted, the other provided momentum. When one imagined a bold feature, the other engineered the mathematics to make it fluid at 60 frames per second.
                      </p>
                    </div>
                  </div>
                </div>

                {/* THE JOURNEY MILESTONES TIMELINE */}
                <div className="timeline-section">
                  <div className="section-hero-title">
                    <div className="section-title-combo">
                      <Compass className="w-5 h-5 text-blue-600 shrink-0" />
                      <h3>Our Journey &amp; Milestones</h3>
                    </div>
                    <p>How two friends turned an idea into reality</p>
                  </div>

                  <div className="timeline-list">
                    <div className="timeline-item">
                      <h4 className="timeline-headline">The Late-Night Question</h4>
                      <p className="timeline-text">
                        Sitting after a long day of studying, Daniel and Yerosen asked: &quot;Why are modern note apps either cluttered or dependent on external servers? Can we build something pure, beautiful, and completely offline?&quot;
                      </p>
                    </div>

                    <div className="timeline-item">
                      <h4 className="timeline-headline">Engineering Liquid Physics &amp; Soundscapes</h4>
                      <p className="timeline-text">
                        Over 500+ hours spent coding the custom glass shaders, designing tactile auditory feedback for every click and pin, and perfecting local storage instant indexing.
                      </p>
                    </div>

                    <div className="timeline-item">
                      <h4 className="timeline-headline">DY Note v1.7 Release</h4>
                      <p className="timeline-text">
                        Launched as a testament to genuine brotherhood, uncompromising privacy, and modern glassmorphic beauty. Built for thinkers, creators, and dreamers.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Founders Bios Grid */}
                <div className="founders-section">
                  <h3 className="founders-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span>Meet the Co-Founders</span>
                  </h3>

                  <div className="founders-grid">
                    {/* Daniel Card */}
                    <div className="founder-card founder-d">
                      <div className="founder-header">
                        <div className="badge-avatar badge-d">D</div>
                        <div>
                          <h4 className="founder-name">Daniel Kidanu</h4>
                          <p className="founder-role role-d">Co-Founder &amp; Product Architect</p>
                        </div>
                      </div>
                      <p className="founder-bio">
                        Focused on fluid UX design, sound feedback harmony, and Apple-grade glassmorphic layouts that feel alive on every touch.
                      </p>
                      <div className="founder-tag">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                        <span>Systems &amp; UX Design</span>
                      </div>
                    </div>

                    {/* Yerosen Card */}
                    <div className="founder-card founder-y">
                      <div className="founder-header">
                        <div className="badge-avatar badge-y">Y</div>
                        <div>
                          <h4 className="founder-name">Yerosen Desalegn</h4>
                          <p className="founder-role role-y">Co-Founder &amp; Engineering Lead</p>
                        </div>
                      </div>
                      <p className="founder-bio" style={{ height: '78px' }}>
                        Dedicated to bulletproof local storage performance, silky 60fps animations, and zero-latency note search responsiveness.
                      </p>
                      <div className="founder-tag tag-y">
                        <svg
                          id="cupIcon"
                          className="cup-icon"
                          width="27"
                          height="26"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          {/* Animated 3 dots */}
                          <circle className="cup-steam-dot" cx="10" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0s" repeatCount="indefinite" />
                          </circle>
                          <circle className="cup-steam-dot" cx="14" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.2s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0.2s" repeatCount="indefinite" />
                          </circle>
                          <circle className="cup-steam-dot" cx="18" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.4s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0.4s" repeatCount="indefinite" />
                          </circle>
                          {/* Cup */}
                          <path
                            id="cupBody"
                            className="cup-body"
                            d="M6 10.5H21V17.5C21 21.1 18.1 23 13.5 23C8.9 23 6 21.1 6 17.5V10.5Z"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Cup handle */}
                          <path
                            id="cupHandle"
                            className="cup-handle"
                            d="M21 12H23C25 12 26 13.5 26 15.5C26 17.5 25 19 23 19H21"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span>Core Engineering &amp; Logic</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* THE PILLAR OF OUR WORK */}
                <div className="theplillarsofourworkclass">
                  <h1 className="h1ofpillar">How We Build This</h1>
                  <p className="pofpillar">The Pillars of Our Teamwork</p>
                  
                  <div className="latenightcoffeclass">
                    <div className="lighticon">
                      <h3>
                        <svg
                          id="cupIcon-pill"
                          className="cup-icon"
                          width="21"
                          height="21"
                          viewBox="0 0 28 28"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <circle className="cup-steam-dot" cx="10" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0s" repeatCount="indefinite" />
                          </circle>
                          <circle className="cup-steam-dot" cx="14" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.2s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0.2s" repeatCount="indefinite" />
                          </circle>
                          <circle className="cup-steam-dot" cx="18" cy="5" r="1.3" fill="#000000">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" begin="0.4s" repeatCount="indefinite" />
                            <animate attributeName="cy" values="5;3.8;5" dur="1.4s" begin="0.4s" repeatCount="indefinite" />
                          </circle>
                          <path
                            id="cupBody-pill"
                            className="cup-body"
                            d="M6 10.5H21V17.5C21 21.1 18.1 23 13.5 23C8.9 23 6 21.1 6 17.5V10.5Z"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            id="cupHandle-pill"
                            className="cup-handle"
                            d="M21 12H23C25 12 26 13.5 26 15.5C26 17.5 25 19 23 19H21"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Late-Night Coffee &amp; Code
                      </h3>
                    </div>
                    <p>Countless late-night coding sessions, sharing ideas, discussing technical designs, and building something we both believe in.</p>
                  </div>

                  <div className="unshakeableloyaltclass">
                    <div className="lighticon">
                      <h3>
                        <svg
                          id="shieldIcon"
                          className="shield-icon"
                          width="17"
                          height="17"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M12 3 C12 3 8.5 5.2 4.5 6.2 V11.5 C4.5 16.5 7.4 20 12 21.5 C16.6 20 19.5 16.5 19.5 11.5 V6.2 C15.5 5.2 12 3 12 3Z"
                            stroke="#000000"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Unshakeable Loyalty
                      </h3>
                    </div>
                    <p>Through every technical bug and deadline, we supported each other with zero rivalry and 100% mutual respect.</p>
                  </div>

                  <div className="sharedenegryclass">
                    <div className="lighticon">
                      <h3>
                        <svg
                          className="lightning-icon"
                          id="lightningIcon"
                          width="17"
                          height="17"
                          viewBox="0 0 48 48"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M29.5 5L10 26.5H23L18.5 43L38 21.5H25L29.5 5Z"
                            stroke="#000000"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Shared Energy &amp; Laughter
                      </h3>
                    </div>
                    <p>Even during long hours of debugging, we stayed positive and had fun, making the whole journey memorable.</p>
                  </div>

                  <div className="endofpilarrclass">
                    <div className="lighticon">
                      <h3>
                        D{' '}
                        <svg
                          className="lightning-icon"
                          id="lightningIcon-end"
                          width="17"
                          height="17"
                          viewBox="0 0 48 48"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M29.5 5L10 26.5H23L18.5 43L38 21.5H25L29.5 5Z"
                            stroke="#000000"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>{' '}
                        Y = DY Note
                      </h3>
                    </div>
                    <p>Built with dedication and strong brotherhood by two best friends who love technology.</p>
                  </div>
                </div>

                {/* INTERACTIVE BROTHERHOOD CHEER WIDGET */}
                <motion.div 
                  className="cheer-box"
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="cheer-text-group">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <h4 className="text-sm font-extrabold text-slate-900">Celebrate Daniel &amp; Yerosen</h4>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      Send positive energy to the creators for their friendship &amp; dedication!
                    </p>
                  </div>

                  <button
                    type="button"
                    className="cheer-btn cursor-pointer"
                    onClick={handleCheer}
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Cheer ({friendshipCheers})</span>
                  </button>
                </motion.div>

                {/* Quality Promise */}
                <div className="Qualitypromiseclass">
                  <h3 className="h1ofqualitypromise">Our Quality Promise</h3>
                  <p>
                    Thank you for using DY Note. Daniel and Yerosen built this with precision and care, and we hope it brings accuracy and aesthetic delight to every second of your day.
                  </p>
                </div>

                {/* THE FOUNDERS' PERSONAL LETTER */}
                <motion.div 
                  className="founders-letter-card"
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <div className="letter-header">
                    <div className="letter-seal">
                      <Sparkles className="w-[30px] h-[15px] text-blue-600 shrink-0" />
                      <span>Founders&apos; Letter • Official Note</span>
                    </div>
                  </div>

                  <h3 className="letter-title" style={{ textAlign: 'center' }}>A Heartfelt Letter to Our Users</h3>

                  <div className="letter-body">
                    <p style={{ textAlign: 'center' }}>
                      <strong>To everyone who values clarity, beauty, and quiet focus:</strong>
                    </p>
                    <p>
                      When we first dreamed of <strong>DY Note</strong>, we weren&apos;t thinking about corporate metrics or ad revenue. We were simply two best friends sitting side-by-side in the quiet hours of the night, wondering why modern note apps had become so loud, bloated, and intrusive.
                    </p>
                    <p>
                      We made an unbreakable promise: to craft a sanctuary. An application that treats your deepest thoughts, spontaneous flashes of genius, and daily checklists with respect. No tracking, zero cloud leaks, and no compromises—just pure liquid glass, acoustic harmony, and instant responsiveness.
                    </p>
                    <p>
                      Every micro-interaction, every haptic sound tick, and every millimeter of glass curvature in this app was built by our own hands, fueled by endless cups of coffee, deep debates, and an unwavering bond of brotherhood. DY Note is not just software; it is the physical expression of our friendship and our obsession with true craftsmanship.
                    </p>
                    <p>
                      Thank you for welcoming our work into your daily life. Together, let&apos;s make every thought and second count.
                    </p>
                  </div>
                </motion.div>

                {/* Synergy Stats Ribbon */}
                <motion.div 
                  className="synergy-stats-ribbon"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                >
                  <div className="stat-chip">
                    <span className="stat-chip-number">1,200+</span>
                    <span className="stat-chip-label">Late-Night Hours</span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-number">500+</span>
                    <span className="stat-chip-label">Shared Coffees</span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-number">100%</span>
                    <span className="stat-chip-label">Offline &amp; Private</span>
                  </div>
                  <div className="stat-chip">
                    <span className="stat-chip-number">1</span>
                    <span className="stat-chip-label">Lifelong Brotherhood</span>
                  </div>
                </motion.div>

                {/* Footer Version Info */}
                <div className="about-footer">
                  <p className="pofaboutfooter">
                    DY Note <span>v1.7 </span>{' '}
                  </p>
                  <p>Crafted with brotherhood by Daniel Kidanu &amp; Yerosen Desalegn</p>
                  <p>&quot;Thank You For Being Part Of our Journey. Together, We Make Every Second Count.&quot;</p>
                  <p>
                    © 2026 DY Design Studio. All rights reserved. Precision engineered with teamwork, friendship, and liquid glass.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Apple Liquid Glass Undo Toast Notification */}
      <AnimatePresence>
        {deletedNoteInfo && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.88, filter: 'blur(12px)' }}
            animate={{ 
              opacity: 1, 
              y: [0, -4, 0], 
              scale: 1, 
              filter: 'blur(0px)' 
            }}
            exit={{ opacity: 0, y: 35, scale: 0.9, filter: 'blur(8px)' }}
            transition={{ 
              y: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
              opacity: { duration: 0.28, ease: 'easeOut' },
              scale: { type: 'spring', damping: 25, stiffness: 340 },
              filter: { duration: 0.25 }
            }}
            style={{ width: '280px', minWidth: '260px', maxWidth: '290px', paddingTop: '11px', paddingBottom: '11px', marginLeft: '3px', marginRight: '19px', marginTop: '7px', marginBottom: '7px' }}
            className={`fixed left-1/2 -translate-x-1/2 z-[60] flex items-center justify-between gap-6 sm:gap-8 px-7 sm:px-8 py-4 sm:py-5 rounded-full glass-toast shadow-2xl backdrop-blur-2xl border border-white/90 pointer-events-auto overflow-hidden ${
              isEditorOpen ? 'bottom-8' : 'bottom-24 sm:bottom-28'
            }`}
          >
            {/* Animated 5s Countdown Progress Line */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-1.5 left-7 right-7 h-[2.5px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-80"
            />

            <div className="flex items-center gap-3.5 min-w-0 py-0.5 pl-1" style={{ marginLeft: '23px' }}>
              <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
              <span className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight truncate">
                Note Deleted
              </span>
            </div>

            <motion.button
              type="button"
              style={{ marginRight: '14px' }}
              whileHover={{ 
                scale: 1.08, 
                filter: 'brightness(1.12)',
                boxShadow: '0 8px 24px -4px rgba(59, 130, 246, 0.35)'
              }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              onClick={handleUndoDelete}
              className="liquid-glass-capsule text-sm sm:text-base font-extrabold text-blue-600 hover:text-blue-700 gap-2.5 px-6 sm:px-7 py-3 h-11 sm:h-12 shrink-0 cursor-pointer shadow-lg transition-colors border border-blue-400/30"
              title="Undo Note Deletion"
            >
              <RotateCcw className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>Undo</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-component for individual glass note cards
interface NoteCardProps {
  key?: string;
  index?: number;
  note: Note;
  onEdit: (note: Note) => void;
  onTogglePin: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
}

function NoteCard({ index = 0, note, onEdit, onTogglePin, onDelete, formatDate }: NoteCardProps) {
  const noteAccentColor = note.accentColor || note.color || '#000000';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 25, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.88, y: -15, filter: 'blur(8px)' }}
      transition={{ type: 'spring', damping: 24, stiffness: 320, delay: Math.min(index * 0.04, 0.25) }}
      whileHover={{ y: -6, scale: 1.025, transition: { type: 'spring', damping: 20, stiffness: 350 } }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onEdit(note)}
      className="glass-card rounded-2xl sm:rounded-3xl w-full min-h-[142px] text-left relative overflow-hidden box-border cursor-pointer group transition-shadow duration-300 hover:shadow-2xl"
    >
      {/* Permanent Internal Safe Area Container */}
      <div className="note-card-safe-area">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2.5 w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {note.isPinned ? (
              <motion.span 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ paddingLeft: '11px', paddingRight: '11px', paddingTop: '4px', paddingBottom: '4px', marginLeft: '0px', backgroundColor: 'transparent', borderColor: 'transparent', border: 'none', background: 'transparent', boxShadow: 'none' }}
                className="text-[10px] font-bold uppercase tracking-wider text-blue-600 glass-pill rounded-full flex items-center gap-1 shrink-0 shadow-none bg-transparent border-none border-transparent"
              >
                <Pin className="w-3.5 h-3.5 fill-blue-500" />
                Pinned
              </motion.span>
            ) : (
              <div />
            )}
          </div>

          {/* Header Action Buttons (Pin & Delete) - Safe Inset */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity">
            <motion.button
              whileHover={{ scale: 1.22, rotate: 12 }}
              whileTap={{ scale: 0.85, rotate: -12 }}
              type="button"
              onClick={(e) => onTogglePin(note.id, e)}
              style={{
                backgroundColor: 'transparent',
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                boxShadow: 'none',
                border: 'none',
                borderColor: 'transparent',
              }}
              className={`liquid-glass-btn-sm cursor-pointer border-transparent hover:bg-transparent hover:border-transparent ${
                note.isPinned
                  ? 'text-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={note.isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-blue-500 text-blue-600' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.22, rotate: [-8, 8, -8, 0], transition: { duration: 0.3 } }}
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={(e) => onDelete(note.id, e)}
              style={{
                backgroundColor: 'transparent',
                background: 'transparent',
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                boxShadow: 'none',
                border: 'none',
                borderColor: 'transparent',
              }}
              className="liquid-glass-btn-sm text-slate-500 hover:text-rose-600 cursor-pointer border-transparent hover:bg-transparent hover:border-transparent"
              title="Delete Note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Card Content Body */}
        <div className="space-y-1 flex-1 w-full min-w-0 my-1 overflow-hidden flex flex-col items-center justify-center">
          <h2 
            className="text-sm sm:text-base font-bold transition-colors line-clamp-1 leading-snug break-words text-center px-1"
          >
            <RichTextRenderer
              html={note.title || 'Untitled Note'}
              defaultColor="#0f172a"
            />
          </h2>
          {note.content && (
            <p 
              className="text-xs sm:text-sm line-clamp-2 leading-relaxed break-words text-center px-1 opacity-80"
            >
              <RichTextRenderer
                html={note.content}
                defaultColor="#334155"
              />
            </p>
          )}
        </div>

        {/* Footer Timestamp */}
        <div className="pt-2 border-t border-white/40 flex items-center justify-between w-full min-w-0 text-[11px] font-medium text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 px-0.5" style={{ marginTop: '6px' }}>
            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500 stroke-[2.2]" />
            <span className="truncate font-semibold text-slate-600 tracking-tight">{formatDate(note.updatedAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
