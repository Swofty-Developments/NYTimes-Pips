'use client';

import React from 'react';
import styles from './EditToolbar.module.css';
import { RegionColor, EditorTool } from '@/types';
import { REGION_THEMES } from '@/constants';

const REGION_COLORS: RegionColor[] = ['orange', 'blue', 'pink', 'teal', 'purple', 'green'];

interface EditToolbarProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  selectedColor: RegionColor;
  onColorChange: (color: RegionColor) => void;
}

export default function EditToolbar({
  isEditing,
  onToggleEdit,
  activeTool,
  onToolChange,
  selectedColor,
  onColorChange,
}: EditToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.editButton} ${isEditing ? styles.active : ''}`}
        onClick={onToggleEdit}
      >
        {isEditing ? 'Done' : 'Edit'}
      </button>

      {isEditing && (
        <div className={styles.tools}>
          <div className={styles.toolGroup}>
            <span className={styles.toolGroupLabel}>Tool</span>
            <div className={styles.toolButtons}>
              <button
                className={`${styles.toolBtn} ${activeTool === 'foundation' ? styles.active : ''}`}
                onClick={() => onToolChange('foundation')}
                title="Toggle foundation cells"
              >
                Foundation
              </button>
              <button
                className={`${styles.toolBtn} ${activeTool === 'paint' ? styles.active : ''}`}
                onClick={() => onToolChange('paint')}
                title="Paint region color"
              >
                Paint
              </button>
              <button
                className={`${styles.toolBtn} ${activeTool === 'constraint' ? styles.active : ''}`}
                onClick={() => onToolChange('constraint')}
                title="Set constraint on cell"
              >
                Constraint
              </button>
              <button
                className={`${styles.toolBtn} ${activeTool === 'erase' ? styles.active : ''}`}
                onClick={() => onToolChange('erase')}
                title="Erase cell"
              >
                Erase
              </button>
            </div>
          </div>

          {activeTool === 'paint' && (
            <div className={styles.toolGroup}>
              <span className={styles.toolGroupLabel}>Color</span>
              <div className={styles.colorPicker}>
                {REGION_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`${styles.colorSwatch} ${selectedColor === color ? styles.selected : ''}`}
                    style={{ backgroundColor: REGION_THEMES[color].fill }}
                    onClick={() => onColorChange(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
