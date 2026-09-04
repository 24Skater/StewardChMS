import { enterOrg } from '../lib/org-context.js'
import { TEST_ORG_ID } from './org.js'

/**
 * Puts every test file inside the test church.
 *
 * Suites reach for the database directly — to plant a fixture, to assert on a
 * row, to clean up afterwards — and those calls are not requests, so nothing
 * has resolved an organization for them. Without this each suite would have to
 * wrap every such call, and the one that got missed would surface as a tenancy
 * error inside an unrelated assertion.
 *
 * Requests made through supertest still resolve their own organization the
 * normal way; this covers only the test's own direct calls.
 */
enterOrg({ orgId: TEST_ORG_ID, slug: 'test' })
