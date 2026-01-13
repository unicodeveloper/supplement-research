"use client";

export default function GitHubCorner() {
  return (
    <a
      href="https://github.com/unicodeveloper/supplement-research"
      target="_blank"
      rel="noopener noreferrer"
      className="github-ribbon fixed top-0 right-0 z-[9999] w-[150px] h-[150px] overflow-hidden pointer-events-none"
      aria-label="View source on GitHub"
    >
      <div className="pointer-events-auto absolute top-[42px] right-[-43px] w-[230px] rotate-45 bg-[#151513] text-white text-center py-2 text-xs font-semibold tracking-wide shadow-md hover:bg-[#24292e] transition-colors duration-200">
        <svg
          className="inline-block w-4 h-4 mr-1.5 -mt-0.5"
          fill="currentColor"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        <span className="hidden sm:inline">Fork me on GitHub</span>
        <span className="sm:hidden">GitHub</span>
      </div>
    </a>
  );
}
