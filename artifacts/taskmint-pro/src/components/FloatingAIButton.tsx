import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const POSITION_STORAGE_KEY = "taskmint-ai-button-position";
const BUTTON_SIZE = 56;
const SIDE_GAP = 16;
const BOTTOM_GAP = 96;

type Position = { x: number; y: number };
type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

function clampPosition(position: Position): Position {
  if (typeof window === "undefined") return position;
  return {
    x: Math.min(Math.max(0, position.x), Math.max(0, window.innerWidth - BUTTON_SIZE)),
    y: Math.min(Math.max(0, position.y), Math.max(0, window.innerHeight - BUTTON_SIZE)),
  };
}

function getDefaultPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return clampPosition({
    x: window.innerWidth - BUTTON_SIZE - SIDE_GAP,
    y: window.innerHeight - BUTTON_SIZE - BOTTOM_GAP,
  });
}

function readSavedPosition(): Position {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  try {
    const saved = JSON.parse(window.localStorage.getItem(POSITION_STORAGE_KEY) || "null");
    if (typeof saved?.x === "number" && typeof saved?.y === "number") {
      return clampPosition({ x: saved.x, y: saved.y });
    }
  } catch {
    // Ignore malformed local storage and use the default position.
  }
  return getDefaultPosition();
}

export function FloatingAIButton() {
  const [location, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [position, setPosition] = useState<Position | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);

  const hiddenPaths = ["/", "/login", "/signup", "/onboarding", "/ai"];
  const isHidden =
    !currentUser ||
    hiddenPaths.includes(location) ||
    location.startsWith("/exam-room/") ||
    location.startsWith("/ai");

  useEffect(() => {
    setPosition(readSavedPosition());

    const handleResize = () => {
      setPosition((current) => current ? clampPosition(current) : getDefaultPosition());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isHidden) return null;

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position?.x ?? getDefaultPosition().x,
      originY: position?.y ?? getDefaultPosition().y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      drag.moved = true;
      draggedRef.current = true;
    }
    if (!drag.moved) return;

    setPosition(clampPosition({
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    }));
  };

  const finishDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    if (drag.moved && position) {
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(position));
    }
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.08 }}
      whileTap={isDragging ? undefined : { scale: 0.93 }}
      onClick={() => {
        if (draggedRef.current) {
          draggedRef.current = false;
          return;
        }
        setLocation("/ai");
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      className={`fixed z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/40 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      data-testid="floating-ai-btn"
      aria-label="Move or open AI assistant"
      style={{
        ...(position ? { left: position.x, top: position.y } : { right: SIDE_GAP, bottom: BOTTOM_GAP }),
        boxShadow: "0 0 24px 4px rgba(139,92,246,0.35), 0 4px 24px rgba(0,0,0,0.4)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <div className="relative">
        <Bot className="w-6 h-6 text-white" />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-400"
        />
      </div>
    </motion.button>
  );
}
