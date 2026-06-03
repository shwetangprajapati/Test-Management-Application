"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { QuestionDto, TestDto } from "../lib/types";
import { clearTestsCache, DURATION_OPTIONS, expiryFromDuration, friendlyError, idFromTest, loadTestWithQuestions } from "../lib/test-utils";
import { useToastStore } from "../store/useToastStore";
import { AppFrame } from "../components/app-frame";
import { ButtonLabel, ErrorMessage, LoadingState, TestSummaryCard } from "../components/ui";

function DurationOptions({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="pr-duration-options">
      {DURATION_OPTIONS.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name="duration"
            value={option.value}
            checked={value === option.value}
            onChange={(event) => onChange(event.target.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}

export function PublishNowScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [test, setTest] = useState<TestDto>();
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [liveUntil, setLiveUntil] = useState("always");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  useEffect(() => {
    const testId = searchParams.get("id") || localStorage.getItem("preproute.publishTestId");
    if (!testId) {
      router.push("/dashboard");
      return;
    }

    loadTestWithQuestions(testId)
      .then(({ test, questions }) => {
        setTest(test);
        setQuestions(questions);
      })
      .catch((error) => {
        toastError("Couldn't load the test", friendlyError(error, "We couldn't load this test. Please try again."));
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [searchParams, router, toastError]);

  async function publishNow() {
    if (!test) return;
    setMessage("");
    setPublishing(true);
    const testId = idFromTest(test);

    try {
      const customEnd =
        customEndDate && customEndTime ? new Date(`${customEndDate}T${customEndTime}`).toISOString() : null;
      // API rejects a null expiry_date, so only send it when set.
      const expiry = expiryFromDuration(liveUntil, new Date(), customEnd);
      await api.updateTest(testId, {
        status: "live",
        ...(expiry ? { expiry_date: expiry } : {}),
      });
      clearTestsCache();
      toastSuccess("Test is live!", "Your test is now published and available to students.");
      router.push("/dashboard");
    } catch (error) {
      const text = friendlyError(error, "We couldn't publish your test. Please try again.");
      setMessage(text);
      toastError("Couldn't publish the test", text);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <AppFrame active="create"><LoadingState label="Loading test details..." /></AppFrame>;

  return (
    <AppFrame active="create">
      <section className="pr-content pr-confirmation">
        <div className="pr-page-head">
          <h1>Test creation</h1>
        </div>

        <div className="pr-confirm-status">
          <span className="pr-check-icon">✓</span>
          <h2>Test created</h2>
          <p className="pr-success-msg">All {questions.length} Questions done</p>
        </div>

        <TestSummaryCard test={test} />

        <div className="pr-publish-options">
          <div className="pr-option-tabs">
            <button className="pr-tab is-active">Publish Now</button>
            <button className="pr-tab" onClick={() => router.push(`/confirmation/schedule-publish?id=${idFromTest(test!)}`)}>
              Schedule Publish
            </button>
          </div>

          <div className="pr-live-until">
            <h3>Live Until</h3>
            <p>Choose how long this test should remain available on the platform.</p>

            <DurationOptions value={liveUntil} onChange={setLiveUntil} />

            {liveUntil === "custom" && (
              <div className="pr-datetime-grid">
                <label className="pr-field">
                  <span>Select End Date</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </label>
                <label className="pr-field">
                  <span>Select End Time</span>
                  <input type="time" value={customEndTime} onChange={(event) => setCustomEndTime(event.target.value)} />
                </label>
              </div>
            )}
          </div>

          <ErrorMessage message={message} />
          <div className="pr-actions">
            <button type="button" className="pr-secondary" onClick={() => router.push("/dashboard")}>
              Cancel
            </button>
            <button type="button" className="pr-primary" onClick={publishNow} disabled={publishing}>
              <ButtonLabel loading={publishing} label="Confirm" loadingLabel="Publishing..." />
            </button>
          </div>
        </div>
      </section>
    </AppFrame>
  );
}

export function SchedulePublishScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [test, setTest] = useState<TestDto>();
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [liveUntil, setLiveUntil] = useState("always");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customEndTime, setCustomEndTime] = useState("");

  useEffect(() => {
    const testId = searchParams.get("id") || localStorage.getItem("preproute.publishTestId");

    if (!testId) {
      router.push("/dashboard");
      return;
    }

    loadTestWithQuestions(testId)
      .then(({ test, questions }) => {
        setTest(test);
        setQuestions(questions);
      })
      .catch((error) => {
        toastError("Couldn't load the test", friendlyError(error, "We couldn't load this test. Please try again."));
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [searchParams, router, toastError]);

  async function schedulePublish() {
    if (!test || !scheduleDate || !scheduleTime) {
      toastError("Pick a date and time", "Please choose when this test should go live.");
      return;
    }

    setMessage("");
    setPublishing(true);
    const testId = idFromTest(test);

    try {
      const start = new Date(`${scheduleDate}T${scheduleTime}`);
      const customEnd =
        customEndDate && customEndTime ? new Date(`${customEndDate}T${customEndTime}`).toISOString() : null;
      // API rejects a null expiry_date, so only send it when set.
      const expiry = expiryFromDuration(liveUntil, start, customEnd);

      await api.updateTest(testId, {
        status: "scheduled",
        scheduled_date: start.toISOString(),
        ...(expiry ? { expiry_date: expiry } : {}),
      });

      clearTestsCache();
      toastSuccess("Test scheduled", `It will go live on ${start.toLocaleString()}.`);
      router.push("/dashboard");
    } catch (error) {
      const text = friendlyError(error, "We couldn't schedule your test. Please try again.");
      setMessage(text);
      toastError("Couldn't schedule the test", text);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <AppFrame active="create"><LoadingState label="Loading test details..." /></AppFrame>;

  return (
    <AppFrame active="create">
      <section className="pr-content pr-confirmation">
        <div className="pr-page-head">
          <h1>Test creation</h1>
        </div>

        <div className="pr-confirm-status">
          <span className="pr-check-icon">✓</span>
          <h2>Test created</h2>
          <p className="pr-success-msg">All {questions.length} Questions done</p>
        </div>

        <TestSummaryCard test={test} />

        <div className="pr-publish-options">
          <div className="pr-option-tabs">
            <button className="pr-tab" onClick={() => router.push(`/confirmation/publish-now?id=${idFromTest(test!)}`)}>
              Publish Now
            </button>
            <button className="pr-tab is-active">Schedule Publish</button>
          </div>

          <div className="pr-schedule-section">
            <h3>Select Date and Time</h3>
            <div className="pr-datetime-grid">
              <label className="pr-field">
                <span>Select Date</span>
                <input
                  type="date"
                  value={scheduleDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) => setScheduleDate(event.target.value)}
                />
              </label>
              <label className="pr-field">
                <span>Select Time</span>
                <input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />
              </label>
            </div>
          </div>

          <div className="pr-live-until">
            <h3>Live Until</h3>
            <p>Choose how long this test should remain available on the platform.</p>

            <DurationOptions value={liveUntil} onChange={setLiveUntil} />

            {liveUntil === "custom" && (
              <div className="pr-datetime-grid">
                <label className="pr-field">
                  <span>Select End Date</span>
                  <input
                    type="date"
                    value={customEndDate}
                    min={scheduleDate || new Date().toISOString().split("T")[0]}
                    onChange={(event) => setCustomEndDate(event.target.value)}
                  />
                </label>
                <label className="pr-field">
                  <span>Select End Time</span>
                  <input type="time" value={customEndTime} onChange={(event) => setCustomEndTime(event.target.value)} />
                </label>
              </div>
            )}
          </div>

          <ErrorMessage message={message} />
          <div className="pr-actions">
            <button type="button" className="pr-secondary" onClick={() => router.push("/dashboard")}>
              Cancel
            </button>
            <button type="button" className="pr-primary" onClick={schedulePublish} disabled={publishing || !scheduleDate || !scheduleTime}>
              <ButtonLabel loading={publishing} label="Confirm" loadingLabel="Scheduling..." />
            </button>
          </div>
        </div>
      </section>
    </AppFrame>
  );
}
