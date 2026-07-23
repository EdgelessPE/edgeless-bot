function shouldCheckMissingVersion(
  forced: boolean,
  explicitlyRequested: boolean,
  currentDay: number,
  scheduledDay: number,
): boolean {
  return forced || explicitlyRequested || currentDay === scheduledDay;
}

export { shouldCheckMissingVersion };
