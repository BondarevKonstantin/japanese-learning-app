const isScrollableOverflow = (value: string): boolean => {
  return value === 'auto' || value === 'scroll';
};

export const lockBackgroundScroll = (exemptRoot?: HTMLElement | null): (() => void) => {
  const targets = new Set<HTMLElement>([document.documentElement, document.body]);

  document.querySelectorAll<HTMLElement>('body *').forEach((element) => {
    if (exemptRoot && (element === exemptRoot || exemptRoot.contains(element))) {
      return;
    }

    if (isScrollableOverflow(getComputedStyle(element).overflowY)) {
      targets.add(element);
    }
  });

  const snapshots = [...targets].map((element) => ({
    element,
    overflow: element.style.overflow,
  }));

  targets.forEach((element) => {
    element.style.overflow = 'hidden';
  });

  return () => {
    snapshots.forEach(({ element, overflow }) => {
      element.style.overflow = overflow;
    });
  };
};
