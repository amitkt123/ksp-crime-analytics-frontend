import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SidePanelChrome } from './SidePanelChrome';

describe('SidePanelChrome', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <SidePanelChrome open={false} onClose={vi.fn()} title="Test">
        content
      </SidePanelChrome>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders as a modal dialog with the given title and children when open', () => {
    render(
      <SidePanelChrome open onClose={vi.fn()} title="Test panel">
        <p>body content</p>
      </SidePanelChrome>,
    );
    expect(screen.getByRole('dialog', { name: 'Test panel' })).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SidePanelChrome open onClose={onClose} title="Test">
        content
      </SidePanelChrome>,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <SidePanelChrome open onClose={onClose} title="Test">
        content
      </SidePanelChrome>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SidePanelChrome open onClose={onClose} title="Test">
        content
      </SidePanelChrome>,
    );
    fireEvent.click(container.querySelector('.scrim')!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
