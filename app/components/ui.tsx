"use client";

import { useId, useState } from "react";
import type { ID, TestDto } from "../lib/types";
import {
  difficultyLabel,
  filterOptions,
  subjectName,
  type TaxonomyOption,
  taxonomyNames,
  testName,
  testTypeLabel,
} from "../lib/test-utils";

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="pr-error">{message}</p>;
}

export function LoadingState({ label }: { label: string }) {
  return <p className="pr-loading">{label}</p>;
}

export function ButtonLabel({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  if (!loading) return label;
  return (
    <>
      <span className="pr-button-spinner" aria-hidden="true" />
      {loadingLabel}
    </>
  );
}

export function TableSkeleton() {
  return (
    <div className="pr-skeleton-table" aria-label="Loading tests">
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} className="pr-skeleton-row" />
      ))}
    </div>
  );
}

export function SearchableSingleSelect({
  disabled = false,
  emptyLabel,
  loading = false,
  loadingLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  emptyLabel: string;
  loading?: boolean;
  loadingLabel: string;
  onChange: (value: ID) => void;
  options: TaxonomyOption[];
  placeholder: string;
  value: ID;
}) {
  const menuId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);
  const filtered = filterOptions(options, query);
  const inputValue = open ? query : selected?.label ?? query;

  return (
    <div className={disabled ? "pr-combobox is-disabled" : "pr-combobox"}>
      <div className="pr-combobox-input-row">
        <input
          aria-controls={menuId}
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          disabled={disabled}
          placeholder={loading ? loadingLabel : placeholder}
          role="combobox"
          value={inputValue}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onFocus={() => {
            setQuery(selected?.label ?? "");
            setOpen(true);
          }}
        />
        {value && !disabled ? (
          <button
            type="button"
            aria-label="Clear subject"
            className="pr-combobox-clear"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery("");
              onChange("");
            }}
          >
            x
          </button>
        ) : null}
      </div>
      {open && !disabled ? (
        <div id={menuId} className="pr-combobox-menu" role="listbox">
          {loading ? <p>{loadingLabel}</p> : null}
          {!loading && filtered.length === 0 ? <p>{emptyLabel}</p> : null}
          {!loading
            ? filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.id);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  );
}

export function SearchableMultiSelect({
  disabled = false,
  disabledLabel,
  emptyLabel,
  loading = false,
  loadingLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  disabledLabel: string;
  emptyLabel: string;
  loading?: boolean;
  loadingLabel: string;
  onChange: (value: ID[]) => void;
  options: TaxonomyOption[];
  placeholder: string;
  value: ID[];
}) {
  const menuId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = value
    .map((id) => options.find((option) => option.id === id))
    .filter(Boolean) as TaxonomyOption[];
  const selectedIds = new Set(value);
  const filtered = filterOptions(options, query).filter((option) => !selectedIds.has(option.id));

  return (
    <div className={disabled ? "pr-combobox pr-multi-combobox is-disabled" : "pr-combobox pr-multi-combobox"}>
      {selected.length ? (
        <div className="pr-chip-row" aria-label="Selected options">
          {selected.map((option) => (
            <span key={option.id} className="pr-chip">
              {option.label}
              <button type="button" aria-label={`Remove ${option.label}`} disabled={disabled} onClick={() => onChange(value.filter((id) => id !== option.id))}>
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="pr-combobox-input-wrapper">
        <input
          aria-controls={menuId}
          aria-autocomplete="list"
          aria-expanded={open && !disabled}
          disabled={disabled}
          placeholder={disabled ? disabledLabel : loading ? loadingLabel : placeholder}
          role="combobox"
          value={query}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {open && !disabled ? (
          <div id={menuId} className="pr-combobox-menu" role="listbox">
            {loading ? <p>{loadingLabel}</p> : null}
            {!loading && filtered.length === 0 ? <p>{emptyLabel}</p> : null}
            {!loading
              ? filtered.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={selectedIds.has(option.id)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange([...value, option.id]);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))
              : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TestSummaryCard({ test }: { test?: TestDto }) {
  const topics = taxonomyNames(test?.topics);
  const subTopics = taxonomyNames(test?.sub_topics);
  return (
    <section className="pr-summary-card">
      <span className="pr-edit-pencil" aria-hidden="true">✎</span>
      <div className="pr-summary-tags">
        <span className="pr-pill pr-pill-dark">{testTypeLabel(test?.type)}</span>
      </div>
      <div className="pr-summary-title">
        <span className="pr-chapter-icon" aria-hidden="true" />
        <strong>{test ? testName(test) : "Loading..."}</strong>
        <span className="pr-pill pr-pill-green">{difficultyLabel(test?.difficulty)}</span>
      </div>
      <dl className="pr-summary-details">
        <dt>Subject</dt>
        <dd>{test ? subjectName(test) : "-"}</dd>
        <dt>Topic</dt>
        <dd>{topics.length ? topics.map((name) => <span key={name} className="pr-tag">{name}</span>) : "-"}</dd>
        <dt>Sub Topic</dt>
        <dd>{subTopics.length ? subTopics.map((name) => <span key={name} className="pr-tag">{name}</span>) : "-"}</dd>
      </dl>
      <div className="pr-summary-metrics">
        <span>{test?.total_time ?? test?.duration ?? 0} Min</span>
        <span>{test?.total_questions ?? 0} Q&apos;s</span>
        <span>{test?.total_marks ?? 0} Marks</span>
      </div>
    </section>
  );
}
