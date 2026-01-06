"use client";

import { useState, useRef, useEffect } from "react";
import { HexColorPicker } from "react-colorful";

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
    label?: string;
}

export function ColorPicker({ color, onChange, label }: ColorPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative">
            {label && <label className="text-xs text-white/50 block mb-2">{label}</label>}

            <div className="flex items-center gap-3">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-10 h-10 rounded-lg border border-white/10 shadow-sm transition-transform active:scale-95"
                    style={{ backgroundColor: color }}
                    aria-label={label || "Pick a color"}
                />
                <span
                    className="text-xs font-mono text-white/70 bg-white/5 px-2 py-1 rounded cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {color.toUpperCase()}
                </span>
            </div>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className="absolute z-50 mt-2 p-3 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                >
                    <HexColorPicker color={color} onChange={onChange} />
                    <div className="mt-3 flex gap-2">
                        <input
                            type="text"
                            value={color.toUpperCase()}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white text-center font-mono focus:outline-none focus:border-white/30"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
