export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M14 4.5C14 3.12 15.12 2 16.5 2"
          stroke="#1f3d2b"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="14" cy="6" r="1.6" fill="#1f3d2b" />
        <path
          d="M14 7.5L4 14.5C3 15.2 3.4 16.8 4.6 16.9L14 17.8L23.4 16.9C24.6 16.8 25 15.2 24 14.5L14 7.5Z"
          stroke="#1f3d2b"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M14 20.5c-1.9-1.7-3.4-2.9-3.4-4.3 0-1 .8-1.7 1.7-1.7.8 0 1.3.5 1.7 1 .4-.5.9-1 1.7-1 .9 0 1.7.7 1.7 1.7 0 1.4-1.5 2.6-3.4 4.3z"
          fill="#f2a6bc"
        />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight text-forest">
        ReWear
      </span>
    </span>
  );
}
