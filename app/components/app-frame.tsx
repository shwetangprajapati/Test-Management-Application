"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAuth, getStoredUser, getToken } from "../lib/api";
import { Avatar, BellIcon, ChevronDownIcon, DashboardIcon, Logo, TestCreationIcon, TestTrackingIcon } from "./icons";
import { LoadingState } from "./ui";

function TopBar() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getStoredUser>>(null);

  useEffect(() => {
    queueMicrotask(() => setUser(getStoredUser()));
  }, []);

  return (
    <header className="pr-topbar">
      <div />
      <div className="pr-topbar-actions">
        <button type="button" aria-label="Notifications" className="pr-bell">
          <BellIcon />
        </button>
        <button
          type="button"
          className="pr-user"
          onClick={() => {
            clearAuth();
            router.push("/login");
          }}
          title="Sign out"
        >
          <Avatar />
          <span className="pr-user-copy">
            <strong>{user?.name ?? user?.userId ?? "Admin"}</strong>
            <small>{user?.role ?? "Admin"}</small>
          </span>
          <ChevronDownIcon className="pr-chevron" />
        </button>
      </div>
    </header>
  );
}

function MainSidebar({ active }: { active: "dashboard" | "create" }) {
  return (
    <aside className="pr-sidebar">
      <div className="pr-sidebar-logo">
        <Logo />
      </div>
      <nav aria-label="Primary" className="pr-sidebar-nav">
        <Link href="/dashboard" className={active === "dashboard" ? "pr-nav-item is-active" : "pr-nav-item"}>
          <DashboardIcon /> Dashboard
        </Link>
        <Link href="/tests/new" className={active === "create" ? "pr-nav-item is-active" : "pr-nav-item"}>
          <TestCreationIcon /> Test Creation
        </Link>
        <Link href="/dashboard" className="pr-nav-item">
          <TestTrackingIcon /> Test Tracking
        </Link>
      </nav>
    </aside>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (!getToken()) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) return <main className="pr-page"><LoadingState label="Checking session..." /></main>;
  return children;
}

export function AppFrame({ active, children }: { active: "dashboard" | "create"; children: React.ReactNode }) {
  return (
    <AuthGuard>
      <main className="pr-page">
        <div className="pr-frame">
          <MainSidebar active={active} />
          <section className="pr-main">
            <TopBar />
            {children}
          </section>
        </div>
      </main>
    </AuthGuard>
  );
}
