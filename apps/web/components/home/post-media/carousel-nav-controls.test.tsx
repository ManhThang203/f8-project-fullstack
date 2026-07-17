import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CarouselNavControls } from './carousel-nav-controls';

describe('CarouselNavControls', () => {
  it('renders nothing when fewer than 2 slides', () => {
    const { container } = render(
      <CarouselNavControls
        slideCount={1}
        selectedIndex={0}
        canScrollPrev={false}
        canScrollNext={false}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onDotSelect={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dots for each slide and marks the active one', () => {
    render(
      <CarouselNavControls
        slideCount={3}
        selectedIndex={1}
        canScrollPrev
        canScrollNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onDotSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('tab', { name: 'Ảnh 1 / 3' }).getAttribute('aria-selected')).toBe(
      'false',
    );
    expect(screen.getByRole('tab', { name: 'Ảnh 2 / 3' }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Ảnh 3 / 3' }).getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  it('calls onDotSelect / onPrev / onNext', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onDotSelect = vi.fn();

    render(
      <CarouselNavControls
        slideCount={3}
        selectedIndex={1}
        canScrollPrev
        canScrollNext
        onPrev={onPrev}
        onNext={onNext}
        onDotSelect={onDotSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ảnh trước' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ảnh sau' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Ảnh 3 / 3' }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onDotSelect).toHaveBeenCalledWith(2);
  });

  it('hides prev when cannot scroll prev', () => {
    render(
      <CarouselNavControls
        slideCount={2}
        selectedIndex={0}
        canScrollPrev={false}
        canScrollNext
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onDotSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Ảnh trước' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ảnh sau' })).toBeTruthy();
  });
});
