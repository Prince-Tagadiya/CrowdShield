import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

let document;
let styles;

beforeAll(() => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  document = new JSDOM(html).window.document;
  styles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
});

describe('accessibility structure', () => {
  it('declares language and viewport', () => {
    expect(document.documentElement.lang).toBe('en');
    expect(document.querySelector('meta[name="viewport"]')).not.toBeNull();
  });

  it('includes a skip link to main content', () => {
    const skip = document.querySelector('.skip-link');
    expect(skip).not.toBeNull();
    expect(skip.getAttribute('href')).toBe('#main-content');
  });

  it('uses a labelled main region', () => {
    const main = document.querySelector('main#main-content');
    expect(main).not.toBeNull();
  });

  it('labels the main navigation', () => {
    expect(document.querySelector('nav[aria-label="Main Navigation"]')).not.toBeNull();
  });

  it('has labels for login fields', () => {
    expect(document.querySelector('label[for="email"]')).not.toBeNull();
    expect(document.querySelector('label[for="password"]')).not.toBeNull();
  });

  it('uses password autocomplete attributes', () => {
    expect(document.getElementById('email')?.getAttribute('autocomplete')).toBe('username');
    expect(document.getElementById('password')?.getAttribute('autocomplete')).toBe('current-password');
  });

  it('announces login errors assertively', () => {
    expect(document.getElementById('login-error')?.getAttribute('aria-live')).toBe('assertive');
  });

  it('labels AI command console elements', () => {
    expect(document.querySelector('label[for="ai-command-input"]')).not.toBeNull();
    expect(document.getElementById('ai-submit-btn')?.getAttribute('aria-label')).toContain('Execute');
  });

  it('marks AI response log as live content', () => {
    expect(document.getElementById('ai-response-log')?.getAttribute('aria-live')).toBe('polite');
  });

  it('labels tactical map controls', () => {
    expect(document.getElementById('btn-zoom-in')?.getAttribute('aria-label')).toBeTruthy();
    expect(document.getElementById('btn-zoom-out')?.getAttribute('aria-label')).toBeTruthy();
  });

  it('marks incident feed as live', () => {
    expect(document.getElementById('active-alerts-overlay')?.getAttribute('aria-live')).toBe('polite');
  });

  it('marks emergency banner as assertive', () => {
    expect(document.getElementById('emergency-banner')?.getAttribute('aria-live')).toBe('assertive');
  });

  it('includes attendee insight section with label', () => {
    expect(document.querySelector('.attendee-insights[aria-label="Live attendee insights"]')).not.toBeNull();
  });

  it('includes live venue map with accessible label', () => {
    const attendeeMap = document.getElementById('attendee-map');
    expect(attendeeMap?.getAttribute('role')).toBe('img');
    expect(attendeeMap?.getAttribute('aria-label')).toBe('Live venue map');
  });

  it('describes attendee map context and loading state', () => {
    const attendeeMap = document.getElementById('attendee-map');
    expect(attendeeMap?.getAttribute('aria-describedby')).toBe('attendee-map-help map-status');
    expect(attendeeMap?.getAttribute('aria-busy')).toBe('true');
    expect(document.getElementById('attendee-map-help')?.textContent).toContain('live crowd guidance');
  });

  it('includes admin venue map with accessible label', () => {
    const adminMap = document.getElementById('admin-google-map');
    expect(adminMap?.getAttribute('role')).toBe('img');
    expect(adminMap?.getAttribute('aria-label')).toBe('Operations venue map');
  });

  it('describes admin map context and loading state', () => {
    const adminMap = document.getElementById('admin-google-map');
    expect(adminMap?.getAttribute('aria-describedby')).toBe('admin-map-help admin-map-status');
    expect(adminMap?.getAttribute('aria-busy')).toBe('true');
    expect(document.getElementById('admin-map-help')?.textContent).toContain('command staff');
  });

  it('announces map status updates politely', () => {
    expect(document.getElementById('map-status')?.getAttribute('aria-live')).toBe('polite');
    expect(document.getElementById('admin-map-status')?.getAttribute('aria-live')).toBe('polite');
  });

  it('labels quick guidance buttons', () => {
    ['btn-guide-food', 'btn-guide-exit', 'btn-guide-washroom', 'btn-guide-gate'].forEach((id) => {
      expect(document.getElementById(id)?.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('announces attendee result updates politely', () => {
    expect(document.getElementById('attendee-result')?.getAttribute('aria-live')).toBe('polite');
  });

  it('labels emergency report input and button', () => {
    expect(document.querySelector('label[for="report-input"]')).not.toBeNull();
    expect(document.getElementById('report-submit-btn')?.getAttribute('aria-label')).toContain('Submit');
  });

  it('provides emergency report guidance copy', () => {
    expect(document.getElementById('report-help')?.textContent).toContain('where you are');
    expect(document.getElementById('report-input')?.getAttribute('aria-describedby')).toBe('report-help report-feedback');
  });

  it('announces report feedback politely', () => {
    expect(document.getElementById('report-feedback')?.getAttribute('aria-live')).toBe('polite');
  });

  it('uses dialog semantics for confirmation modal', () => {
    const modal = document.getElementById('confirm-modal');
    expect(modal?.tagName).toBe('DIALOG');
    expect(modal?.getAttribute('aria-labelledby')).toBe('modal-title');
    expect(modal?.getAttribute('aria-describedby')).toBe('modal-desc');
  });

  it('has a visible page title and description metadata', () => {
    expect(document.querySelector('title')?.textContent).toContain('CrowdShield');
    expect(document.querySelector('meta[name="description"]')).not.toBeNull();
  });

  it('includes color scheme and theme metadata', () => {
    expect(document.querySelector('meta[name="theme-color"]')).not.toBeNull();
    expect(document.querySelector('meta[name="color-scheme"]')).not.toBeNull();
  });

  it('links a web manifest', () => {
    expect(document.querySelector('link[rel="manifest"]')).not.toBeNull();
  });

  it('contains the expected main landmarks', () => {
    expect(document.querySelectorAll('main').length).toBe(3);
  });

  it('includes headings for major sections', () => {
    expect(document.getElementById('login-screen')?.querySelector('h1')).not.toBeNull();
    expect(document.getElementById('ops-map-title')).not.toBeNull();
    expect(document.getElementById('venue-map-title')).not.toBeNull();
  });

  it('provides current-user label in navigation', () => {
    expect(document.getElementById('user-email')?.getAttribute('aria-label')).toBe('Current User');
  });

  it('defines visible keyboard focus styling', () => {
    expect(styles).toContain('button:focus-visible');
    expect(styles).toContain('input:focus-visible');
    expect(styles).toContain('outline: 3px solid');
  });
});
