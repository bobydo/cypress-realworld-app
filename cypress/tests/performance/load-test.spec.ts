import http from "k6/http";
import { check, sleep } from "k6";

// Target: backend API on port 3001
const BASE_URL = "http://localhost:3001";

export const options = {
  stages: [
    { duration: "10s", target: 20 },  // ramp up to 20 users
    { duration: "30s", target: 20 },  // hold 20 users for 30s
    { duration: "10s", target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must finish within 500ms
    http_req_failed: ["rate<0.01"],   // less than 1% of requests can fail
  },
};

export default function () {
  // /testData/* is mounted before auth middleware (app.ts:73) — no token needed
  // Original calls (require auth token → 401 Unauthorized without login):
  //   http.get(`${BASE_URL}/transactions`)
  //   http.get(`${BASE_URL}/users`)

  // Test 1: GET /testData/transactions
  const transactions = http.get(`${BASE_URL}/testData/transactions`);
  check(transactions, {
    "transactions status 200": (r) => r.status === 200,
    "transactions < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: GET /testData/users
  const users = http.get(`${BASE_URL}/testData/users`);
  check(users, {
    "users status 200": (r) => r.status === 200,
    "users < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
