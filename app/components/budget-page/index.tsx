import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "../Loading";
import {
  getCategories,
  getMonthSummaries,
  getTransactions,
} from "@/app/api/budget.server";
import MonthSummaryBlock from "./month-summary-block";

export default function BudgetPage({ budgetId }: { budgetId: string }) {
  return (
    <>
      <div className="relative p-10">
        <Suspense fallback={<Loading />}>
          <BudgetInfo budgetId={budgetId} />
        </Suspense>
      </div>
    </>
  );
}

async function BudgetInfo({ budgetId }: { budgetId: string }) {
  const monthSummaries = await getMonthSummaries(budgetId);
  //const aiResponse = await getAIAnalysis(monthSummaries);
  const aiResponse = { response: "AI response" };
  const categories = await getCategories(budgetId);

  return (
    <>
      <h1>Month overview</h1>
      <div className="chat chat-start">
        <div className="chat-bubble">{aiResponse.response}</div>
      </div>
      <div className="mb-4 -mx-2">
        {monthSummaries
          .filter((month) => month.isCurrentMonth)
          .map((month) => (
            <MonthSummaryBlock
              month={month}
              categories={categories}
              key={month.month}
            />
          ))}
      </div>
      <div className="flex flex-wrap mb-4 -mx-2">
        {monthSummaries
          .filter((month) => !month.isCurrentMonth)
          .map((month) => (
            <MonthSummaryBlock
              month={month}
              categories={categories}
              key={month.month}
              hideBalance
            />
          ))}
      </div>
    </>
  );
}
