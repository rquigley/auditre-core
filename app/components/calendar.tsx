import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  createCalendar,
  endOfMonth,
  getDayOfWeek,
  getWeeksInMonth,
  isSameDay,
  isSameMonth,
  parseDate,
} from '@internationalized/date';
import { useButton } from '@react-aria/button';
import {
  useCalendar,
  useCalendarCell,
  useCalendarGrid,
} from '@react-aria/calendar';
import { useFocusRing } from '@react-aria/focus';
import { useDateFormatter, useLocale } from '@react-aria/i18n';
import { mergeProps } from '@react-aria/utils';
import { VisuallyHidden } from '@react-aria/visually-hidden';
import { useCalendarState } from '@react-stately/calendar';
import { useRef } from 'react';

export default function Calendar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: any) => void;
}) {
  let parsedValue = value
    ? parseDate(value.toString().replace(/T.*/, ''))
    : undefined;

  let { locale } = useLocale();
  let state = useCalendarState({
    value: parsedValue,
    visibleDuration: { months: 1 },
    locale,
    createCalendar,
    onChange: (value) => {
      onChange(value);
    },
  });

  let ref = useRef();
  let { calendarProps, prevButtonProps, nextButtonProps } = useCalendar(
    {
      value: parsedValue,
    },
    state,
  );

  return (
    // @ts-expect-error
    <div {...calendarProps} ref={ref} className="inline-block text-gray-800">
      <CalendarHeader
        state={state}
        calendarProps={calendarProps}
        prevButtonProps={prevButtonProps}
        nextButtonProps={nextButtonProps}
      />
      <div className="flex gap-8">
        <CalendarGrid state={state} />
      </div>
    </div>
  );
}
// @ts-expect-error
export function CalendarCell({ state, date, currentMonth }) {
  let ref = useRef();
  let { cellProps, buttonProps, isSelected, isDisabled, formattedDate } =
    // @ts-expect-error
    useCalendarCell({ date }, state, ref);

  let isOutsideMonth = !isSameMonth(currentMonth, date);

  // The start and end date of the selected range will have
  // an emphasized appearance.
  let isSelectionStart = state.highlightedRange
    ? isSameDay(date, state.highlightedRange.start)
    : isSelected;
  let isSelectionEnd = state.highlightedRange
    ? isSameDay(date, state.highlightedRange.end)
    : isSelected;

  // We add rounded corners on the left for the first day of the month,
  // the first day of each week, and the start date of the selection.
  // We add rounded corners on the right for the last day of the month,
  // the last day of each week, and the end date of the selection.
  let { locale } = useLocale();
  let dayOfWeek = getDayOfWeek(date, locale);
  let isRoundedLeft =
    isSelected && (isSelectionStart || dayOfWeek === 0 || date.day === 1);
  let isRoundedRight =
    isSelected &&
    (isSelectionEnd ||
      dayOfWeek === 6 ||
      date.day === date.calendar.getDaysInMonth(date));

  let { focusProps, isFocusVisible } = useFocusRing();

  return (
    <td
      {...cellProps}
      className={`py-0.5 relative ${isFocusVisible ? 'z-10' : 'z-0'}`}
    >
      <div
        {...mergeProps(buttonProps, focusProps)}
        // @ts-expect-error
        ref={ref}
        hidden={isOutsideMonth}
        className={`w-10 h-10 outline-none group ${
          isRoundedLeft ? 'rounded-l-full' : ''
        } ${isRoundedRight ? 'rounded-r-full' : ''} ${
          isSelected ? 'bg-violet-300' : ''
        } ${isDisabled ? 'disabled' : ''}`}
      >
        <div
          className={`w-full h-full rounded-full flex items-center justify-center ${
            isDisabled ? 'text-gray-400' : ''
          } ${
            // Focus ring, visible while the cell has keyboard focus.
            isFocusVisible
              ? 'ring-2 group-focus:z-2 ring-sky-700 ring-offset-2'
              : ''
          } ${
            // Darker selection background for the start and end.
            isSelectionStart || isSelectionEnd
              ? 'bg-sky-700 text-white hover:bg-sky-700'
              : ''
          } ${
            // Hover state for cells in the middle of the range.
            isSelected && !(isSelectionStart || isSelectionEnd)
              ? 'hover:bg-sky-700'
              : ''
          } ${
            // Hover state for non-selected cells.
            !isSelected && !isDisabled ? 'hover:bg-sky-100' : ''
          } cursor-default`}
        >
          {formattedDate}
        </div>
      </div>
    </td>
  );
}

