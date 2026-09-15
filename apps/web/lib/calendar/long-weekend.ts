/**
 * M23 Calendar — számított hosszú hétvége (BR-M23-007, EC-07). Nem tárolt adat.
 *
 * Hosszú hétvége: legalább háromnapos, összefüggő szabadnap-sorozat (szombat, vasárnap, munkaszüneti
 * vagy áthelyezett pihenőnap), amelyben legalább egy hétköznapra eső munkaszüneti vagy pihenőnap van.
 * Az áthelyezett munkanap (pl. ledolgozós szombat) megszakítja a sorozatot.
 */

import { addDays, isoWeekday, type DateRange } from "./rules";
import { eachDay } from "./period";

export function longWeekends(
  input: { dayOffDates: Iterable<string>; workingDates?: Iterable<string>; range: DateRange; minDays?: number },
): DateRange[] {
  const dayOff = new Set(input.dayOffDates);
  const working = new Set(input.workingDates ?? []);
  const minDays = Math.max(3, input.minDays ?? 3);
  // A tartomány két végén túlnyúló sorozatok is számítsanak.
  const days = eachDay({ earliest: addDays(input.range.earliest, -6), latest: addDays(input.range.latest, 6) });
  const isFree = (d: string) => !working.has(d) && (dayOff.has(d) || isoWeekday(d) >= 6);

  const result: DateRange[] = [];
  let runStart: string | null = null;
  let hasWeekdayHoliday = false;
  let length = 0;
  const close = (lastDay: string) => {
    if (runStart && length >= minDays && hasWeekdayHoliday) {
      const run = { earliest: runStart, latest: lastDay };
      if (run.latest >= input.range.earliest && run.earliest <= input.range.latest) result.push(run);
    }
    runStart = null;
    hasWeekdayHoliday = false;
    length = 0;
  };
  days.forEach((day, i) => {
    if (isFree(day)) {
      runStart ??= day;
      length += 1;
      if (dayOff.has(day) && isoWeekday(day) <= 5) hasWeekdayHoliday = true;
    } else {
      close(days[i - 1]);
    }
  });
  if (days.length) close(days[days.length - 1]);
  return result;
}
