"use client";

import { X, GripVertical, ChevronUp, ChevronDown, Maximize2, Minimize2 } from "lucide-react";

interface WidgetWrapperProps {
  title: string;
  icon: React.ReactNode;
  editMode?: boolean;
  onRemove?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  wide?: boolean;
  onToggleSize?: () => void;
  children: React.ReactNode;
}

export default function WidgetWrapper({
  title,
  icon,
  editMode,
  onRemove,
  onMoveUp,
  onMoveDown,
  wide,
  onToggleSize,
  children,
}: WidgetWrapperProps) {
  return (
    <div
      className={`widget-card ${wide ? "widget-wide" : ""}`}
      style={{
        gridColumn: wide ? "span 2" : "span 1",
        padding: 16,
        borderRadius: 16,
        border: "1px solid var(--border)",
        background:
          "var(--widget-bg, rgba(255,255,255,0.8))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "box-shadow 0.2s ease, transform 0.15s ease",
      }}
    >
      {/* Widget Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {editMode && (
          <span style={{ color: "var(--text-muted)", cursor: "grab", display: "flex" }}>
            <GripVertical size={14} />
          </span>
        )}
        <span style={{ color: "#06b6d4" }}>{icon}</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary)",
            flex: 1,
          }}
        >
          {title}
        </span>
        {editMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {onToggleSize && (
              <button
                onClick={onToggleSize}
                style={{
                  background: "rgba(6,182,212,0.1)",
                  border: "none",
                  color: "#06b6d4",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  borderRadius: 4,
                }}
                title={wide ? "Réduire" : "Agrandir"}
              >
                {wide ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            )}
            {onMoveUp && (
              <button
                onClick={onMoveUp}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  borderRadius: 4,
                }}
                title="Move up"
              >
                <ChevronUp size={14} />
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={onMoveDown}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  borderRadius: 4,
                }}
                title="Move down"
              >
                <ChevronDown size={14} />
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                style={{
                  background: "rgba(244,63,94,0.1)",
                  border: "none",
                  color: "#f43f5e",
                  cursor: "pointer",
                  padding: 2,
                  display: "flex",
                  borderRadius: 4,
                }}
                title="Remove widget"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Widget Body */}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
