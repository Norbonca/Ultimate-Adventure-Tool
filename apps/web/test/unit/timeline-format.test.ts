import { describe, expect, it } from 'vitest';
import { formatDue, mapsDirectionsUrl, moveInList, moveMilestone, normalizeTime } from '@/lib/timeline/format';

describe('M021 timeline helpers', () => {
  it('normalises Postgres TIME values', () => {
    expect(normalizeTime('08:00:00')).toBe('08:00');
    expect(normalizeTime('23:59')).toBe('23:59');
    expect(normalizeTime('24:00')).toBeNull();
    expect(normalizeTime('')).toBeNull();
    expect(normalizeTime('8:00')).toBeNull();
  });

  it('formats the due label with optional time, independent of the viewer zone', () => {
    expect(formatDue('2026-12-10', '08:00:00', 'hu')).toBe('dec. 10. · 08:00');
    expect(formatDue('2026-12-10', null, 'hu')).toBe('dec. 10.');
    expect(formatDue('2026-12-10', '08:00', 'en')).toBe('Dec 10 · 08:00');
    expect(formatDue(null, '08:00', 'hu')).toBeNull();
  });

  it('moves an item inside a list', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveInList(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveInList(['a'], 3, 0)).toEqual(['a']);
  });

  it('moves a milestone within and across phases', () => {
    const layout = [
      { phase_id: 'p1', milestone_ids: ['m1', 'm2'] },
      { phase_id: 'p2', milestone_ids: ['m3'] },
    ];
    expect(moveMilestone(layout, 'm1', 'p1', 1)).toEqual([
      { phase_id: 'p1', milestone_ids: ['m2', 'm1'] },
      { phase_id: 'p2', milestone_ids: ['m3'] },
    ]);
    expect(moveMilestone(layout, 'm1', 'p2', 0)).toEqual([
      { phase_id: 'p1', milestone_ids: ['m2'] },
      { phase_id: 'p2', milestone_ids: ['m1', 'm3'] },
    ]);
    expect(moveMilestone(layout, 'mX', 'p2', 0)).toEqual(layout);
    expect(layout[0].milestone_ids).toEqual(['m1', 'm2']);
  });

  it('builds a navigation link only with coordinates', () => {
    expect(mapsDirectionsUrl(47.4729, 19.0164)).toBe('https://www.google.com/maps/dir/?api=1&destination=47.472900,19.016400');
    expect(mapsDirectionsUrl(null, 19)).toBeNull();
  });
});

import { nextMilestoneId, todayIn } from '@/lib/timeline/format';

describe('M021 participant helpers', () => {
  it('computes today in the trip zone, not the viewer zone', () => {
    const lateEvening = new Date('2026-12-09T23:30:00Z');
    expect(todayIn('Europe/Zagreb', lateEvening)).toBe('2026-12-10');
    expect(todayIn('America/New_York', lateEvening)).toBe('2026-12-09');
    expect(todayIn('Not/AZone', lateEvening)).toBe('2026-12-09');
  });

  it('picks the earliest upcoming, unfinished milestone by date and time', () => {
    const phases = [
      { milestones: [
        { id: 'past', status: 'not_started', due_date: '2026-11-01', due_time: null },
        { id: 'done', status: 'done', due_date: '2026-12-01', due_time: null },
        { id: 'later', status: 'not_started', due_date: '2026-12-10', due_time: '16:00:00' },
      ] },
      { milestones: [
        { id: 'first', status: 'in_progress', due_date: '2026-12-10', due_time: '08:00:00' },
        { id: 'nodate', status: 'not_started', due_date: null, due_time: null },
      ] },
    ];
    expect(nextMilestoneId(phases, '2026-11-02')).toBe('first');
    expect(nextMilestoneId(phases, '2026-12-11')).toBeNull();
  });
});
