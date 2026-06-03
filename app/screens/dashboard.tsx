"use client";

import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, idOf, nameOf } from "../lib/api";
import { editTestSchema } from "../lib/schemas";
import type { Subject, TestDto, TestFormValues } from "../lib/types";
import {
  clearTestsCache,
  createdDate,
  difficulties,
  friendlyError,
  idFromTest,
  loadTestsCached,
  matchIdByName,
  normalizeStatus,
  setTestsCache,
  statusClass,
  statusLabel,
  subjectName,
  testDefaults,
  testName,
  testTypes,
  toPayload,
} from "../lib/test-utils";
import { useToastStore } from "../store/useToastStore";
import { AppFrame } from "../components/app-frame";
import Modal from "../components/Modal";
import { ButtonLabel, ErrorMessage, TableSkeleton } from "../components/ui";

export function DashboardScreen() {
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [tests, setTests] = useState<TestDto[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingTest, setEditingTest] = useState<TestDto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<TestDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadDashboardTests = useCallback((force = false) => {
    if (force) clearTestsCache();
    setLoading(true);
    setMessage("");
    loadTestsCached()
      .then((items) => setTests(Array.isArray(items) ? items : []))
      .catch((error) => {
        const text = friendlyError(error, "We couldn't load your tests. Please refresh to try again.");
        setMessage(text);
        toastError("Couldn't load your tests", text);
      })
      .finally(() => setLoading(false));
  }, [toastError]);

  useEffect(() => {
    queueMicrotask(() => loadDashboardTests());
  }, [loadDashboardTests]);

  // Build the status filter from the statuses actually present in the data.
  const statusOptions = useMemo(
    () => [...new Set(tests.map((test) => normalizeStatus(test.status)))].sort(),
    [tests],
  );

  const filtered = useMemo(() => tests.filter((test) => {
    const matchesQuery = `${testName(test)} ${subjectName(test)}`.toLowerCase().includes(deferredQuery.toLowerCase());
    const matchesStatus = status === "all" || normalizeStatus(test.status) === status;
    return matchesQuery && matchesStatus;
  }), [deferredQuery, status, tests]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(pageStart, pageStart + pageSize);

  async function confirmDelete() {
    if (!testToDelete) return;
    const id = idFromTest(testToDelete);
    setDeleting(true);
    setMessage("");
    try {
      await api.deleteTest(id);
      setTests((items) => {
        const next = items.filter((item) => idFromTest(item) !== id);
        setTestsCache(next);
        return next;
      });
      toastSuccess("Test deleted", `"${testName(testToDelete)}" has been removed.`);
      setTestToDelete(null);
    } catch (error) {
      const text = friendlyError(error, "We couldn't delete this test. Please try again.");
      setMessage(text);
      toastError("Couldn't delete the test", text);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppFrame active="dashboard">
      <section className="pr-dashboard">
        <div className="pr-page-head">
          <div>
            <p className="pr-crumbs-inline">Dashboard / Tests</p>
            <h1>Test Management</h1>
          </div>
          <Link href="/tests/new" className="pr-primary">
            Create New Test
          </Link>
        </div>
        <div className="pr-toolbar">
          <input placeholder="Search tests" value={query} onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }} />
          <select value={status} onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }} aria-label="Filter by status">
            <option value="all">All Status</option>
            {statusOptions.map((value) => (
              <option key={value} value={value}>{statusLabel(value)}</option>
            ))}
          </select>
          <select value={pageSize} onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }} aria-label="Rows per page">
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>
        {message ? (
          <div className="pr-error-row">
            <ErrorMessage message={message} />
            <button type="button" onClick={() => loadDashboardTests(true)}>
              Retry
            </button>
          </div>
        ) : null}
        {loading ? (
          <TableSkeleton />
        ) : (
          <div className="pr-table-wrap">
            <table className="pr-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((test) => {
                  const id = idFromTest(test);
                  return (
                    <tr key={id}>
                      <td>{testName(test)}</td>
                      <td>{subjectName(test)}</td>
                      <td>
                        <span className={`pr-pill pr-status ${statusClass(test.status)}`}>{statusLabel(test.status)}</span>
                      </td>
                      <td>{createdDate(test)}</td>
                      <td className="pr-row-actions">
                        <Link href={`/tests/${id}/preview`}>View</Link>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTest(test);
                            setIsEditModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="pr-row-delete" onClick={() => setTestToDelete(test)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="pr-table-empty">
                      {tests.length === 0
                        ? "No tests yet — create your first test to get started."
                        : "No tests match your search or filter."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 ? (
          <div className="pr-pagination">
            <span>
              Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} of {filtered.length} tests
            </span>
            <div>
              <button type="button" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))}>
                Previous
              </button>
              <strong>
                Page {currentPage} of {totalPages}
              </strong>
              <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))}>
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTest(null);
        }}
        title="Edit Test"
        size="large"
      >
        {editingTest && (
          <EditTestForm
            test={editingTest}
            onSave={(updatedTest) => {
              setTests((prevTests) => {
                const next = prevTests.map((t) => (idFromTest(t) === idFromTest(updatedTest) ? updatedTest : t));
                setTestsCache(next);
                return next;
              });
              setIsEditModalOpen(false);
              setEditingTest(null);
              toastSuccess("Changes saved", "Your test has been updated.");
            }}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingTest(null);
            }}
            toastError={toastError}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!testToDelete}
        onClose={() => !deleting && setTestToDelete(null)}
        title="Delete test"
        size="small"
      >
        {testToDelete && (
          <div className="pr-confirm-delete">
            <p>
              Are you sure you want to delete <strong>&ldquo;{testName(testToDelete)}&rdquo;</strong>? This action
              can&apos;t be undone.
            </p>
            <div className="pr-actions">
              <button type="button" className="pr-secondary" onClick={() => setTestToDelete(null)} disabled={deleting}>
                Cancel
              </button>
              <button type="button" className="pr-danger" onClick={confirmDelete} disabled={deleting}>
                <ButtonLabel loading={deleting} label="Delete" loadingLabel="Deleting..." />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppFrame>
  );
}

