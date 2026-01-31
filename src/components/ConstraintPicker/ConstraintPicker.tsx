'use client';

import React, { useState } from 'react';
import styles from './ConstraintPicker.module.css';
import { Constraint, RegionColor } from '@/types';
import { REGION_THEMES } from '@/constants';

interface ConstraintPickerProps {
  position: { x: number; y: number };
  regionColor: RegionColor;
  currentConstraint: Constraint | null;
  onSelect: (constraint: Constraint | null) => void;
  onClose: () => void;
}

const PRESET_CONSTRAINTS: { label: string; constraint: Constraint }[] = [
  { label: '=', constraint: { type: 'symbol', value: 'equal' } },
  { label: '\u2260', constraint: { type: 'symbol', value: 'notEqual' } },
  { label: '<2', constraint: { type: 'text', value: '<2' } },
  { label: '<3', constraint: { type: 'text', value: '<3' } },
  { label: '>2', constraint: { type: 'text', value: '>2' } },
  { label: '>3', constraint: { type: 'text', value: '>3' } },
];

export default function ConstraintPicker({
  position,
  regionColor,
  currentConstraint,
  onSelect,
  onClose,
}: ConstraintPickerProps) {
  const [customValue, setCustomValue] = useState('');
  const theme = REGION_THEMES[regionColor];

  const handlePresetClick = (constraint: Constraint) => {
    onSelect(constraint);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customValue.trim()) {
      onSelect({ type: 'text', value: customValue.trim() });
      onClose();
    }
  };

  const handleRemove = () => {
    onSelect(null);
    onClose();
  };

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div
        className={styles.picker}
        style={{
          left: position.x,
          top: position.y,
          '--picker-accent': theme.fill,
        } as React.CSSProperties}
      >
        <div className={styles.header}>Set Constraint</div>

        <div className={styles.presets}>
          {PRESET_CONSTRAINTS.map(({ label, constraint }) => (
            <button
              key={label}
              className={styles.presetBtn}
              onClick={() => handlePresetClick(constraint)}
            >
              {label}
            </button>
          ))}
        </div>

        <form className={styles.customForm} onSubmit={handleCustomSubmit}>
          <input
            className={styles.customInput}
            type="text"
            placeholder="Custom (e.g. 5)"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            maxLength={4}
            autoFocus
          />
          <button className={styles.customSubmit} type="submit">
            Set
          </button>
        </form>

        {currentConstraint && (
          <button className={styles.removeBtn} onClick={handleRemove}>
            Remove
          </button>
        )}
      </div>
    </>
  );
}
