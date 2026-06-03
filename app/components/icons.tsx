import Image from "next/image";

// Icons/artwork exported from the design (public/figma).

export function Logo() {
  return <Image src="/logo.svg" alt="PrepRoute" width={135} height={33} className="pr-logo-image" priority />;
}

export function Avatar() {
  return <Image src="/figma/avatar.svg" alt="" aria-hidden="true" width={45} height={45} className="pr-avatar-img" />;
}

export function BellIcon() {
  return <Image src="/figma/bell.svg" alt="" aria-hidden="true" width={47} height={47} />;
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return <Image src="/figma/chevron-down.svg" alt="" aria-hidden="true" width={10} height={5} className={className} />;
}

export function DashboardIcon() {
  return <Image src="/figma/icon-dashboard.svg" alt="" aria-hidden="true" width={20} height={20} className="pr-nav-icon" />;
}

export function TestCreationIcon() {
  return <Image src="/figma/icon-test-creation.svg" alt="" aria-hidden="true" width={20} height={20} className="pr-nav-icon" />;
}

export function TestTrackingIcon() {
  return <Image src="/figma/icon-test-tracking.svg" alt="" aria-hidden="true" width={20} height={20} className="pr-nav-icon" />;
}