// @ts-expect-error
export function CalendarGrid({ state, offset = {} }) {
  let { locale } = useLocale();
  let startDate = state.visibleRange.start.add(offset);
  let endDate = endOfMonth(startDate);
  let { gridProps, headerProps, weekDays } = useCalendarGrid(
    {
      startDate,
      // @ts-expect-error
      endDate,
    },
    state,
  );

  // Get the number of weeks in the month so we can render the proper number of rows.
  let weeksInMonth = getWeeksInMonth(startDate, locale);

  return (
    <table {...gridProps} cellPadding="0" className="flex-1">
      <thead {...headerProps} className="text-gray-600">
        <tr>
          {weekDays.map((day, index) => (
            <th key={index}>{day}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {
          // @ts-expect-error
          [...new Array(weeksInMonth).keys()].map((weekIndex) => (
            <tr key={weekIndex}>
              {state.getDatesInWeek(weekIndex, startDate).map(
                // @ts-expect-error
                (date, i) =>
                  date ? (
                    <CalendarCell
                      key={i}
                      state={state}
                      date={date}
                      currentMonth={startDate}
                    />
                  ) : (
                    <td key={i} />
                  ),
              )}
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

export function CalendarHeader({
  // @ts-expect-error
  state,
  // @ts-expect-error
  calendarProps,
  // @ts-expect-error
  prevButtonProps,
  // @ts-expect-error
  nextButtonProps,
}) {
  let monthDateFormatter = useDateFormatter({
    month: 'long',
    year: 'numeric',
    timeZone: state.timeZone,
  });

  return (
    <div className="flex items-center py-4">
      {/* Add a screen reader only description of the entire visible range rather than
       * a separate heading above each month grid. This is placed first in the DOM order
       * so that it is the first thing a touch screen reader user encounters.
       * In addition, VoiceOver on iOS does not announce the aria-label of the grid
       * elements, so the aria-label of the Calendar is included here as well. */}
      <VisuallyHidden>
        <h2>{calendarProps['aria-label']}</h2>
      </VisuallyHidden>
      <Button {...prevButtonProps}>
        <ChevronLeftIcon className="size-6" />
      </Button>
      <h2
        // We have a visually hidden heading describing the entire visible range,
        // and the calendar itself describes the individual month
        // so we don't need to repeat that here for screen reader users.
        aria-hidden
        className="flex-1 align-center font-bold text-xl text-center"
      >
        {monthDateFormatter.format(
          state.visibleRange.start.toDate(state.timeZone),
        )}
      </h2>
      {/* <h2
        aria-hidden
        className="flex-1 align-center font-bold text-xl text-center"
      >
        {monthDateFormatter.format(
          state.visibleRange.start.add({ months: 1 }).toDate(state.timeZone),
        )}
      </h2> */}
      <Button {...nextButtonProps}>
        <ChevronRightIcon className="size-6" />
      </Button>
    </div>
  );
}

// @ts-expect-error
export function Button(props) {
  let ref = useRef();
  // @ts-expect-error
  let { buttonProps } = useButton(props, ref);
  let { focusProps, isFocusVisible } = useFocusRing();
  return (
    <button
      {...mergeProps(buttonProps, focusProps)}
      // @ts-expect-error
      ref={ref}
      className={`p-2 rounded-full ${props.isDisabled ? 'text-gray-400' : ''} ${
        !props.isDisabled ? 'hover:bg-violet-100 active:bg-violet-200' : ''
      } outline-none ${
        isFocusVisible ? 'ring-2 ring-offset-2 ring-purple-600' : ''
      }`}
    >
      {props.children}
    </button>
  );
}
