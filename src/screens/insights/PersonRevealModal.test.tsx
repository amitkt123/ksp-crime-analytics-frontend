import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonRevealModal } from './PersonRevealModal';

describe('PersonRevealModal', () => {
  it('renders nothing when no person is open', () => {
    const { container } = render(<PersonRevealModal person={null} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the initials avatar, real name, and detail rows, and closes on click', () => {
    const onClose = vi.fn();
    render(
      <PersonRevealModal
        person={{ realName: 'Vijay Kumar', details: [{ label: 'Age', value: '34' }, { label: 'Top crime head', value: 'Crimes Against Property' }] }}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('VK')).toBeInTheDocument();
    expect(screen.getByText('Vijay Kumar')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<PersonRevealModal person={{ realName: 'Vijay Kumar', details: [] }} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
