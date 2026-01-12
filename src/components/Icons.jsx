import React from "react";

function S({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const I = {
  User: (p) => <S {...p}><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></S>,
  Trophy: (p) => <S {...p}><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M18 5h3v2a4 4 0 0 1-4 4"/><path d="M6 5H3v2a4 4 0 0 0 4 4"/></S>,
  Chart: (p) => <S {...p}><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-5"/><path d="M12 19v-9"/><path d="M16 11v-3"/></S>,
  Plus: (p) => <S {...p}><path d="M12 5v14"/><path d="M5 12h14"/></S>,
  Shield: (p) => <S {...p}><path d="M12 2l8 4v6c0 5-3.5 9.5-8 10-4.5-.5-8-5-8-10V6l8-4z"/></S>,
  Check: (p) => <S {...p}><path d="M20 6L9 17l-5-5"/></S>,
  List: (p) => <S {...p}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></S>,
  Users: (p) => <S {...p}><path d="M17 21a5 5 0 0 0-10 0"/><circle cx="12" cy="8" r="4"/><path d="M22 21a4 4 0 0 0-4-4"/><path d="M6 17a4 4 0 0 0-4 4"/></S>,
  Sun: (p) => <S {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.2 4.2l1.4 1.4"/><path d="M18.4 18.4l1.4 1.4"/><path d="M4.2 19.8l1.4-1.4"/><path d="M18.4 5.6l1.4-1.4"/></S>,
  Moon: (p) => <S {...p}><path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8z"/></S>,
  Search: (p) => <S {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></S>,
};
