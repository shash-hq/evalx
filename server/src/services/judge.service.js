import axios from 'axios';

const JUDGE0_BASE_URL = (process.env.JUDGE0_BASE_URL || 'https://ce.judge0.com').replace(/\/+$/, '');
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || '';
const JUDGE0_AUTH_HEADER = process.env.JUDGE0_AUTH_HEADER || 'X-Auth-Token';
const JUDGE0_REQUEST_TIMEOUT_MS = parsePositiveNumber(process.env.JUDGE0_REQUEST_TIMEOUT_MS, 15000);
const JUDGE0_POLL_INTERVAL_MS = parsePositiveNumber(process.env.JUDGE0_POLL_INTERVAL_MS, 1000);
const JUDGE0_POLL_TIMEOUT_MS = parsePositiveNumber(process.env.JUDGE0_POLL_TIMEOUT_MS, 25000);

const DEFAULT_TIME_LIMIT_MS = 2000;
const DEFAULT_MEMORY_LIMIT_MB = 256;
const JUDGE0_LANGUAGE_CACHE_TTL_MS = 60 * 60 * 1000;

const JUDGE0_PENDING_STATUS_IDS = new Set([1, 2]);
const JUDGE0_PENDING_STATUS_NAMES = new Set(['In Queue', 'Processing']);

const LANGUAGE_FALLBACK_IDS = {
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
};

const LANGUAGE_NAME_MATCHERS = {
  cpp: [/^C\+\+/i],
  java: [/^Java\b/i],
  javascript: [/^JavaScript\b/i, /Node\.js/i],
  python: [/^Python\b/i],
};

const judge0Client = axios.create({
  baseURL: JUDGE0_BASE_URL,
  timeout: JUDGE0_REQUEST_TIMEOUT_MS,
  headers: buildJudge0Headers(),
});

let cachedLanguages = null;
let cachedLanguagesFetchedAt = 0;

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildJudge0Headers() {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (JUDGE0_AUTH_TOKEN) {
    headers[JUDGE0_AUTH_HEADER] = JUDGE0_AUTH_TOKEN;
  }

  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseVersionParts(value = '') {
  const match = value.match(/\d+(?:\.\d+)*/);
  if (!match) return [0];
  return match[0].split('.').map((part) => Number(part));
}

function compareVersionParts(a, b) {
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i += 1) {
    const left = a[i] || 0;
    const right = b[i] || 0;
    if (left !== right) return left - right;
  }

  return 0;
}

function isPendingStatus(status) {
  const id = Number(status?.id);
  const description = status?.description;

  return JUDGE0_PENDING_STATUS_IDS.has(id) || JUDGE0_PENDING_STATUS_NAMES.has(description);
}

function formatJudge0Error(error, fallbackMessage) {
  if (error?.response?.data) {
    const data = error.response.data;

    if (typeof data === 'string' && data.trim()) {
      return data.trim();
    }

    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error.trim();
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }

    if (Array.isArray(data)) {
      const batchIssue = data.find((item) => item && typeof item === 'object' && !item.token);
      if (batchIssue) {
        const [field, messages] = Object.entries(batchIssue)[0] || [];
        if (field && Array.isArray(messages) && messages.length > 0) {
          return `${field}: ${messages.join(', ')}`;
        }
      }
    }
  }

  return error?.message || fallbackMessage;
}

function normalizeJudge0Text(value) {
  return typeof value === 'string' ? value : '';
}

function normalizeJudge0Result(result, testCaseIndex) {
  const stdout = normalizeJudge0Text(result?.stdout);
  const stderr =
    normalizeJudge0Text(result?.compile_output) ||
    normalizeJudge0Text(result?.stderr) ||
    normalizeJudge0Text(result?.message);
  const status = mapJudge0Status(result?.status?.description);
  const timeMs = Math.round((Number(result?.time) || 0) * 1000);
  const memoryKb = Number(result?.memory) || 0;

  return {
    testCaseIndex,
    passed: status === 'accepted',
    status,
    stdout,
    stderr,
    time: timeMs,
    memory: memoryKb,
  };
}

