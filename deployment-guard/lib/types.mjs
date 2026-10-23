/** @typedef {"PASS" | "FAIL" | "WARN" | "SKIP"} CheckStatus */

/**
 * @typedef {Object} CheckResult
 * @property {string} id
 * @property {string} category
 * @property {string} name
 * @property {CheckStatus} status
 * @property {string} message
 * @property {boolean} blocking
 */

/**
 * @typedef {Object} DeploymentReport
 * @property {"PASS" | "FAIL"} buildStatus
 * @property {string[]} failedChecks
 * @property {string[]} warnings
 * @property {number} performanceScore
 * @property {number} aiReliabilityScore
 * @property {number} uiStabilityScore
 * @property {number} passedCount
 * @property {number} failedCount
 * @property {number} warningCount
 * @property {string} target
 * @property {number} durationMs
 * @property {CheckResult[]} checks
 */

export {};
