"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { QuestionFormValues, TestDto } from "../lib/types";
import { friendlyError, questionFromDto, questionIds } from "../lib/test-utils";
import { useToastStore } from "../store/useToastStore";
import { AppFrame } from "../components/app-frame";
import { ErrorMessage, LoadingState, TestSummaryCard } from "../components/ui";

export function PreviewScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toastError = useToastStore((state) => state.error);
  const [test, setTest] = useState<TestDto>();
  const [questions, setQuestions] = useState<QuestionFormValues[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .test(params.id)
      .then(async (loaded) => {
        setTest(loaded);
        const ids = questionIds(loaded);
        if (ids.length) {
          const fetched = await api.fetchQuestions(ids);
          setQuestions(fetched.map(questionFromDto));
        }
      })
      .catch((error) => {
        const text = friendlyError(error, "We couldn't load this preview. Please try again.");
        setMessage(text);
        toastError("Couldn't load the preview", text);
      })
      .finally(() => setLoading(false));
  }, [params.id, toastError]);

  return (
    <AppFrame active="create">
      <section className="pr-confirm-content">
        <div className="pr-page-head">
          <div>
            <p className="pr-crumbs-inline">Test Creation / Preview</p>
            <h1>Preview Test</h1>
          </div>
          <div className="pr-row-actions">
            <Link href={`/tests/${params.id}/edit`}>Edit Test</Link>
            <Link href={`/tests/${params.id}/questions`}>Edit Questions</Link>
          </div>
        </div>
        <ErrorMessage message={message} />
        {loading ? <LoadingState label="Loading preview..." /> : null}
        <TestSummaryCard test={test} />
        <div className="pr-preview-list">
          {questions.map((question, index) => (
            <section key={question.localId} className="pr-question-card">
              <h2 className="pr-preview-question">
                <span>{index + 1}.</span>
                <span dangerouslySetInnerHTML={{ __html: question.questionText }} />
              </h2>
              <ol>
                {question.options.map((option, optionIndex) => (
                  <li key={optionIndex} className={optionIndex === question.correctOption ? "is-correct" : ""}>{option}</li>
                ))}
              </ol>
              {question.explanation ? (
                <p className="pr-preview-explanation" dangerouslySetInnerHTML={{ __html: question.explanation }} />
              ) : null}
              {question.mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pr-preview-media" src={question.mediaUrl} alt={`Question ${index + 1} media`} />
              ) : null}
            </section>
          ))}
          {!loading && questions.length === 0 ? <p className="pr-loading">No questions attached yet.</p> : null}
        </div>
        <div className="pr-actions">
          <button
            type="button"
            className="pr-primary"
            onClick={() => {
              localStorage.setItem("preproute.publishTestId", params.id);
              router.push(`/confirmation/publish-now?id=${params.id}`);
            }}
          >
            Publish
          </button>
        </div>
      </section>
    </AppFrame>
  );
}
