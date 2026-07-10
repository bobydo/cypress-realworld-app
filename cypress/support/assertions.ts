import { isEqual } from "lodash/fp";
import { Transaction } from "../../src/models";

// Verifies a transaction belongs to the given user as sender or receiver.
// Usage: expect(response.body.results[0]).to.satisfy(isSenderOrReceiver(userId));
export const isSenderOrReceiver =
  (userId: string) =>
  ({ senderId, receiverId }: Transaction) =>
    isEqual(senderId, userId) || isEqual(receiverId, userId);

// Verifies a value is a non-empty string.
// Usage: expect(response.body.token).to.satisfy(isNonEmptyString);
export const isNonEmptyString = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

// Verifies a value is a positive number.
// Usage: expect(transaction.amount).to.satisfy(isPositiveAmount);
export const isPositiveAmount = (value: unknown): boolean =>
  typeof value === "number" && value > 0;

// Verifies a date string is a valid ISO 8601 date.
// Usage: expect(response.body.createdAt).to.satisfy(isValidDate);
export const isValidDate = (value: unknown): boolean =>
  typeof value === "string" && !isNaN(Date.parse(value));
