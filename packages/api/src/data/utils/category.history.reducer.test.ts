import { Transaction } from "common-ts";
import { CategoryHistoryForInsert } from "../category/category.server";
import { CategoryHistoryReducer } from "./category.history.reducer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("CategoryHistoryReducer", () => {
  it("should update existing category history if it exists", () => {
    // Arrange
    const categoryHistories: Array<CategoryHistoryForInsert> = [
      {
        categoryId: "1",
        month: "2021-01",
        activity: -500,
        startDateOfMonth: new Date("2021-01-01"),
      },
      {
        categoryId: "2",
        month: "2021-01",
        activity: -300,
        startDateOfMonth: new Date("2021-01-01"),
      },
    ];
    const transaction: any = {
      categoryId: "1",
      date: "2021-01-15",
      amount: -200,
    };

    // Act
    const result = CategoryHistoryReducer(categoryHistories, transaction);

    // Assert
    expect(result).toEqual([
      {
        categoryId: "1",
        month: "2021-01",
        activity: -700,
        startDateOfMonth: new Date("2021-01-01"),
      },
      {
        categoryId: "2",
        month: "2021-01",
        activity: -300,
        startDateOfMonth: new Date("2021-01-01"),
      },
    ]);
  });

  it("should add new category history if it doesn't exist", () => {
    // Arrange
    const categoryHistories: Array<CategoryHistoryForInsert> = [
      {
        categoryId: "1",
        month: "2021-01",
        activity: -500,
        startDateOfMonth: new Date("2021-01-01"),
      },
    ];
    const transaction: any = {
      categoryId: "2",
      date: "2021-01-15",
      amount: -200,
    };

    // Act
    const result = CategoryHistoryReducer(categoryHistories, transaction);

    // Assert
    expect(result).toEqual([
      {
        categoryId: "1",
        month: "2021-01",
        activity: -500,
        startDateOfMonth: new Date("2021-01-01"),
      },
      {
        categoryId: "2",
        month: "2021-01",
        activity: -200,
        startDateOfMonth: new Date("2021-01-01"),
      },
    ]);
  });
});
