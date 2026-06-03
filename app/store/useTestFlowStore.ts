"use client";

import { create } from "zustand";
import type { ID, QuestionFormValues } from "../lib/types";

type TestFlowState = {
  unsavedQuestions: Record<ID, QuestionFormValues[]>;
  setUnsavedQuestions: (testId: ID, questions: QuestionFormValues[]) => void;
};

export const useTestFlowStore = create<TestFlowState>((set) => ({
  unsavedQuestions: {},
  setUnsavedQuestions: (testId, questions) =>
    set((state) => ({
      unsavedQuestions: { ...state.unsavedQuestions, [testId]: questions },
    })),
}));