function mapJudge0Status(description = '') {
  const normalized = description.trim();

  if (normalized === 'Accepted') return 'accepted';
  if (normalized === 'Wrong Answer') return 'wrong_answer';
  if (normalized === 'Compilation Error') return 'compilation_error';
  if (normalized === 'Time Limit Exceeded') return 'time_limit_exceeded';
  if (normalized === 'Memory Limit Exceeded') return 'memory_limit_exceeded';
  if (normalized.startsWith('Runtime Error')) return 'runtime_error';
  if (normalized === 'Exec Format Error') return 'runtime_error';
  if (normalized === 'Internal Error') return 'runtime_error';

  return 'runtime_error';
}

function normalizeTestCases(testCases) {
  if (!Array.isArray(testCases) || testCases.length === 0) {
    throw new Error('At least one test case is required');
  }

  return testCases.map((testCase, index) => {
    const hasExpectedOutput = Object.prototype.hasOwnProperty.call(testCase || {}, 'expectedOutput');
    const hasOutput = Object.prototype.hasOwnProperty.call(testCase || {}, 'output');
    const input = typeof testCase?.input === 'string' ? testCase.input : '';
    const expectedOutput =
      hasExpectedOutput && typeof testCase?.expectedOutput === 'string'
        ? testCase.expectedOutput
        : hasOutput && typeof testCase?.output === 'string'
          ? testCase.output
          : '';

    if (!hasExpectedOutput && !hasOutput) {
      throw new Error(`Test case ${index + 1} is missing expected output`);
    }

    return { input, expectedOutput };
  });
}

async function fetchJudge0Languages() {
  const isCacheFresh =
    Array.isArray(cachedLanguages) &&
    Date.now() - cachedLanguagesFetchedAt < JUDGE0_LANGUAGE_CACHE_TTL_MS;

  if (isCacheFresh) {
    return cachedLanguages;
  }

  try {
    const { data } = await judge0Client.get('/languages');
    cachedLanguages = Array.isArray(data) ? data : [];
    cachedLanguagesFetchedAt = Date.now();
    return cachedLanguages;
  } catch (error) {
    if (Array.isArray(cachedLanguages) && cachedLanguages.length > 0) {
      return cachedLanguages;
    }

    console.warn('Judge0 language fetch failed, using fallback language IDs:', formatJudge0Error(error, 'Unknown error'));
    return null;
  }
}

async function resolveJudge0LanguageId(language) {
  const normalizedLanguage = String(language || '').trim().toLowerCase();
  const matchers = LANGUAGE_NAME_MATCHERS[normalizedLanguage];
  if (!matchers) {
    throw new Error(`Unsupported language "${language}"`);
  }

  const languages = await fetchJudge0Languages();
  if (!languages) {
    const fallbackId = LANGUAGE_FALLBACK_IDS[normalizedLanguage];
    if (!fallbackId) {
      throw new Error(`Could not resolve Judge0 language for "${language}"`);
    }
    return fallbackId;
  }

  const matches = languages.filter((item) =>
    matchers.some((pattern) => pattern.test(item?.name || ''))
  );

  if (matches.length === 0) {
    const fallbackId = LANGUAGE_FALLBACK_IDS[normalizedLanguage];
    if (fallbackId) return fallbackId;
    throw new Error(`Judge0 does not expose an active runtime for "${language}"`);
  }

  matches.sort((left, right) =>
    compareVersionParts(
      parseVersionParts(right?.name || ''),
      parseVersionParts(left?.name || '')
    )
  );

  return matches[0].id;
}

async function createBatchSubmission({ languageId, sourceCode, testCases, timeLimitMs, memoryLimitMb }) {
  const payload = {
    submissions: testCases.map((testCase) => ({
      language_id: languageId,
      source_code: sourceCode,
      stdin: testCase.input,
      expected_output: testCase.expectedOutput,
      cpu_time_limit: Number((timeLimitMs / 1000).toFixed(3)),
      wall_time_limit: Number((Math.max(timeLimitMs * 2, timeLimitMs + 1000) / 1000).toFixed(3)),
      memory_limit: Math.max(1, Math.floor(memoryLimitMb * 1024)),
    })),
  };

  try {
    const { data } = await judge0Client.post('/submissions/batch', payload);
    if (!Array.isArray(data) || data.length !== testCases.length) {
      throw new Error('Judge0 returned an unexpected submission batch response');
    }

    const tokens = data.map((item, index) => {
      if (!item?.token) {
        const issue = Object.entries(item || {})[0];
        const field = issue?.[0] || `submission_${index + 1}`;
        const message = Array.isArray(issue?.[1]) ? issue[1].join(', ') : 'unknown error';
        throw new Error(`Judge0 rejected test case ${index + 1}: ${field}: ${message}`);
      }

      return item.token;
    });

    return tokens;
  } catch (error) {
    throw new Error(formatJudge0Error(error, 'Failed to submit code to Judge0'));
  }
}

