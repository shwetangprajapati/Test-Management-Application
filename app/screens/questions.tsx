"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { type Resolver, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "../lib/api";
import { questionSchema, questionsSchema } from "../lib/schemas";
import type { ID, QuestionDto, QuestionFormValues, TestDto } from "../lib/types";
import {
  difficulties,
  friendlyError,
  isQuestionComplete,
  parseQuestionsCsv,
  questionFromDto,
  questionIds,
  subjectName,
  taxonomyNames,
  testTypeLabel,
} from "../lib/test-utils";
import { useTestFlowStore } from "../store/useTestFlowStore";
import { useToastStore } from "../store/useToastStore";
import { AppFrame } from "../components/app-frame";
import Modal from "../components/Modal";
import { ButtonLabel, ErrorMessage, LoadingState, TestSummaryCard } from "../components/ui";

const RichTextEditor = lazy(() => import("../components/RichTextEditor"));

function QuestionEditModal({
  question,
  questionIndex,
  topicNames,
  subTopicNames,
  difficulties,
  onSave,
  onClose,
}: {
  question: QuestionFormValues;
  questionIndex: number;
  topicNames: string[];
  subTopicNames: string[];
  difficulties: { value: string; label: string }[];
  onSave: (questionIndex: number, updatedQuestion: QuestionFormValues) => void;
  onClose: () => void;
}) {
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as unknown as Resolver<QuestionFormValues>,
    defaultValues: question,
  });
  const [saving, setSaving] = useState(false);
  const correctOption = useWatch({ control: form.control, name: "correctOption" });
  const questionText = useWatch({ control: form.control, name: "questionText" });
  const explanation = useWatch({ control: form.control, name: "explanation" });

  async function handleSave(values: QuestionFormValues) {
    setSaving(true);
    try {
      onSave(questionIndex, values);
      onClose();
    } catch (error) {
      console.error("Error saving question:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} size="large">
      <div className="pr-modal-header">
        <h2>Edit Question {questionIndex + 1}</h2>
      </div>
      <form onSubmit={form.handleSubmit(handleSave)} className="pr-edit-question-form">
        <div className="pr-field">
          <label>Question Text</label>
          <Suspense fallback={<textarea placeholder="Type question here" {...form.register("questionText")} />}>
            <RichTextEditor
              value={questionText ?? ""}
              onChange={(value) => form.setValue("questionText", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Type question here"
              height={200}
            />
          </Suspense>
          <ErrorMessage message={form.formState.errors.questionText?.message} />
        </div>

        <div className="pr-options">
          <strong>Options</strong>
          {([0, 1, 2, 3] as const).map((optionIndex) => (
            <label key={optionIndex}>
              <input
                type="radio"
                value={optionIndex}
                checked={correctOption === optionIndex}
                onChange={() => form.setValue("correctOption", optionIndex)}
              />
              <input
                placeholder={`Option ${optionIndex + 1}`}
                {...form.register(`options.${optionIndex}`)}
              />
            </label>
          ))}
        </div>

        <div className="pr-question-meta-grid">
          <label className="pr-field">
            <span>Difficulty (optional)</span>
            <select {...form.register("difficulty")}>
              <option value="">Use test difficulty</option>
              {difficulties.map((difficulty) => (
                <option key={difficulty.value} value={difficulty.value}>
                  {difficulty.label}
                </option>
              ))}
            </select>
          </label>
          <label className="pr-field">
            <span>Topic (optional)</span>
            <select {...form.register("topicId")}>
              <option value="">Select topic</option>
              {topicNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="pr-field">
            <span>Sub-topic (optional)</span>
            <select {...form.register("subTopicId")}>
              <option value="">Select sub-topic</option>
              {subTopicNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="pr-field">
            <span>Media URL (optional)</span>
            <input placeholder="https://..." {...form.register("mediaUrl")} />
          </label>
        </div>

        <div className="pr-field">
          <label>Explanation (optional)</label>
          <Suspense fallback={<textarea placeholder="Explanation (optional)" {...form.register("explanation")} />}>
            <RichTextEditor
              value={explanation ?? ""}
              onChange={(value) => form.setValue("explanation", value, { shouldDirty: true, shouldValidate: true })}
              placeholder="Explanation (optional)"
              height={150}
            />
          </Suspense>
        </div>

        <div className="pr-modal-actions">
          <button type="button" className="pr-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="pr-primary" disabled={saving}>
            <ButtonLabel loading={saving} label="Save Changes" loadingLabel="Saving..." />
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function QuestionsScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [test, setTest] = useState<TestDto>();
  const [loadingTest, setLoadingTest] = useState(true);
  const [serverError, setServerError] = useState("");
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const storeQuestions = useTestFlowStore((state) => state.unsavedQuestions[params.id]);
  const setUnsavedQuestions = useTestFlowStore((state) => state.setUnsavedQuestions);
  const emptyQuestion = (): QuestionFormValues => ({
    localId: crypto.randomUUID(),
    questionText: "",
    options: ["", "", "", ""],
    correctOption: 0,
    explanation: "",
    difficulty: "",
    topicId: "",
    subTopicId: "",
    mediaUrl: "",
  });
  const form = useForm<{ questions: QuestionFormValues[] }>({
    resolver: zodResolver(questionsSchema) as unknown as Resolver<{ questions: QuestionFormValues[] }>,
    defaultValues: {
      questions: storeQuestions ?? [emptyQuestion()],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "questions" });
  const watchedQuestions = useWatch({ control: form.control, name: "questions" });

  // Drive the per-question dropdowns off the test's own topic/sub-topic names.
  const topicNames = useMemo(() => taxonomyNames(test?.topics), [test]);
  const subTopicNames = useMemo(() => taxonomyNames(test?.sub_topics), [test]);
  const [activeIndex, setActiveIndex] = useState(0);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Jump to a question from the rail and scroll it into view.
  function focusQuestion(index: number) {
    setActiveIndex(index);
    document.getElementById(`pr-question-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addQuestion() {
    append(emptyQuestion());
    queueMicrotask(() => focusQuestion(fields.length));
  }

  function deleteAllEdits() {
    form.reset({ questions: [emptyQuestion()] });
    setActiveIndex(0);
  }

  async function handleCsvFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const parsed = parseQuestionsCsv(await file.text());
      if (!parsed.length) {
        toastError("Nothing to import", "Expected columns: question, option1-4, correct option (1-4), explanation.");
        return;
      }
      const current = form.getValues("questions").filter((question) => question.questionText.trim() || question.options.some((option) => option.trim()));
      form.setValue("questions", [...current, ...parsed], { shouldDirty: true, shouldValidate: true });
      toastSuccess("Questions imported", `Added ${parsed.length} question${parsed.length === 1 ? "" : "s"} from your file.`);
    } catch {
      toastError("Couldn't read that file", "Please make sure it's a valid CSV and try again.");
    }
  }

  useEffect(() => {
    api
      .test(params.id)
      .then((loaded) => {
        setTest(loaded);
        const ids = questionIds(loaded);
        if (ids.length && !storeQuestions?.length) {
          api.fetchQuestions(ids).then((items) => form.reset({ questions: items.map(questionFromDto) })).catch(() => undefined);
        }
      })
      .catch((error) => {
        const text = friendlyError(error, "We couldn't load this test. Please go back and try again.");
        setServerError(text);
        toastError("Couldn't load the test", text);
      })
      .finally(() => setLoadingTest(false));
  }, [form, params.id, storeQuestions?.length, toastError]);

  useEffect(() => {
    setUnsavedQuestions(params.id, (watchedQuestions ?? []) as QuestionFormValues[]);
  }, [params.id, setUnsavedQuestions, watchedQuestions]);

  function handleSaveEditedQuestion(questionIndex: number, updatedQuestion: QuestionFormValues) {
    const currentQuestions = form.getValues("questions");
    const updated = [...currentQuestions];
    updated[questionIndex] = { ...updatedQuestion, localId: currentQuestions[questionIndex].localId };
    form.setValue("questions", updated, { shouldDirty: true, shouldValidate: true });
    toastSuccess("Question updated", `Your changes to question ${questionIndex + 1} are saved.`);
  }

  const saveAndContinue = form.handleSubmit(
    async (values) => {
      setServerError("");
      // Each question needs the test's subject name. topic/sub_topic are left off: the
      // backend's lookup rejects every value and fails the whole insert.
      const subject = test ? subjectName(test) : "";
      const payload: QuestionDto[] = values.questions.map((question) => ({
        type: "mcq",
        question: question.questionText,
        option1: question.options[0],
        option2: question.options[1],
        option3: question.options[2],
        option4: question.options[3],
        correct_option: `option${Number(question.correctOption) + 1}`,
        explanation: question.explanation,
        difficulty: question.difficulty || test?.difficulty,
        subject,
        media_url: question.mediaUrl || undefined,
        test_id: params.id,
      }));
      try {
        const saved = await api.saveQuestions(params.id, payload);
        const savedIds = saved.map((question) => question._id ?? question.id).filter(Boolean) as ID[];
        await api.updateTest(params.id, {
          questions: savedIds,
          question_ids: savedIds,
          total_questions: savedIds.length,
          // keep configured total marks, else derive from the question count
          total_marks:
            Number(test?.total_marks) ||
            savedIds.length * Number(test?.correct_marks ?? test?.marking_scheme?.correct ?? 1),
        });
        toastSuccess("Questions saved", `${savedIds.length} question${savedIds.length === 1 ? "" : "s"} added to your test.`);
        router.push(`/tests/${params.id}/preview`);
      } catch (error) {
        const text = friendlyError(error, "We couldn't save your questions. Please try again.");
        setServerError(text);
        toastError("Couldn't save questions", text);
      }
    },
    () => toastError("Almost there", "Please complete at least one question with all four options."),
  );

  return (
    <AppFrame active="create">
      <section className="pr-editor">
        <div className="pr-editor-top">
          <p className="pr-crumbs-inline">
            Test Creation&nbsp;&nbsp;/&nbsp;&nbsp; Create Test&nbsp;&nbsp;/&nbsp;&nbsp; {testTypeLabel(test?.type)}
          </p>
          <button type="submit" form="pr-questions-form" className="pr-primary" disabled={form.formState.isSubmitting}>
            <ButtonLabel loading={form.formState.isSubmitting} label="Publish" loadingLabel="Saving..." />
          </button>
        </div>

        <div className="pr-editor-grid">
          <aside className="pr-question-rail">
            <div className="pr-rail-head">
              <strong>Question creation</strong>
            </div>
            <p className="pr-rail-total">Total Questions <span>{fields.length}</span></p>
            <ol className="pr-rail-list">
              {fields.map((field, index) => {
                const complete = isQuestionComplete(watchedQuestions?.[index]);
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      className={`pr-rail-item${complete ? " is-done" : ""}${activeIndex === index ? " is-active" : ""}`}
                      onClick={() => focusQuestion(index)}
                    >
                      <span className="pr-rail-check" aria-hidden="true" />
                      <span className="pr-rail-label">Question {index + 1}</span>
                      <span className="pr-rail-go" aria-hidden="true">›</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>

          <div className="pr-editor-main">
            {loadingTest ? <LoadingState label="Loading test details..." /> : <TestSummaryCard test={test} />}

            <div className="pr-editor-head">
              <strong>Question {Math.min(activeIndex + 1, fields.length)}<span>/{fields.length}</span></strong>
              <div className="pr-editor-tools">
                <button type="button" className="pr-tool-btn" onClick={addQuestion}>+ MCQ</button>
                <button type="button" className="pr-tool-btn" onClick={() => csvInputRef.current?.click()}>CSV</button>
                <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvFile} />
              </div>
            </div>
            <button type="button" className="pr-delete-all" onClick={deleteAllEdits}>
              <span aria-hidden="true">🗑</span> Delete All Edits
            </button>

            <form id="pr-questions-form" onSubmit={saveAndContinue}>
              <ErrorMessage message={form.formState.errors.questions?.message ?? serverError} />
              {fields.map((field, index) => (
                <section
                  key={field.id}
                  id={`pr-question-${index}`}
                  className={`pr-question-card${activeIndex === index ? " is-active" : ""}`}
                  onFocusCapture={() => setActiveIndex(index)}
                >
                  <div className="pr-question-card-head">
                    <h2>Question {index + 1}</h2>
                    <div className="pr-question-actions">
                      <button type="button" className="pr-edit" onClick={() => setEditingQuestionIndex(index)}>
                        Edit
                      </button>
                      <button type="button" className="pr-delete" onClick={() => remove(index)} disabled={fields.length === 1}>
                        Delete
                      </button>
                    </div>
                  </div>
                  <Suspense fallback={<textarea className="pr-solution" placeholder="Type question here" {...form.register(`questions.${index}.questionText`)} />}>
                    <RichTextEditor
                      value={watchedQuestions?.[index]?.questionText ?? ""}
                      onChange={(value) => form.setValue(`questions.${index}.questionText`, value, { shouldDirty: true, shouldValidate: true })}
                      placeholder="Type question here"
                      height={200}
                    />
                  </Suspense>
                  <ErrorMessage message={form.formState.errors.questions?.[index]?.questionText?.message} />
                  <div className="pr-options">
                    <strong>Type the options below</strong>
                    {([0, 1, 2, 3] as const).map((optionIndex) => (
                      <label key={optionIndex}>
                        <input type="radio" value={optionIndex} {...form.register(`questions.${index}.correctOption`)} />
                        <input placeholder={`Option ${optionIndex + 1}`} {...form.register(`questions.${index}.options.${optionIndex}`)} />
                      </label>
                    ))}
                  </div>
                  <div className="pr-solution-block">
                    <strong>Add Solution</strong>
                    <Suspense fallback={<textarea className="pr-solution" placeholder="Type here" {...form.register(`questions.${index}.explanation`)} />}>
                      <RichTextEditor
                        value={watchedQuestions?.[index]?.explanation ?? ""}
                        onChange={(value) => form.setValue(`questions.${index}.explanation`, value, { shouldDirty: true, shouldValidate: true })}
                        placeholder="Type here"
                        height={150}
                      />
                    </Suspense>
                  </div>
                  <div className="pr-question-settings">
                    <strong className="pr-settings-title">Question settings</strong>
                    <label className="pr-field">
                      <span>Level of Difficulty</span>
                      <select {...form.register(`questions.${index}.difficulty`)}>
                        <option value="">Select from Drop-down</option>
                        {difficulties.map((difficulty) => (
                          <option key={difficulty.value} value={difficulty.value}>{difficulty.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="pr-field">
                      <span>Topic</span>
                      <select {...form.register(`questions.${index}.topicId`)}>
                        <option value="">Select from Drop-down</option>
                        {topicNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="pr-field">
                      <span>Sub-topic</span>
                      <select {...form.register(`questions.${index}.subTopicId`)}>
                        <option value="">Select from Drop-down</option>
                        {subTopicNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="pr-field">
                      <span>Media URL (optional)</span>
                      <input placeholder="https://..." {...form.register(`questions.${index}.mediaUrl`)} />
                    </label>
                  </div>
                </section>
              ))}
              <div className="pr-editor-actions">
                <Link href="/dashboard" className="pr-danger">Exit Test Creation</Link>
                <button type="submit" className="pr-primary" disabled={form.formState.isSubmitting}>
                  <ButtonLabel loading={form.formState.isSubmitting} label="Next" loadingLabel="Saving..." />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
      {editingQuestionIndex !== null && (
        <QuestionEditModal
          question={watchedQuestions[editingQuestionIndex]}
          questionIndex={editingQuestionIndex}
          topicNames={topicNames}
          subTopicNames={subTopicNames}
          difficulties={difficulties}
          onSave={handleSaveEditedQuestion}
          onClose={() => setEditingQuestionIndex(null)}
        />
      )}
    </AppFrame>
  );
}
