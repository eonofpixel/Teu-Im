"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { LanguageCode } from "@teu-im/shared";

export const SUPPORTED_LANGUAGES: {
  code: LanguageCode;
  name: string;
  nativeName: string;
}[] = [
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
];

interface MultiLanguageSelectorProps {
  selected: LanguageCode[];
  onChange: (languages: LanguageCode[]) => void;
  excludeCodes?: LanguageCode[];
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function MultiLanguageSelector({
  selected,
  onChange,
  excludeCodes = [],
  label,
  placeholder = "언어를 선택하세요",
  required = false,
}: MultiLanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) => !excludeCodes.includes(lang.code)
  );

  const filteredLanguages = availableLanguages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (code: LanguageCode) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const remove = (code: LanguageCode, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((c) => c !== code));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    }
  };

  const getLangDisplay = (code: LanguageCode) => {
    const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    return lang ? lang.nativeName : code;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {label}
          {required && (
            <span className="text-indigo-400 ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Trigger / selected chips area */}
      <div
        role="combobox"
        aria-controls="language-listbox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={[
          "min-h-[42px] w-full rounded-lg border bg-gray-800 px-3 py-2 flex flex-wrap items-center gap-1.5 cursor-pointer transition-colors",
          isOpen
            ? "border-indigo-500 ring-1 ring-indigo-500"
            : "border-gray-700 hover:border-gray-600",
        ].join(" ")}
      >
        {selected.length === 0 && (
          <span className="text-sm text-gray-500">{placeholder}</span>
        )}

        {selected.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-900/40 border border-indigo-800/60 px-2 py-0.5 text-xs font-medium text-indigo-300"
          >
            <span>{getLangDisplay(code)}</span>
            <button
              type="button"
              onClick={(e) => remove(code, e)}
              className="text-indigo-400 hover:text-indigo-200 transition-colors leading-none"
              aria-label={`${getLangDisplay(code)} 제거`}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 3L9 9M9 3L3 9" />
              </svg>
            </button>
          </span>
        ))}

        {/* Caret icon */}
        <span className="ml-auto text-gray-500">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={[
              "transition-transform duration-200",
              isOpen ? "rotate-180" : "",
            ].join(" ")}
          >
            <path d="M3 5L7 9L11 5" />
          </svg>
        </span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div id="language-listbox" className="absolute z-30 mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-lg shadow-black/30 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="6" cy="6" r="4" />
                <path d="M9.5 9.5L12 12" />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="검색..."
                className="w-full rounded-md bg-gray-800 border border-gray-700 pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Language list */}
          <ul
            role="listbox"
            aria-multiselectable="true"
            className="max-h-48 overflow-y-auto py-1"
          >
            {filteredLanguages.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-500 text-center">
                검색 결과가 없습니다
              </li>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected = selected.includes(lang.code);
                return (
                  <li
                    key={lang.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => toggle(lang.code)}
                    className={[
                      "flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors text-sm",
                      isSelected
                        ? "bg-indigo-900/30 text-indigo-300"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white",
                    ].join(" ")}
                  >
                    {/* Checkbox */}
                    <span
                      className={[
                        "flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        isSelected
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-gray-600 bg-transparent",
                      ].join(" ")}
                    >
                      {isSelected && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 5L4.5 7.5L8 3" />
                        </svg>
                      )}
                    </span>

                    {/* Language info */}
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{lang.nativeName}</span>
                      <span className="text-xs text-gray-500 ml-1.5">
                        {lang.name}
                      </span>
                    </div>

                    {/* Language code badge */}
                    <span className="text-xs text-gray-600 font-mono">
                      {lang.code}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer summary */}
          {selected.length > 0 && (
            <div className="border-t border-gray-800 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {selected.length}개 선택됨
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                모두 해제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