async function fetchBatchResults(tokens) {
  const params = new URLSearchParams({
    tokens: tokens.join(','),
    base64_encoded: 'false',
    fields: 'stdout,time,memory,stderr,compile_output,message,status',
  });

  try {
    const { data } = await judge0Client.get(`/submissions/batch?${params.toString()}`);
    if (!Array.isArray(data?.submissions)) {
      throw new Error('Judge0 returned an unexpected batch result payload');
    }

    return data.submissions;
  } catch (error) {
    throw new Error(formatJudge0Error(error, 'Failed to read Judge0 batch results'));
  }
}

async function waitForBatchResults(tokens) {
  const deadline = Date.now() + JUDGE0_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const results = await fetchBatchResults(tokens);
    const allCompleted =
      results.length === tokens.length &&
      results.every((result) => result?.status && !isPendingStatus(result.status));

    if (allCompleted) {
      return results;
    }

    await sleep(JUDGE0_POLL_INTERVAL_MS);
  }

  throw new Error(`Judge0 polling timed out after ${JUDGE0_POLL_TIMEOUT_MS}ms`);
}

export const judgeSubmission = async ({
  language,
  sourceCode,
  testCases,
  timeLimitMs = DEFAULT_TIME_LIMIT_MS,
  memoryLimitMb = DEFAULT_MEMORY_LIMIT_MB,
}) => {
  if (!language) throw new Error('language is required');
  if (!sourceCode || typeof sourceCode !== 'string') throw new Error('sourceCode is required');

  const normalizedTestCases = normalizeTestCases(testCases);
  const languageId = await resolveJudge0LanguageId(language);
  const tokens = await createBatchSubmission({
    languageId,
    sourceCode,
    testCases: normalizedTestCases,
    timeLimitMs: parsePositiveNumber(timeLimitMs, DEFAULT_TIME_LIMIT_MS),
    memoryLimitMb: parsePositiveNumber(memoryLimitMb, DEFAULT_MEMORY_LIMIT_MB),
  });
  const rawResults = await waitForBatchResults(tokens);
  const normalizedResults = rawResults.map((result, index) => normalizeJudge0Result(result, index));

  const firstFailureIndex = normalizedResults.findIndex((result) => !result.passed);
  const relevantResults =
    firstFailureIndex === -1
      ? normalizedResults
      : normalizedResults.slice(0, firstFailureIndex + 1);

  return {
    status: firstFailureIndex === -1 ? 'accepted' : normalizedResults[firstFailureIndex].status,
    passed: firstFailureIndex === -1,
    testResults: relevantResults,
    executionTime: relevantResults.reduce((sum, result) => sum + result.time, 0),
    memoryUsed: relevantResults.reduce((max, result) => Math.max(max, result.memory), 0),
  };
};

export const runTestCase = async ({
  language,
  code,
  input = '',
  expectedOutput,
  timeLimitMs = DEFAULT_TIME_LIMIT_MS,
  memoryLimitMb = DEFAULT_MEMORY_LIMIT_MB,
}) => {
  const result = await judgeSubmission({
    language,
    sourceCode: code,
    testCases: [{ input, expectedOutput }],
    timeLimitMs,
    memoryLimitMb,
  });

  const [testCaseResult] = result.testResults;

  return {
    passed: testCaseResult.passed,
    status: testCaseResult.status,
    stdout: testCaseResult.stdout,
    stderr: testCaseResult.stderr,
    time: testCaseResult.time,
    memory: testCaseResult.memory,
  };
};

// Deprecated alias kept so older callers do not break while the service name changes.
export const runOnPiston = judgeSubmission;
