// 演示保护的配置：访客建的临时站点的有效期和限额

export const TEMP_SITE_TTL_HOURS = 24;
export const TEMP_SITE_TTL_MS = TEMP_SITE_TTL_HOURS * 60 * 60 * 1000;

export const MAX_TEMP_SITES = 100;
export const MAX_PAGES_PER_TEMP_SITE = 30;
export const MAX_PAGE_BYTES = 50 * 1024;

// 每次建站顺带清理的站点数上限，积压很多时分几次清完，避免建站变慢
export const MAX_CLEANUP_PER_RUN = 10;

// 图片只对运营者建的站开放
export const MAX_IMAGE_BYTES = 1024 * 1024;
