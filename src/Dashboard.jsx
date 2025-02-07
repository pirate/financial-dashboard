// src/Dashboard.jsx
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// This dashboard shows fixed inputs (for reference), adjustable inputs, a form to add extra monthly credits/debits,
// and two simulation charts: one for cash flow & investment growth, and one for mortgage amortization.
const Dashboard = () => {
  // ─── FIXED INPUTS (for reference/display) ───────────────────────────────
  const mortgagePaymentPerMonth = 4042; // P+I on 30‑yr $555,000 at 6.825%
  const propertyTaxPerMonth = 708;
  const insurancePerMonth = 188;
  const utilitiesPerMonth = 300;
  // (These add up to $5,238/mo for home ownership.)
  const totalOwningCostPerMonth = 5238;
  // (For this dashboard we ignore renting.)
  // Other fixed tax/penalty constants:
  const capitalGainsTaxRate = 0.238; // 23.8% (2024 CA state + federal rates)
  const rothIRAWithdrawalPenalty = 0.16; // 16%

  // ─── ADJUSTABLE INPUTS ─────────────────────────────────────────────────
  const [brokerageA_EarningsAPR, setBrokerageA_EarningsAPR] = useState(9); // %
  const [brokerageB_EarningsAPR, setBrokerageB_EarningsAPR] = useState(12); // %
  const [husbandIncome, setHusbandIncome] = useState(150000); // yearly post‑tax
  const [wifeIncome, setWifeIncome] = useState(100000); // yearly post‑tax

  // ─── NEW: EXTRA MORTGAGE PAYMENT SLIDER ───────────────────────────────────
  // This slider represents the extra payment (as a % of the required mortgage payment).
  // For example, 0 means no extra payment (i.e. pay the regular mortgagePaymentPerMonth),
  // and 1000 means paying an extra amount equal to 10× the required payment
  // (so total = mortgagePaymentPerMonth + mortgagePaymentPerMonth*10 = 11× mortgagePaymentPerMonth).
  const [mortgageExtraPaymentPct, setMortgageExtraPaymentPct] = useState(0);

  // ─── EXTRA REPEATING MONTHLY CREDITS/DEBITS ─────────────────────────────
  const [extraEntries, setExtraEntries] = useState([]);
  const [newEntryDescription, setNewEntryDescription] = useState("");
  const [newEntryAmount, setNewEntryAmount] = useState(0);

  const handleAddEntry = (e) => {
    e.preventDefault();
    if (newEntryDescription.trim() === "") return;
    setExtraEntries([
      ...extraEntries,
      { description: newEntryDescription, amount: parseFloat(newEntryAmount) },
    ]);
    setNewEntryDescription("");
    setNewEntryAmount(0);
  };

  // ─── SIMULATION SETTINGS ────────────────────────────────────────────────
  const simulationYears = 30;
  const simulationMonths = simulationYears * 12; // e.g. 360 months

  // The simulation will calculate, for each month:
  // - Cumulative W2 income (base income from husband + wife)
  // - Cumulative housing cost (mortgage payment + other home‐ownership expenses)
  // - Net monthly cash flow (income minus housing cost)
  // - Cumulative net cash (the sum of net monthly cash flow)
  // - Brokerage account balances (with contributions from any surplus cash flow)
  // - Mortgage amortization details: remaining balance, cumulative interest, and cumulative principal
  const [simulationData, setSimulationData] = useState([]);
  const [timeRange, setTimeRange] = useState([0, simulationMonths]);

  useEffect(() => {
    // Convert APR percentages to decimals and then monthly factors.
    const rateA = brokerageA_EarningsAPR / 100;
    const rateB = brokerageB_EarningsAPR / 100;
    const monthlyFactorA = Math.pow(1 + rateA, 1 / 12) - 1;
    const monthlyFactorB = Math.pow(1 + rateB, 1 / 12) - 1;

    // Monthly base income (assumed constant).
    const husbandMonthly = husbandIncome / 12;
    const wifeMonthly = wifeIncome / 12;
    const baseIncome = husbandMonthly + wifeMonthly;
    const extraMonthlyTotal = extraEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );
    // For our purposes we assume an "owning" scenario.
    // Note: totalOwningCostPerMonth includes the required mortgage payment plus property tax, insurance, and utilities.
    // Here, we separate out the non‑mortgage portion:
    const nonMortgageCost = totalOwningCostPerMonth - mortgagePaymentPerMonth;

    // Mortgage details (for a 30‑year fixed-rate mortgage on \$555,000 at 6.825%)
    const mortgagePrincipal = 555000;
    const monthlyMortgageRate = 0.06825 / 12;

    // Initialize simulation variables:
    let cumulativeW2Income = 0;
    let cumulativeHousingCost = 0;
    let cumulativeCash = 0; // net income after housing expenses
    let accountA = 100000; // Starting balance in Brokerage Account A.
    let accountB = 287280; // Starting balance in Brokerage Account B.
    let remainingMortgageBalance = mortgagePrincipal;
    let cumulativeMortgageInterest = 0;
    let cumulativeMortgagePrincipal = 0;

    const data = [];
    // Push initial state at month 0.
    data.push({
      month: 0,
      cumulativeW2Income: 0,
      cumulativeHousingCost: 0,
      cumulativeCash: 0,
      accountA,
      accountB,
      totalBrokerage: accountA + accountB,
      totalNetWorth: accountA + accountB,
      remainingMortgageBalance,
      cumulativeMortgageInterest: 0,
      cumulativeMortgagePrincipal: 0,
      netMonthlyCashFlow: 0,
    });

    // Loop from month 1 up to simulationMonths.
    for (let month = 1; month <= simulationMonths; month++) {
      // Update cumulative income.
      cumulativeW2Income += baseIncome;

      // Determine the extra payment (if the mortgage is still active).
      let extraPayment = 0;
      let effectiveMortgagePayment = 0;
      let interestPayment = 0;
      let principalPayment = 0;

      if (remainingMortgageBalance > 0) {
        // Extra amount (per month) equals the required payment multiplied by the extra percentage.
        extraPayment = mortgagePaymentPerMonth * (mortgageExtraPaymentPct / 100);
        // Total (effective) mortgage payment for this month.
        effectiveMortgagePayment = mortgagePaymentPerMonth + extraPayment;

        // Mortgage amortization calculation:
        interestPayment = remainingMortgageBalance * monthlyMortgageRate;
        principalPayment = effectiveMortgagePayment - interestPayment;
        // In case the final payment would overpay the remaining balance:
        if (principalPayment > remainingMortgageBalance) {
          principalPayment = remainingMortgageBalance;
          // Adjust the effective payment to the actual amount paid.
          effectiveMortgagePayment = interestPayment + principalPayment;
        }
        remainingMortgageBalance -= principalPayment;
        cumulativeMortgageInterest += interestPayment;
        cumulativeMortgagePrincipal += principalPayment;
      } else {
        // Mortgage is already paid off.
        extraPayment = 0;
        effectiveMortgagePayment = 0;
      }

      // Total monthly housing cost:
      // If the mortgage is still active, you pay non‑mortgage costs plus the effective mortgage payment.
      // Once paid off, you only pay the non‑mortgage costs.
      const totalMonthlyHousingCost =
        remainingMortgageBalance > 0
          ? nonMortgageCost + effectiveMortgagePayment
          : nonMortgageCost;
      cumulativeHousingCost += totalMonthlyHousingCost;

      // Compute net monthly cash flow.
      // (Extra mortgage payments reduce available cash flow because they are paid out-of‐pocket.)
      const netMonthlyCashFlow =
        baseIncome + extraMonthlyTotal - totalMonthlyHousingCost;
      cumulativeCash += netMonthlyCashFlow;

      // If there is surplus cash, invest it equally into the two brokerage accounts.
      const contributionA = netMonthlyCashFlow > 0 ? netMonthlyCashFlow / 2 : 0;
      const contributionB = netMonthlyCashFlow > 0 ? netMonthlyCashFlow / 2 : 0;
      accountA = accountA * (1 + monthlyFactorA) + contributionA;
      accountB = accountB * (1 + monthlyFactorB) + contributionB;

      const totalBrokerage = accountA + accountB;
      const totalNetWorth = totalBrokerage + cumulativeCash;

      data.push({
        month,
        cumulativeW2Income,
        cumulativeHousingCost,
        cumulativeCash,
        accountA,
        accountB,
        totalBrokerage,
        totalNetWorth,
        remainingMortgageBalance: remainingMortgageBalance > 0 ? remainingMortgageBalance : 0,
        cumulativeMortgageInterest,
        cumulativeMortgagePrincipal,
        netMonthlyCashFlow,
      });
    }
    setSimulationData(data);
  }, [
    brokerageA_EarningsAPR,
    brokerageB_EarningsAPR,
    husbandIncome,
    wifeIncome,
    extraEntries,
    simulationMonths,
    mortgageExtraPaymentPct,
  ]);

  // Helper to format month as YYYY-MM (simulation starts in 2025)
  const formatMonth = (month) => {
    const year = Math.floor(month / 12) + 2025;
    const m = (month % 12) + 1;
    return `${year}-${m < 10 ? "0" + m : m}`;
  };

  // Helper to format currency.
  const formatCurrency = (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Filter simulation data based on the time range slider.
  const filteredData = simulationData.filter(
    (d) => d.month >= timeRange[0] && d.month <= timeRange[1]
  );

  return (
    <div style={{ padding: "20px" }}>
      <h1>Financial Model Dashboard</h1>

      {/* Main grid layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Left column - Inputs */}
        <div>
          {/* Fixed Inputs */}
          <section>
            <h2>Fixed Inputs (For Reference)</h2>
            <ul>
              <li>
                <strong>Mortgage Payment (P+I):</strong> $
                {formatCurrency(mortgagePaymentPerMonth)}/mo
              </li>
              <li>
                <strong>Property Tax:</strong> $
                {formatCurrency(propertyTaxPerMonth)}/mo
              </li>
              <li>
                <strong>Insurance:</strong> $
                {formatCurrency(insurancePerMonth)}/mo
              </li>
              <li>
                <strong>Utilities:</strong> $
                {formatCurrency(utilitiesPerMonth)}/mo
              </li>
              <li>
                <strong>Total Cost of Home Ownership:</strong> $
                {formatCurrency(totalOwningCostPerMonth)}/mo
              </li>
              <li>
                <strong>Capital Gains Tax Rate (2024 CA):</strong>{" "}
                {capitalGainsTaxRate * 100}%
              </li>
              <li>
                <strong>Roth IRA Early Withdrawal Penalty:</strong>{" "}
                {rothIRAWithdrawalPenalty * 100}%
              </li>
            </ul>
          </section>

          {/* Adjustable Inputs */}
          <section>
            <h2>Adjustable Inputs</h2>
            <div>
              <label>
                Brokerage Account A Earnings APR (%):{" "}
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={brokerageA_EarningsAPR}
                  onChange={(e) =>
                    setBrokerageA_EarningsAPR(parseFloat(e.target.value))
                  }
                />{" "}
                <span>{brokerageA_EarningsAPR}%</span>
              </label>
            </div>
            <div>
              <label>
                Brokerage Account B Earnings APR (%):{" "}
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={brokerageB_EarningsAPR}
                  onChange={(e) =>
                    setBrokerageB_EarningsAPR(parseFloat(e.target.value))
                  }
                />{" "}
                <span>{brokerageB_EarningsAPR}%</span>
              </label>
            </div>
            <div>
              <label>
                Husband Yearly Post‑Tax Income ($):{" "}
                <input
                  type="range"
                  min="0"
                  max="350000"
                  step="1000"
                  value={husbandIncome}
                  onChange={(e) =>
                    setHusbandIncome(parseFloat(e.target.value))
                  }
                />{" "}
                <span>${formatCurrency(husbandIncome)}</span>
              </label>
            </div>
            <div>
              <label>
                Wife Yearly Post‑Tax Income ($):{" "}
                <input
                  type="range"
                  min="0"
                  max="350000"
                  step="1000"
                  value={wifeIncome}
                  onChange={(e) => setWifeIncome(parseFloat(e.target.value))}
                />{" "}
                <span>${formatCurrency(wifeIncome)}</span>
              </label>
            </div>
            {/* New: Mortgage Extra Payment Slider */}
            <div>
              <label>
                Extra Mortgage Payment (% of required payment):{" "}
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="1"
                  value={mortgageExtraPaymentPct}
                  onChange={(e) =>
                    setMortgageExtraPaymentPct(parseFloat(e.target.value))
                  }
                />{" "}
                <span>{mortgageExtraPaymentPct}%</span>
              </label>
              <p>
                Total Monthly Mortgage Payment: $
                {formatCurrency(
                  mortgagePaymentPerMonth * (1 + mortgageExtraPaymentPct / 100)
                )}
              </p>
            </div>
          </section>

          {/* Extra Monthly Credits/Debits */}
          <section>
            <h2>Extra Monthly Credits/Debits</h2>
            <form onSubmit={handleAddEntry}>
              <label>
                Description:{" "}
                <input
                  type="text"
                  value={newEntryDescription}
                  onChange={(e) => setNewEntryDescription(e.target.value)}
                  placeholder="e.g., Groceries, Childcare, Consulting"
                />
              </label>{" "}
              <label>
                Amount per month ($):{" "}
                <input
                  type="number"
                  value={newEntryAmount}
                  onChange={(e) => setNewEntryAmount(e.target.value)}
                  placeholder="e.g., -600 or +8000"
                />
              </label>{" "}
              <button type="submit">Add Entry</button>
            </form>
            {extraEntries.length > 0 && (
              <ul>
                {extraEntries.map((entry, index) => (
                  <li key={index}>
                    {entry.description}: {entry.amount >= 0 ? "+" : ""}
                    {entry.amount} per month
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column - Charts and Time Controls */}
        <div style={{ position: "sticky", top: "20px" }}>
          {/* Time Range Slider */}
          <section>
            <h2>Simulation Time Range (in Months)</h2>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
              }}
            >
              <label>
                Start Month:{" "}
                <input
                  type="range"
                  min={0}
                  max={simulationMonths}
                  value={timeRange[0]}
                  onChange={(e) =>
                    setTimeRange([parseInt(e.target.value), timeRange[1]])
                  }
                />
                <span>{timeRange[0]}</span>
              </label>
              <label>
                End Month:{" "}
                <input
                  type="range"
                  min={0}
                  max={simulationMonths}
                  value={timeRange[1]}
                  onChange={(e) =>
                    setTimeRange([timeRange[0], parseInt(e.target.value)])
                  }
                />
                <span>{timeRange[1]}</span>
              </label>
            </div>
            <p>
              Displaying data from Month {timeRange[0]} (
              {formatMonth(timeRange[0])}) to Month {timeRange[1]} (
              {formatMonth(timeRange[1])})
            </p>
          </section>

          {/* Chart 1: Cash Flow & Investments */}
          <section>
            <h2>Cash Flow & Investments</h2>
            <p>
              This chart compares your cumulative W2 income, the total housing
              cost paid, your net (post‑housing) cash accumulation, and the
              growth of your brokerage accounts.
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(month) => formatMonth(month)}
                />
                <YAxis />
                <Tooltip labelFormatter={(label) => `Month: ${formatMonth(label)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulativeW2Income"
                  stroke="#00a65a"
                  name="Cumulative W2 Income"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeHousingCost"
                  stroke="#dd4b39"
                  name="Cumulative Housing Cost"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeCash"
                  stroke="#f39c12"
                  name="Cumulative Net Cash"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalBrokerage"
                  stroke="#0073b7"
                  name="Total Brokerage Value"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="totalNetWorth"
                  stroke="#605ca8"
                  name="Total Net Worth"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Chart 2: Mortgage Amortization */}
          <section>
            <h2>Mortgage Amortization</h2>
            <p>
              This chart shows the decline in your mortgage balance as well as
              the cumulative interest and principal paid over time.
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <XAxis
                  dataKey="month"
                  tickFormatter={(month) => formatMonth(month)}
                />
                <YAxis />
                <Tooltip labelFormatter={(label) => `Month: ${formatMonth(label)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="remainingMortgageBalance"
                  stroke="#3c8dbc"
                  name="Remaining Mortgage Balance"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeMortgageInterest"
                  stroke="#00c0ef"
                  name="Cumulative Mortgage Interest"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeMortgagePrincipal"
                  stroke="#605ca8"
                  name="Cumulative Mortgage Principal"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* Current Balances Display */}
          <section>
            <h2>Current Balances (at end of selected period)</h2>
            {filteredData.length > 0 && (
              <div>
                <p>
                  Month:{" "}
                  {formatMonth(
                    filteredData[filteredData.length - 1].month
                  )}
                </p>
                <p>
                  Brokerage Account A: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].accountA
                  )}
                </p>
                <p>
                  Brokerage Account B: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].accountB
                  )}
                </p>
                <p>
                  Total Brokerage Value: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].totalBrokerage
                  )}
                </p>
                <p>
                  Total Net Worth: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].totalNetWorth
                  )}
                </p>
                <p>
                  Cumulative W2 Income: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].cumulativeW2Income
                  )}
                </p>
                <p>
                  Cumulative Housing Cost: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].cumulativeHousingCost
                  )}
                </p>
                <p>
                  Remaining Mortgage Balance: $
                  {formatCurrency(
                    filteredData[filteredData.length - 1].remainingMortgageBalance
                  )}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
