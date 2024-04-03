import { describe, expect, it } from "vitest";
import { monthSummaryReducer } from "../../../../app/api/utils/month.summary.reducer";   
import { Transaction } from "@/app/api/transaction/transaction.server";
import { MonthSummary } from "@/app/api/budget.server";


describe("monthSummaryReducer", () => {
    const createTestTransaction = (date: string, categoryName: string, categoryId: string): Transaction => (
        {
            id: "123",
            date,
            amount: 100,
            categoryName: categoryName,
            categoryId: categoryId,
            accountName: "Checking",
            payeeName: "Walmart",
            memo: "Groceries"
        }
    );
    it("should return an array with a single month summary when given a single transaction", () => {
        const transaction = createTestTransaction("2021-01-01", "Groceries", "123");
        const result = monthSummaryReducer([], transaction);
        expect(result).toEqual([
            {
                month: "2021-01",
                isCurrentMonth: false,
                categoryUsages: [
                    {
                        categoryName: "Groceries",
                        amount: 100,
                        categoryId: "123",
                        transactions: [transaction],
                    },
                ],
                overallTransactions: [transaction],
            },
        ]);
    });
    it("should return an array with a single month summary when given a single transaction for the current month", () => {
        const transaction = createTestTransaction(new Date().toISOString(), "Groceries", "123");
        const result: MonthSummary[] = monthSummaryReducer([], transaction);
        expect(result).toEqual([
            {
                month: new Date().toISOString().substring(0, 7),
                isCurrentMonth: true,
                categoryUsages: [
                    {
                        categoryName: "Groceries",
                        amount: 100,
                        categoryId: "123",
                        transactions: [transaction],
                    },
                ],
                overallTransactions: [transaction],
            },
        ]);
    });
    describe("when an array with month summaries is given", () => {
        const transaction = createTestTransaction(new Date().toISOString(), "Groceries", "123");
        const currentMonth = new Date().toISOString().substring(0, 7);

        const createTestMonthSummaries = (): MonthSummary[] => ([
            {
                month: currentMonth,
                isCurrentMonth: true,
                categoryUsages: [
                    {
                        categoryName: "Groceries",
                        amount: 100,
                        categoryId: "123",
                        transactions: [transaction],
                    },
                ],
                overallTransactions: [transaction],
            }
        ]);

        it('should add the transaction to the existing month summary if months are equal', () => {
            const newTransaction = createTestTransaction(new Date().toISOString(), "Groceries", "123");
            const result = monthSummaryReducer(createTestMonthSummaries(), newTransaction);
            expect(result).toEqual([
                {
                    month: new Date().toISOString().substring(0, 7),
                    isCurrentMonth: true,
                    categoryUsages: [
                        {
                            categoryName: "Groceries",
                            amount: 200,
                            categoryId: "123",
                            transactions: [transaction, newTransaction],
                        },
                    ],
                    overallTransactions: [transaction, newTransaction],
                }
            ]);
        });
        it('should add a new month summary if months are not equal', () => {
            const newTransaction = createTestTransaction("2020-02-01", "Groceries", "123");
            const result = monthSummaryReducer(createTestMonthSummaries(), newTransaction);
            expect(result).toEqual([
                {
                    month: new Date().toISOString().substring(0, 7),
                    isCurrentMonth: true,
                    categoryUsages: [
                        {
                            categoryName: "Groceries",
                            amount: 100,
                            categoryId: "123",
                            transactions: [transaction],
                        },
                    ],
                    overallTransactions: [transaction],
                },
                {
                    month: "2020-02",
                    isCurrentMonth: false,
                    categoryUsages: [
                        {
                            categoryName: "Groceries",
                            amount: 100,
                            categoryId: "123",
                            transactions: [newTransaction],
                        },
                    ],
                    overallTransactions: [newTransaction],
                }
            ]);
        });
    });
});