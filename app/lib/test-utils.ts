import { api, idOf, nameOf } from "./api";
import type {
  ID,
  QuestionDto,
  QuestionFormValues,
  Subject,
  SubTopic,
  TestDto,
  TestFormValues,
  TestPayload,
  Topic,
} from "./types";

// Keep short, readable API messages; hide low-level/db errors behind the fallback.
export function friendlyError(error: unknown, fallback: string): string {
  const raw = (error instanceof Error ? error.message : typeof error === "string" ? error : "").trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  const technical = [
    "uuid",
    "syntax",
    "validation failed",
    "internal server",
    "failed to fetch",
    "networkerror",
    "unexpected token",
    "cannot read",
    "econnrefused",
    "timeout",
  ];
  if (technical.some((needle) => lower.includes(needle)) || raw.length > 120) {
    return fallback;
  }
  return raw;
}

export const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "difficult", label: "Difficult" },
];

export const testTypes = [
  { value: "chapter_wise", apiValue: "chapterwise", label: "Chapter Wise" },
  { value: "practice_test", apiValue: "practice", label: "PYQ" },
  { value: "mock_test", apiValue: "mock", label: "Mock Test" },
];

// Cached at module scope so the dashboard list survives client navigation.
let testsCache: TestDto[] | null = null;
let testsRequest: Promise<TestDto[]> | null = null;

export function loadTestsCached() {
  if (testsCache) return Promise.resolve(testsCache);
  if (!testsRequest) {
    testsRequest = api
      .tests()
      .then((items) => {
        testsCache = Array.isArray(items) ? items : [];
        return testsCache;
      })
      .catch((error) => {
        testsRequest = null;
        throw error;
      });
  }
  return testsRequest;
}

export function clearTestsCache() {
  testsCache = null;
  testsRequest = null;
}

// Keep the cache in sync after a delete/edit.
export function setTestsCache(next: TestDto[]) {
  testsCache = next;
}

export type TaxonomyOption = {
  id: ID;
  label: string;
};

export function toOptions<T extends Subject | Topic | SubTopic>(items: T[]): TaxonomyOption[] {
  return items.map((item) => ({ id: idOf(item), label: nameOf(item) })).filter((item) => item.id);
}

export function filterOptions(options: TaxonomyOption[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return options;
  return options.filter((option) => option.label.toLowerCase().includes(normalized));
}

export function idFromTest(test: TestDto) {
  return test._id ?? test.id ?? "";
}

export function testName(test: TestDto) {
  return test.name ?? test.test_name ?? "Untitled Test";
}

export function subjectName(test: TestDto) {
  return typeof test.subject === "object" ? nameOf(test.subject) : test.subject ?? test.subject_id ?? "Unassigned";
}

export function createdDate(test: TestDto) {
  const value = test.createdAt ?? test.created_at ?? test.updatedAt;
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value));
}

export function normalizeStatus(status?: string | null) {
  return (status ?? "draft").trim().toLowerCase() || "draft";
}

