import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import MapSandboxPage from './MapSandboxPage.svelte';

describe('MapSandboxPage', () => {
  it('toggles crosshair button state', async () => {
    render(MapSandboxPage);

    const toggleButton = screen.getByRole('button', { name: 'Hide Crosshair' });
    await fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: 'Show Crosshair' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Show Crosshair' }));
    expect(screen.getByRole('button', { name: 'Hide Crosshair' })).toBeInTheDocument();
  });

  it('exposes viewport and event status labels with reset action', async () => {
    render(MapSandboxPage);

    expect(screen.getByText(/^Viewport\b/)).toBeInTheDocument();
    expect(screen.getByText(/^Last event\b/)).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Reset Viewport' }));
    expect(screen.getByText(/z:1.00/)).toBeInTheDocument();
  });

  it('enters calibration mode and displays calibration controls', async () => {
    render(MapSandboxPage);

    await fireEvent.click(screen.getByRole('button', { name: 'Start Calibration' }));
    expect(screen.getByRole('button', { name: 'Cancel Calibration' })).toBeInTheDocument();
    expect(screen.getByText(/0\/2 points selected/)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Calibration distance' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Calibration unit' })).toBeInTheDocument();
  });

  it('shows validation error when scale is applied without points', async () => {
    render(MapSandboxPage);

    await fireEvent.click(screen.getByRole('button', { name: 'Apply Scale' }));
    expect(screen.getByText('Pick two map points before applying scale.')).toBeInTheDocument();
  });
});
