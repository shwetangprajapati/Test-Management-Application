"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getToken, login } from "../lib/api";
import { loginSchema } from "../lib/schemas";
import { friendlyError } from "../lib/test-utils";
import { useToastStore } from "../store/useToastStore";
import { Logo } from "../components/icons";
import { ButtonLabel, ErrorMessage } from "../components/ui";

export function LoginScreen() {
  const router = useRouter();
  const toastSuccess = useToastStore((state) => state.success);
  const toastError = useToastStore((state) => state.error);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { userId: "", password: "" } });

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  return (
    <main className="pr-login-page">
      <section className="pr-login-art">
        <div className="pr-login-illustration" aria-hidden="true">
          <Image src="/test-tube-man.svg" alt="" width={467} height={344} aria-hidden="true" preload />
        </div>
      </section>
      <section className="pr-login-panel">
        <form
          aria-label="Login"
          className="pr-login-form"
          onSubmit={handleSubmit(
            async (values) => {
              setServerError("");
              try {
                await login(values.userId, values.password);
                toastSuccess("Welcome back!", "Taking you to your dashboard…");
                router.push("/dashboard");
              } catch (error) {
                const message = friendlyError(error, "Please check your User ID and password and try again.");
                setServerError(message);
                toastError("We couldn't sign you in", message);
              }
            },
            () => toastError("Just a moment", "Please enter your User ID and password to continue."),
          )}
        >
          <Logo />
          <h1>Login</h1>
          <p>Use your company provided Login credentials</p>
          <label className="pr-field">
            <span>User ID</span>
            <input placeholder="Enter User ID" autoComplete="username" {...register("userId")} />
            <ErrorMessage message={errors.userId?.message} />
          </label>
          <label className="pr-field">
            <span>Password</span>
            <input type="password" placeholder="Enter Password" autoComplete="current-password" {...register("password")} />
            <ErrorMessage message={errors.password?.message} />
          </label>
          <a href="#">Forgot password?</a>
          <ErrorMessage message={serverError} />
          <button type="submit" className="pr-login-button" disabled={isSubmitting}>
            <ButtonLabel loading={isSubmitting} label="Login" loadingLabel="Logging in..." />
          </button>
        </form>
      </section>
    </main>
  );
}
