export type ID = string;

export type AuthUser = {
  id?: ID;
  name?: string;
  userId?: string;
  email?: string;
  role?: string;
};

export type LoginResponse = {
  token?: string;
  access_token?: string;
  jwt?: string;
  user?: AuthUser;
  data?: {
    token?: string;
    access_token?: string;
    user?: AuthUser;
  };
};

export type Subject = {
  _id?: ID;
  id?: ID;
  name?: string;
  subject_name?: string;
};

export type Topic = {
  _id?: ID;
  id?: ID;
  name?: string;
  topic_name?: string;
  subject_id?: ID;
};

export type SubTopic = {
  _id?: ID;
  id?: ID;
  name?: string;
  sub_topic_name?: string;
  topic_id?: ID;
};

export type TestStatus = "draft" | "live" | "published" | "scheduled" | string;

export type TestDto = {
  _id?: ID;
  id?: ID;
  name?: string;
  test_name?: string;
  subject?: Subject | string;
  topics?: Array<Topic | string>;
  sub_topics?: Array<SubTopic | string>;
  subject_id?: ID;
  subjectId?: ID;
  topic_ids?: ID[];
  topicIds?: ID[];
  sub_topic_ids?: ID[];
  subTopicIds?: ID[];
  type?: string;
  difficulty?: string;
  status?: TestStatus;
  total_time?: number;
  duration?: number;
  total_marks?: number;
  total_questions?: number;
  correct_marks?: number;
  wrong_marks?: number;
  unattempt_marks?: number;
  questions?: Array<ID | QuestionDto>;
  question_ids?: ID[];
  marking_scheme?: MarkingScheme;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
};

export type MarkingScheme = {
  correct?: number;
  wrong?: number;
  unattempted?: number;
  correct_answer?: number;
  wrong_answer?: number;
};

export type TestFormValues = {
  name: string;
  type: string;
  subjectId: string;
  topicIds: string[];
  subTopicIds: string[];
  difficulty: string;
  totalTime: number;
  correctMarks: number;
  wrongMarks: number;
  unattemptedMarks: number;
  totalQuestions: number;
  totalMarks: number;
};

export type TestPayload = {
  name: string;
  type: string;
  subject: string;
  // omitted when empty (update endpoint rejects an empty sub_topics array)
  topics?: string[];
  sub_topics?: string[];
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  difficulty: string;
  total_time: number;
  total_marks: number;
  total_questions: number;
  marking_scheme: {
    correct: number;
    wrong: number;
    unattempted: number;
  };
  status: TestStatus;
  questions?: ID[];
  question_ids?: ID[];
  // scheduling fields, used when status is "scheduled"
  scheduled_date?: string | null;
  expiry_date?: string | null;
};

export type QuestionOption = {
  text: string;
};

export type QuestionDto = {
  _id?: ID;
  id?: ID;
  question?: string;
  question_text?: string;
  text?: string;
  options?: Array<string | QuestionOption>;
  option1?: string;
  option2?: string;
  option3?: string;
  option4?: string;
  correct_option?: number | string;
  correctOption?: number | string;
  answer?: number | string;
  solution?: string;
  explanation?: string;
  difficulty?: string;
  test_id?: ID;
  // questions store subject/topic/sub_topic by name, not id
  subject?: string;
  topic?: string;
  sub_topic?: string;
  topic_id?: ID;
  sub_topic_id?: ID;
  media_url?: string;
  type?: "mcq" | string;
};

export type QuestionFormValues = {
  localId: string;
  questionText: string;
  options: [string, string, string, string];
  correctOption: number;
  explanation: string;
  difficulty: string;
  topicId: string;
  subTopicId: string;
  mediaUrl: string;
};