function EditTestForm({ test, onSave, onCancel, toastError }: {
  test: TestDto;
  onSave: (test: TestDto) => void;
  onCancel: () => void;
  toastError: (title: string, message?: string) => void;
}) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const form = useForm<TestFormValues>({
    resolver: zodResolver(editTestSchema) as unknown as Resolver<TestFormValues>,
    defaultValues: testDefaults(test),
  });
  const activeType = useWatch({ control: form.control, name: "type" });

  // Resolve the subject name to its id so the dropdown preselects and the update is valid.
  useEffect(() => {
    let cancelled = false;
    api.subjects()
      .then((subs) => {
        if (cancelled) return;
        setSubjects(subs);
        form.setValue("subjectId", matchIdByName(subs, subjectName(test)));
      })
      .catch(() => toastError("Couldn't load subjects", "Please close and reopen this dialog."));
    return () => {
      cancelled = true;
    };
  }, [form, test, toastError]);

  const handleSave = async (values: TestFormValues) => {
    setSaving(true);
    // This form doesn't edit topics, so drop them and keep the existing ones server-side.
    const payload = toPayload(values, test.status || "draft");
    delete payload.topics;
    delete payload.sub_topics;
    try {
      const updated = await api.updateTest(idFromTest(test), payload);
      onSave(updated);
    } catch (error) {
      toastError("Couldn't save changes", friendlyError(error, "Please check the details and try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pr-create-form-modal" onSubmit={form.handleSubmit(handleSave)}>
      <div className="pr-tabs" role="tablist">
        {testTypes.map((type) => (
          <label key={type.value} className={activeType === type.value ? "is-active" : ""}>
            <input type="radio" value={type.value} {...form.register("type")} />
            {type.label}
          </label>
        ))}
      </div>

      <div className="pr-field-grid">
        <label className="pr-field">
          <span>Test Name</span>
          <input {...form.register("name")} placeholder="Enter test name" />
          <ErrorMessage message={form.formState.errors.name?.message} />
        </label>

        <label className="pr-field">
          <span>Subject</span>
          <select {...form.register("subjectId")}>
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={idOf(subject)} value={idOf(subject)}>{nameOf(subject)}</option>
            ))}
          </select>
          <ErrorMessage message={form.formState.errors.subjectId?.message} />
        </label>

        <label className="pr-field">
          <span>Duration (Minutes)</span>
          <input type="number" {...form.register("totalTime")} min={1} />
          <ErrorMessage message={form.formState.errors.totalTime?.message} />
        </label>

        <fieldset className="pr-radio-field">
          <legend>Difficulty</legend>
          <div className="pr-radio-row">
            {difficulties.map((diff) => (
              <label key={diff.value}>
                <input type="radio" value={diff.value} {...form.register("difficulty")} />
                <span>{diff.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="pr-marking">
        <p>Marking Scheme:</p>
        <div className="pr-marking-grid">
          <label className="pr-field">
            <span>Wrong Answer</span>
            <input type="number" step="0.5" {...form.register("wrongMarks")} />
          </label>
          <label className="pr-field">
            <span>Unattempted</span>
            <input type="number" step="0.5" {...form.register("unattemptedMarks")} />
          </label>
          <label className="pr-field">
            <span>Correct Answer</span>
            <input type="number" step="0.5" {...form.register("correctMarks")} />
          </label>
          <label className="pr-field">
            <span>Total Questions</span>
            <input type="number" min={1} {...form.register("totalQuestions")} />
            <ErrorMessage message={form.formState.errors.totalQuestions?.message} />
          </label>
          <label className="pr-field">
            <span>Total Marks</span>
            <input type="number" min={1} {...form.register("totalMarks")} />
            <ErrorMessage message={form.formState.errors.totalMarks?.message} />
          </label>
        </div>
      </div>

      <div className="pr-actions">
        <button type="button" className="pr-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="pr-primary" disabled={saving}>
          <ButtonLabel loading={saving} label="Save" loadingLabel="Saving..." />
        </button>
      </div>
    </form>
  );
}
