import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, CornerDownLeft } from 'lucide-react';
import './CommandPalette.css';

export interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut?: string;
  section: string;
  action: () => void;
  disabled?: boolean;
}

export interface PaletteComponentItem {
  id: string;
  label: string;
  file: string;
  kind: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  components?: PaletteComponentItem[];
  onSelectComponent?: (id: string) => void;
}

export default function CommandPalette({
  open,
  onClose,
  commands,
  components = [],
  onSelectComponent,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  const filteredComponents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return components
      .filter((c) => c.label.toLowerCase().includes(q) || c.file.toLowerCase().includes(q))
      .slice(0, 8);
  }, [components, query]);

  const allItems = useMemo(() => {
    const items: Array<
      { type: 'command'; item: Command } | { type: 'component'; item: PaletteComponentItem }
    > = [];
    filteredCommands.forEach((c) => items.push({ type: 'command', item: c }));
    filteredComponents.forEach((c) => items.push({ type: 'component', item: c }));
    return items;
  }, [filteredCommands, filteredComponents]);

  useEffect(() => {
    if (selectedIndex >= allItems.length) {
      setSelectedIndex(Math.max(0, allItems.length - 1));
    }
  }, [allItems.length, selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        if (current.type === 'command') {
          if (!current.item.disabled) {
            current.item.action();
            onClose();
          }
        } else if (current.type === 'component') {
          onSelectComponent?.(current.item.id);
          onClose();
        }
      }
    }
  };

  if (!open) return null;

  // Group commands by section for rendering
  const sections = Array.from(new Set(filteredCommands.map((c) => c.section)));

  return (
    <div
      className="wm-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="wm-palette-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        <div className="wm-palette-search">
          <Search size={18} className="wm-palette-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="wm-palette-input"
            placeholder="Type a command or search components..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            aria-autocomplete="list"
          />
          {query && (
            <button
              className="wm-bare-icon"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Clear query"
              type="button"
            >
              <X size={15} />
            </button>
          )}
          <span className="wm-palette-esc-hint">esc</span>
        </div>

        <div className="wm-palette-results" role="listbox">
          {allItems.length === 0 ? (
            <div className="wm-palette-empty">
              No commands or components matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {sections.map((section) => {
                const secCommands = filteredCommands.filter((c) => c.section === section);
                return (
                  <div key={section} className="wm-palette-group">
                    <div className="wm-palette-group-title">{section}</div>
                    {secCommands.map((cmd) => {
                      const itemIdx = allItems.findIndex(
                        (it) => it.type === 'command' && it.item.id === cmd.id,
                      );
                      const isSelected = itemIdx === selectedIndex;
                      const Icon = cmd.icon;
                      return (
                        <div
                          key={cmd.id}
                          className={`wm-palette-item ${isSelected ? 'is-selected' : ''} ${cmd.disabled ? 'is-disabled' : ''}`}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            if (!cmd.disabled) {
                              cmd.action();
                              onClose();
                            }
                          }}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                        >
                          <span className="wm-palette-item-icon">
                            <Icon size={16} />
                          </span>
                          <span className="wm-palette-item-label">{cmd.label}</span>
                          {cmd.shortcut && (
                            <span className="wm-palette-shortcut">{cmd.shortcut}</span>
                          )}
                          {isSelected && (
                            <CornerDownLeft size={13} className="wm-palette-enter-icon" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {filteredComponents.length > 0 && (
                <div className="wm-palette-group">
                  <div className="wm-palette-group-title">COMPONENTS</div>
                  {filteredComponents.map((comp) => {
                    const itemIdx = allItems.findIndex(
                      (it) => it.type === 'component' && it.item.id === comp.id,
                    );
                    const isSelected = itemIdx === selectedIndex;
                    return (
                      <div
                        key={comp.id}
                        className={`wm-palette-item ${isSelected ? 'is-selected' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onSelectComponent?.(comp.id);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(itemIdx)}
                      >
                        <span className="wm-palette-item-icon">
                          <span className="wm-palette-kind-tag">{comp.kind[0].toUpperCase()}</span>
                        </span>
                        <div className="wm-palette-comp-info">
                          <span className="wm-palette-item-label">{comp.label}</span>
                          {comp.file && <span className="wm-palette-comp-file">{comp.file}</span>}
                        </div>
                        {isSelected && (
                          <CornerDownLeft size={13} className="wm-palette-enter-icon" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="wm-palette-footer">
          <span>
            <kbd>&uarr;</kbd> <kbd>&darr;</kbd> Navigate
          </span>
          <span>
            <kbd>&crarr;</kbd> Select
          </span>
          <span>
            <kbd>esc</kbd> Dismiss
          </span>
        </div>
      </div>
    </div>
  );
}