export function statusLabel(status?: string | null) {
  const value = normalizeStatus(status);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function statusClass(status?: string | null) {
  switch (normalizeStatus(status)) {
    case "live":
    case "success":
      return "pr-status-live";
    case "scheduled":
      return "pr-status-scheduled";
    case "expired":
      return "pr-status-expired";
    case "unpublished":
      return "pr-status-muted";
    default:
      return "pr-status-draft";
  }
}

export function normalizeDifficulty(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export function difficultyLabel(value?: string) {
  const normalized = normalizeDifficulty(value);
  return difficulties.find((difficulty) => difficulty.value === normalized)?.label ?? value ?? "Easy";
}

export function normalizeTestType(value?: string) {
  const normalized = value?.trim().toLowerCase().replaceAll("-", "_") ?? "";
  if (normalized === "chapter_wise" || normalized === "chapterwise") return "chapter_wise";
  if (normalized === "practice_test" || normalized === "practice" || normalized === "pyq") return "practice_test";
  if (normalized === "mock_test" || normalized === "mock") return "mock_test";
  return normalized;
}

export function testTypeLabel(value?: string) {
  const normalized = normalizeTestType(value);
  return testTypes.find((type) => type.value === normalized)?.label ?? value ?? "Chapter Wise";
}

export function testTypeApiValue(value?: string) {
  const normalized = normalizeTestType(value);
  return testTypes.find((type) => type.value === normalized)?.apiValue ?? normalized;
}

export function toPayload(values: TestFormValues, status: string): TestPayload {
  return {
    name: values.name,
    type: testTypeApiValue(values.type),
    subject: values.subjectId,
    // Update endpoint rejects empty arrays, so only send taxonomy when present.
    ...(values.topicIds.length ? { topics: values.topicIds } : {}),
    ...(values.subTopicIds.length ? { sub_topics: values.subTopicIds } : {}),
    correct_marks: Number(values.correctMarks),
    wrong_marks: Number(values.wrongMarks),
    unattempt_marks: Number(values.unattemptedMarks),
    difficulty: normalizeDifficulty(values.difficulty),
    total_time: Number(values.totalTime),
    total_marks: Number(values.totalMarks),
    total_questions: Number(values.totalQuestions),
    marking_scheme: {
      correct: Number(values.correctMarks),
      wrong: Number(values.wrongMarks),
      unattempted: Number(values.unattemptedMarks),
    },
    status,
  };
}

export function testDefaults(test?: TestDto): TestFormValues {
  return {
    name: test ? testName(test) : "",
    type: normalizeTestType(test?.type) || "chapter_wise",
    subjectId: test?.subject_id ?? test?.subjectId ?? (typeof test?.subject === "object" ? idOf(test.subject) : typeof test?.subject === "string" ? test.subject : ""),
    topicIds: test?.topic_ids ?? test?.topicIds ?? test?.topics?.map((topic) => (typeof topic === "string" ? topic : idOf(topic))) ?? [],
    subTopicIds: test?.sub_topic_ids ?? test?.subTopicIds ?? test?.sub_topics?.map((subTopic) => (typeof subTopic === "string" ? subTopic : idOf(subTopic))) ?? [],
    difficulty: normalizeDifficulty(test?.difficulty) || "easy",
    totalTime: test ? test.total_time ?? test.duration ?? 60 : ("" as unknown as number),
    correctMarks: test?.correct_marks ?? test?.marking_scheme?.correct ?? test?.marking_scheme?.correct_answer ?? 5,
    wrongMarks: test?.wrong_marks ?? test?.marking_scheme?.wrong ?? test?.marking_scheme?.wrong_answer ?? -1,
    unattemptedMarks: test?.unattempt_marks ?? test?.marking_scheme?.unattempted ?? 0,
    totalQuestions: test ? test.total_questions ?? 1 : ("" as unknown as number),
    totalMarks: test ? test.total_marks ?? 5 : ("" as unknown as number),
  };
}

// Reads return topics/sub-topics as names; normalize to a clean string[].
export function taxonomyNames(items?: Array<Topic | SubTopic | string>): string[] {
  return (items ?? [])
    .map((item) => (typeof item === "string" ? item : nameOf(item)))
    .filter((name): name is string => Boolean(name) && name !== "Untitled");
}

export function matchIdByName(items: Array<Subject | Topic | SubTopic>, name?: string): ID {
  if (!name) return "";
  const target = name.trim().toLowerCase();
  const match = items.find((item) => nameOf(item).trim().toLowerCase() === target);
  return match ? idOf(match) : "";
}

export function matchIdsByNames(items: Array<Topic | SubTopic>, names: string[]): ID[] {
  return names.map((name) => matchIdByName(items, name)).filter(Boolean);
}

// Resolve a fetched test's name-based taxonomy back to ids, loading the option lists too.
export async function resolveTestTaxonomy(test: TestDto, subjects: Subject[]) {
  const subjectId = matchIdByName(subjects, subjectName(test));
  const topics = subjectId ? await api.topicsBySubject(subjectId) : [];
  const topicIds = matchIdsByNames(topics, taxonomyNames(test.topics));
  const subTopics = topicIds.length ? await api.subTopicsByTopics(topicIds) : [];
  const subTopicIds = matchIdsByNames(subTopics, taxonomyNames(test.sub_topics));
  return { subjectId, topicIds, subTopicIds, topics, subTopics };
}

export function questionFromDto(question: QuestionDto): QuestionFormValues {
  const options = (question.options ?? []).map((option) => (typeof option === "string" ? option : option.text));
  const correct = String(question.correct_option ?? question.correctOption ?? question.answer ?? "option1");
  const correctOption = correct.startsWith("option") ? Number(correct.replace("option", "")) - 1 : Number(correct);
  return {
    localId: question._id ?? question.id ?? crypto.randomUUID(),
    questionText: question.question_text ?? question.question ?? question.text ?? "",
    options: [
      question.option1 ?? options[0] ?? "",
      question.option2 ?? options[1] ?? "",
      question.option3 ?? options[2] ?? "",
      question.option4 ?? options[3] ?? "",
    ],
    correctOption: Number.isFinite(correctOption) ? correctOption : 0,
    explanation: question.explanation ?? question.solution ?? "",
    difficulty: normalizeDifficulty(question.difficulty),
    topicId: question.topic ?? question.topic_id ?? "",
    subTopicId: question.sub_topic ?? question.sub_topic_id ?? "",
    mediaUrl: question.media_url ?? "",
  };
}

// Complete = has text and all four options filled in.
export function isQuestionComplete(question?: QuestionFormValues): boolean {
  if (!question) return false;
  const hasText = Boolean(question.questionText?.replace(/<[^>]*>/g, "").trim());
  const hasOptions = question.options?.every((option) => option.trim().length > 0);
  return hasText && hasOptions;
}

// Split a CSV row, handling quoted fields so question text can contain commas.
function splitCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i];
    if (inQuotes) {
      if (char === '"') {
        if (row[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else if (char === '"') {
      inQuotes = true;
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((value) => value.trim());
}

// Columns: question, option1, option2, option3, option4, correctOption(1-4), explanation?
export function parseQuestionsCsv(text: string): QuestionFormValues[] {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  const questions: QuestionFormValues[] = [];
  for (const row of rows) {
    const cols = splitCsvRow(row);
    if (cols.length < 6) continue;
    const [question, option1, option2, option3, option4, correct, explanation = ""] = cols;
    if (/^question$/i.test(question)) continue; // header
    const correctOption = Math.min(3, Math.max(0, (Number(correct) || 1) - 1));
    questions.push({
      localId: crypto.randomUUID(),
      questionText: question,
      options: [option1, option2, option3, option4],
      correctOption,
      explanation,
      difficulty: "",
      topicId: "",
      subTopicId: "",
      mediaUrl: "",
    });
  }
  return questions;
}

export function questionIds(test?: TestDto) {
  const values = test?.question_ids ?? test?.questions ?? [];
  return values.map((item) => (typeof item === "string" ? item : idOf(item))).filter(Boolean);
}

// Load a test and its questions (skips the fetch when it has none).
export async function loadTestWithQuestions(testId: ID): Promise<{ test: TestDto; questions: QuestionDto[] }> {
  const test = await api.test(testId);
  const ids = questionIds(test);
  const questions = ids.length ? await api.fetchQuestions(ids) : [];
  return { test, questions };
}

// "Live Until" choice to an ISO expiry date (null means always available).
export function expiryFromDuration(duration: string, from: Date, customEnd?: string | null): string | null {
  if (duration === "always") return null;
  if (duration === "custom") return customEnd ?? null;
  const end = new Date(from);
  switch (duration) {
    case "1week": end.setDate(end.getDate() + 7); break;
    case "2weeks": end.setDate(end.getDate() + 14); break;
    case "3weeks": end.setDate(end.getDate() + 21); break;
    case "1month": end.setMonth(end.getMonth() + 1); break;
    default: return null;
  }
  return end.toISOString();
}

export const DURATION_OPTIONS = [
  { value: "always", label: "Always Available" },
  { value: "1week", label: "1 Week" },
  { value: "2weeks", label: "2 Weeks" },
  { value: "3weeks", label: "3 Weeks" },
  { value: "1month", label: "1 Month" },
  { value: "custom", label: "Custom Duration" },
] as const;
