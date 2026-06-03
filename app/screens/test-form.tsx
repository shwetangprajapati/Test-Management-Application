"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, idOf } from "../lib/api";
import { testFormSchema } from "../lib/schemas";
import type { Subject, SubTopic, TestFormValues, Topic } from "../lib/types";
import {
  clearTestsCache,
  difficulties,
  friendlyError,
  idFromTest,
  resolveTestTaxonomy,
  testDefaults,
  testTypeLabel,
  testTypes,
  toOptions,
  toPayload,
} from "../lib/test-utils";
import { useToastStore } from "../store/useToastStore";
import { AppFrame } from "../components/app-frame";
import { ButtonLabel, ErrorMessage, LoadingState, SearchableMultiSelect, SearchableSingleSelect } from "../components/ui";

export function TestFormScreen({ mode }: { mode: "new" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subTopics, setSubTopics] = useState<SubTopic[]>([]);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [subTopicsLoading, setSubTopicsLoading] = useState(false);
  const previousSubjectId = useRef<string | undefined>(undefined);
  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema) as unknown as Resolver<TestFormValues>,
    defaultValues: testDefaults(),
  });
  const subjectId = useWatch({ control: form.control, name: "subjectId" });
  const topicIds = useWatch({ control: form.control, name: "topicIds" });
  const subTopicIds = useWatch({ control: form.control, name: "subTopicIds" });
  const activeType = useWatch({ control: form.control, name: "type" });
  const subjectOptions = useMemo(() => toOptions(subjects), [subjects]);
  const topicOptions = useMemo(() => toOptions(topics), [topics]);
  const subTopicOptions = useMemo(() => toOptions(subTopics), [subTopics]);

  useEffect(() => {
    api
      .subjects()
      .then(setSubjects)
      .catch((error) => {
        const text = friendlyError(error, "We couldn't load the subject list. Please refresh and try again.");
        setServerError(text);
        toastError("Couldn't load subjects", text);
      })
      .finally(() => setSubjectsLoading(false));
  }, [toastError]);

  useEffect(() => {
    if (mode !== "edit" || !params.id) return;
    const testId = params.id;
    let cancelled = false;
    (async () => {
      try {
        // Reads return names; resolve to ids so the dropdowns preselect and the update is valid.
        const [loaded, subs] = await Promise.all([api.test(testId), api.subjects()]);
        if (cancelled) return;
        setSubjects(subs);
        const resolved = await resolveTestTaxonomy(loaded, subs);
        if (cancelled) return;
        setTopics(resolved.topics);
        setSubTopics(resolved.subTopics);
        // Seed the ref first so the subject-change effect doesn't wipe the resolved topics.
        previousSubjectId.current = resolved.subjectId;
        form.reset({
          ...testDefaults(loaded),
          subjectId: resolved.subjectId,
          topicIds: resolved.topicIds,
          subTopicIds: resolved.subTopicIds,
        });
      } catch (error) {
        if (cancelled) return;
        const text = friendlyError(error, "We couldn't load this test. Please go back and try again.");
        setServerError(text);
        toastError("Couldn't load the test", text);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form, mode, params.id, toastError]);

  useEffect(() => {
    const previous = previousSubjectId.current;
    previousSubjectId.current = subjectId;

    if (previous !== undefined && previous !== subjectId && !(mode === "edit" && loading)) {
      form.setValue("topicIds", [], { shouldDirty: true, shouldValidate: true });
      form.setValue("subTopicIds", [], { shouldDirty: true, shouldValidate: true });
    }

    if (!subjectId) {
      queueMicrotask(() => {
        setTopics([]);
        setSubTopics([]);
        setTopicsLoading(false);
      });
      return;
    }

    let active = true;
    queueMicrotask(() => setTopicsLoading(true));
    api
      .topicsBySubject(subjectId)
      .then((items) => {
        if (!active) return;
        setTopics(items);
        const validTopicIds = new Set(items.map(idOf));
        const nextTopicIds = (form.getValues("topicIds") ?? []).filter((id) => validTopicIds.has(id));
        if (nextTopicIds.length !== (form.getValues("topicIds") ?? []).length) {
          form.setValue("topicIds", nextTopicIds, { shouldDirty: true, shouldValidate: true });
        }
      })
      .catch((error) => {
        if (!active) return;
        setTopics([]);
        toastError("Couldn't load topics", friendlyError(error, "Please pick the subject again."));
      })
      .finally(() => {
        if (active) setTopicsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form, loading, mode, subjectId, toastError]);

  useEffect(() => {
    if (!topicIds?.length) {
      queueMicrotask(() => {
        form.setValue("subTopicIds", [], { shouldDirty: true, shouldValidate: true });
        setSubTopics([]);
        setSubTopicsLoading(false);
      });
      return;
    }
    let active = true;
    queueMicrotask(() => setSubTopicsLoading(true));
    api
      .subTopicsByTopics(topicIds)
      .then((items) => {
        if (!active) return;
        setSubTopics(items);
        const validSubTopicIds = new Set(items.map(idOf));
        const nextSubTopicIds = (form.getValues("subTopicIds") ?? []).filter((id) => validSubTopicIds.has(id));
        if (nextSubTopicIds.length !== (form.getValues("subTopicIds") ?? []).length) {
          form.setValue("subTopicIds", nextSubTopicIds, { shouldDirty: true, shouldValidate: true });
        }
      })
      .catch((error) => {
        if (!active) return;
        setSubTopics([]);
        toastError("Couldn't load sub-topics", friendlyError(error, "Please pick the topics again."));
      })
      .finally(() => {
        if (active) setSubTopicsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [form, topicIds, toastError]);

  async function save(values: TestFormValues, status: "draft" | "next") {
    setServerError("");
    const payload = toPayload(values, "draft");
    try {
      const saved = mode === "edit" && params.id ? await api.updateTest(params.id, payload) : await api.createTest(payload);
      const id = idFromTest(saved) || params.id;
      if (!id) throw new Error("Saved test did not return an id.");
      // New/edited test must show on next dashboard visit; drop the stale list cache.
      clearTestsCache();
      toastSuccess(
        status === "next" ? "Test details saved" : "Draft saved",
        status === "next" ? "Let's add some questions." : "You'll find it on your dashboard.",
      );
      router.push(status === "next" ? `/tests/${id}/questions` : "/dashboard");
    } catch (error) {
      const text = friendlyError(error, "We couldn't save your test. Please check the details and try again.");
      setServerError(text);
      toastError("Couldn't save the test", text);
    }
  }

  if (loading) return <AppFrame active="create"><LoadingState label="Loading test..." /></AppFrame>;

  return (
    <AppFrame active="create">
      <section className="pr-content">
        <div className="pr-page-head pr-create-head">
          <p className="pr-crumbs-inline">
            Test Creation&nbsp;&nbsp;/&nbsp;&nbsp; {mode === "edit" ? "Edit Test" : "Create Test"}&nbsp;&nbsp;/&nbsp;&nbsp; {testTypeLabel(activeType)}
          </p>
        </div>
        <form
          className="pr-create-form"
          onSubmit={form.handleSubmit(
            (values) => save(values, "next"),
            () => toastError("A few details are missing", "Please fix the highlighted fields to continue."),
          )}
        >
          <div className="pr-tabs" role="tablist" aria-label="Test type">
            {testTypes.map((type) => (
              <label key={type.value} className={activeType === type.value ? "is-active" : ""}>
                <input type="radio" value={type.value} {...form.register("type")} />
                {type.label}
              </label>
            ))}
          </div>
          <div className="pr-field-grid">
            <label className="pr-field">
              <span>Subject</span>
              <SearchableSingleSelect
                emptyLabel="No subjects found"
                loading={subjectsLoading}
                loadingLabel="Loading subjects..."
                options={subjectOptions}
                placeholder="Choose from Drop-down"
                value={subjectId ?? ""}
                onChange={(value) => form.setValue("subjectId", value, { shouldDirty: true, shouldValidate: true })}
              />
              <ErrorMessage message={form.formState.errors.subjectId?.message} />
            </label>
            <label className="pr-field">
              <span>Name of Test</span>
              <input placeholder="Enter name of Test" {...form.register("name")} />
              <ErrorMessage message={form.formState.errors.name?.message} />
            </label>
            <label className="pr-field">
              <span>Topic</span>
              <SearchableMultiSelect
                disabled={!subjectId}
                disabledLabel="Choose from Drop-down"
                emptyLabel="No topics found"
                loading={topicsLoading}
                loadingLabel="Loading topics..."
                options={topicOptions}
                placeholder="Choose from Drop-down"
                value={topicIds ?? []}
                onChange={(value) => form.setValue("topicIds", value, { shouldDirty: true, shouldValidate: true })}
              />
              <ErrorMessage message={form.formState.errors.topicIds?.message} />
            </label>
            <label className="pr-field">
              <span>Sub Topic</span>
              <SearchableMultiSelect
                disabled={!topicIds?.length}
                disabledLabel="Choose from Drop-down"
                emptyLabel="No sub-topics found"
                loading={subTopicsLoading}
                loadingLabel="Loading sub-topics..."
                options={subTopicOptions}
                placeholder="Choose from Drop-down"
                value={subTopicIds ?? []}
                onChange={(value) => form.setValue("subTopicIds", value, { shouldDirty: true, shouldValidate: true })}
              />
            </label>
            <label className="pr-field">
              <span>Duration (Minutes)</span>
              <input type="number" min={1} placeholder="Enter the time" {...form.register("totalTime")} />
              <ErrorMessage message={form.formState.errors.totalTime?.message} />
            </label>
            <fieldset className="pr-radio-field">
              <legend>Test Difficulty Level</legend>
              <div className="pr-radio-row">
                {difficulties.map((difficulty) => (
                  <label key={difficulty.value}>
                    <input type="radio" value={difficulty.value} {...form.register("difficulty")} />
                    <span>{difficulty.label}</span>
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
                <span>No of Questions</span>
                <input type="number" min={1} placeholder="Ex:250 Marks" {...form.register("totalQuestions")} />
                <ErrorMessage message={form.formState.errors.totalQuestions?.message} />
              </label>
              <label className="pr-field">
                <span>Total Marks</span>
                <input type="number" min={1} placeholder="Ex:250 Marks" {...form.register("totalMarks")} />
                <ErrorMessage message={form.formState.errors.totalMarks?.message} />
              </label>
            </div>
          </div>
          <ErrorMessage message={serverError} />
          <div className="pr-actions">
            <Link href="/dashboard" className="pr-secondary">
              Cancel
            </Link>
            <button
              type="button"
              className="pr-secondary"
              disabled={form.formState.isSubmitting}
              onClick={form.handleSubmit(
                (values) => save(values, "draft"),
                () => toastError("A few details are missing", "Please fix the highlighted fields before saving."),
              )}
            >
              <ButtonLabel loading={form.formState.isSubmitting} label="Save as Draft" loadingLabel="Saving..." />
            </button>
            <button type="submit" className="pr-primary" disabled={form.formState.isSubmitting}>
              <ButtonLabel loading={form.formState.isSubmitting} label={mode === "edit" ? "Save" : "Next"} loadingLabel="Saving..." />
            </button>
          </div>
        </form>
      </section>
    </AppFrame>
  );
}
