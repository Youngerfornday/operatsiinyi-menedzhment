/** Рівень заголовка «Варіант N» у TaskShell: 3 для самотнього тренажера, 4 — коли над ним стоїть h3 з назвою тренажера. */
import { createContext, useContext } from 'react';

export type TaskHeadingLevel = 3 | 4;

export const TaskHeadingLevelContext = createContext<TaskHeadingLevel>(3);

export function useTaskHeadingLevel(): TaskHeadingLevel {
  return useContext(TaskHeadingLevelContext);
}
