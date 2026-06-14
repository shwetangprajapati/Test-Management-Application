import type {
  AuthUser,
  ID,
  LoginResponse,
  QuestionDto,
  Subject,
  SubTopic,
  TestDto,
  TestPayload,
  Topic,
} from "./types";

// Default to the same-origin proxy (see rewrites in next.config.ts) so browser
// requests never go cross-origin and avoid CORS. Override only with a relative
// path; an absolute cross-origin URL will reintroduce the CORS failure.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/proxy-api";

const TOKEN_KEY = "preproute.auth.token";
const USER_KEY = "preproute.auth.user";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user?: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function redirectToLogin() {
  clearAuth();
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

function unwrap<T>(payload: unknown): T {
  const record = payload as { data?: unknown; result?: unknown; tests?: unknown; subjects?: unknown; topics?: unknown; subTopics?: unknown; questions?: unknown };
  return (record?.data ?? record?.result ?? record?.tests ?? record?.subjects ?? record?.topics ?? record?.subTopics ?? record?.questions ?? payload) as T;
}

async function request<T>(path: string, options: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 && auth) redirectToLogin();
    const record = payload as { message?: unknown; errors?: Array<{ msg?: unknown }> };
    // Surface the field-level validation message instead of the generic "Validation failed".
    const detail = Array.isArray(record?.errors)
      ? record.errors.map((item) => (typeof item?.msg === "string" ? item.msg : "")).filter(Boolean).join(" ")
      : "";
    const message =
      detail ||
      (typeof record?.message === "string" ? record.message : `Request failed with status ${response.status}`);
    throw new ApiError(message, response.status, payload);
  }

  return unwrap<T>(payload);
}

export async function login(userId: string, password: string) {
  const payload = await request<LoginResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ userId, password }),
    },
    false,
  );
  const token = payload.token ?? payload.access_token ?? payload.jwt ?? payload.data?.token ?? payload.data?.access_token;
  if (!token) throw new ApiError("Login succeeded but no token was returned.", 200, payload);
  const user = payload.user ?? payload.data?.user ?? { userId };
  setAuth(token, user);
  return { token, user };
}

export const api = {
  tests: () => request<TestDto[]>("/tests"),
  test: (id: ID) => request<TestDto>(`/tests/${id}`),
  createTest: (payload: TestPayload) =>
    request<TestDto>("/tests", { method: "POST", body: JSON.stringify(payload) }),
  updateTest: (id: ID, payload: Partial<TestPayload>) =>
    request<TestDto>(`/tests/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTest: (id: ID) => request<void>(`/tests/${id}`, { method: "DELETE" }),
  subjects: () => request<Subject[]>("/subjects"),
  topicsBySubject: (subjectId: ID) => request<Topic[]>(`/topics/subject/${subjectId}`),
  subTopicsByTopics: (topicIds: ID[]) =>
    request<SubTopic[]>("/sub-topics/multi-topics", {
      method: "POST",
      body: JSON.stringify({ topicIds }),
    }),
  saveQuestions: (testId: ID, questions: QuestionDto[]) =>
    request<QuestionDto[]>("/questions/bulk", {
      method: "POST",
      body: JSON.stringify({
        questions: questions.map((question) => ({ ...question, test_id: question.test_id ?? testId })),
      }),
    }),
  fetchQuestions: (questionIds: ID[]) =>
    request<QuestionDto[]>("/questions/fetchBulk", {
      method: "POST",
      body: JSON.stringify({ question_ids: questionIds }),
    }),
};

export function idOf(item: { _id?: ID; id?: ID }) {
  return item._id ?? item.id ?? "";
}

export function nameOf(item: Subject | Topic | SubTopic) {
  const value = item as Subject & Topic & SubTopic;
  return value.name ?? value.subject_name ?? value.topic_name ?? value.sub_topic_name ?? "Untitled";
}
