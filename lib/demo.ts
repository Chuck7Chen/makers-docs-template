// Demo safeguards: lifetime and limits for temporary sites created by visitors

export const TEMP_SITE_TTL_HOURS = 24;
export const TEMP_SITE_TTL_MS = TEMP_SITE_TTL_HOURS * 60 * 60 * 1000;

export const MAX_TEMP_SITES = 100;
export const MAX_PAGES_PER_TEMP_SITE = 30;
export const MAX_PAGE_BYTES = 50 * 1024;

// Max sites cleaned up after each site creation; a large backlog is cleared over several runs
export const MAX_CLEANUP_PER_RUN = 10;
