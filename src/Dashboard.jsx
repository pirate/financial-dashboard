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

const Dashboard = () => {
  // ─── MORTGAGE PARAMETERS (New Fields) ─────────────────────────────
  const [mortgagePrincipal, setMortgagePrincipal] = useState(555000);
  const [mortgageInterestRate, setMortgageInterestRate] = useState(6.825); // Annual, in %
  const [mortgageTermYears, setMortgageTermYears] = useState(30);

  // Other home‑ownership expenses.
  const [propertyTaxPerMonth, setPropertyTaxPerMonth] = useState(708);
  const [insurancePerMonth, setInsurancePerMonth] = useState(188);
  const [utilitiesPerMonth, setUtilitiesPerMonth] = useState(300);

  // Capital Gains Tax Rate (used on taxable brokerage account returns)
  const [capitalGainsTaxRate, setCapitalGainsTaxRate] = useState(0.238);

  // Extra mortgage payment slider (as a % of the computed base payment)
  // For example, 0 means no extra payment, 100 means an extra payment equal to the base payment.
  const [mortgageExtraPaymentPct, setMortgageExtraPaymentPct] = useState(0);

  // ─── ADJUSTABLE INPUTS ───────────────────────────────────────────────
  const [brokerageA_EarningsAPR, setBrokerageA_EarningsAPR] = useState(1); // %
  const [brokerageB_EarningsAPR, setBrokerageB_EarningsAPR] = useState(3); // %
  const [brokerageA_StartingBalance, setBrokerageA_StartingBalance] = useState(100000);
  const [brokerageB_StartingBalance, setBrokerageB_StartingBalance] = useState(287280);
  const [brokerageAccountsAreTaxable, setBrokerageAccountsAreTaxable] = useState(true);

  const [husbandIncome, setHusbandIncome] = useState(100000); // Yearly post‑tax
  const [wifeIncome, setWifeIncome] = useState(50000); // Yearly post‑tax

  // Simulation period (in years)
  const [simulationYears, setSimulationYears] = useState(30);

  // ─── EXTRA REPEATING MONTHLY CREDITS/DEBITS ─────────────────────────────
  const [extraEntries, setExtraEntries] = useState([
    { description: "Groceries", amount: -600 },
    { description: "Random Bills", amount: -500 },
    { description: "Shopping", amount: -400 },
    { description: "Childcare", amount: -900 },
    { description: "1099 consulting", amount: 200 },
  ]);
  const [newEntryDescription, setNewEntryDescription] = useState("");
  const [newEntryAmount, setNewEntryAmount] = useState(0);

  // For editing extra entries
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [editingAmount, setEditingAmount] = useState(0);

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

  const handleEditStart = (index) => {
    setEditingIndex(index);
    setEditingDescription(extraEntries[index].description);
    setEditingAmount(extraEntries[index].amount);
  };

  const handleEditSave = (index) => {
    const updatedEntries = [...extraEntries];
    updatedEntries[index] = {
      description: editingDescription,
      amount: parseFloat(editingAmount),
    };
    setExtraEntries(updatedEntries);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    setExtraEntries(extraEntries.filter((_, i) => i !== index));
  };

  // ─── SIMULATION SETTINGS ─────────────────────────────────────────────
  const simulationMonths = simulationYears * 12;

  // The simulation will calculate, for each month:
  // - Cumulative income (W2 wages)
  // - Cumulative housing costs
  // - Net monthly cash flow and cumulative net cash
  // - Brokerage account balances (and total brokerage, net worth)
  // - Mortgage amortization details (remaining balance, cumulative interest & principal)
  const [simulationData, setSimulationData] = useState([]);
  const [timeRange, setTimeRange] = useState([0, simulationMonths]);

  useEffect(() => {
    // ─── CALCULATE BASE MORTGAGE PAYMENT ──────────────────────────────
    // Mortgage Payment Formula:
    //   Payment = P * r / (1 - (1 + r)^(-n))
    // where:
    //   P = mortgagePrincipal,
    //   r = monthly interest rate = (mortgageInterestRate/100)/12,
    //   n = mortgageTermYears * 12.
    const monthlyMortgageRate = (mortgageInterestRate / 100) / 12;
    const mortgageTermMonths = mortgageTermYears * 12;
    const computedMortgagePayment =
      mortgagePrincipal *
      monthlyMortgageRate /
      (1 - Math.pow(1 + monthlyMortgageRate, -mortgageTermMonths));

    // Extra Payment based on slider:
    //   Extra Payment = computedMortgagePayment * (mortgageExtraPaymentPct / 100)
    //   Effective Mortgage Payment = computedMortgagePayment + Extra Payment
    const extraPaymentAmount = computedMortgagePayment * (mortgageExtraPaymentPct / 100);
    const baseEffectiveMortgagePayment = computedMortgagePayment + extraPaymentAmount;

    // Other recurring home‑ownership costs (excluding mortgage principal & interest)
    const nonMortgageCost = propertyTaxPerMonth + insurancePerMonth + utilitiesPerMonth;

    // ─── INVESTMENT RETURN CALCULATIONS ──────────────────────────────
    // For each brokerage account, we compute the monthly return from the APR.
    //   monthlyFactor = (1 + APR/100)^(1/12) - 1
    // If the account is taxable, we assume gains are taxed each month:
    //   effectiveMonthlyFactor = monthlyFactor * (1 - capitalGainsTaxRate)
    const rateA = brokerageA_EarningsAPR / 100;
    const rateB = brokerageB_EarningsAPR / 100;
    const monthlyFactorA = Math.pow(1 + rateA, 1 / 12) - 1;
    const monthlyFactorB = Math.pow(1 + rateB, 1 / 12) - 1;
    const effectiveMonthlyFactorA = brokerageAccountsAreTaxable
      ? monthlyFactorA * (1 - capitalGainsTaxRate)
      : monthlyFactorA;
    const effectiveMonthlyFactorB = brokerageAccountsAreTaxable
      ? monthlyFactorB * (1 - capitalGainsTaxRate)
      : monthlyFactorB;

    // ─── BASE INCOME AND EXTRA ENTRIES ──────────────────────────────
    const husbandMonthly = husbandIncome / 12;
    const wifeMonthly = wifeIncome / 12;
    const baseIncome = husbandMonthly + wifeMonthly;
    const extraMonthlyTotal = extraEntries.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );

    // ─── INITIALIZE SIMULATION VARIABLES ─────────────────────────────
    let cumulativeW2Income = 0;
    let cumulativeHousingCost = 0;
    let cumulativeCash = 0;
    let accountA = brokerageA_StartingBalance;
    let accountB = brokerageB_StartingBalance;
    let remainingMortgageBalance = mortgagePrincipal;
    let cumulativeMortgageInterest = 0;
    let cumulativeMortgagePrincipal = 0;

    const data = [];
    // Month 0 initial state.
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

    // ─── SIMULATION LOOP ─────────────────────────────────────────────
    for (let month = 1; month <= simulationMonths; month++) {
      // Update income.
      cumulativeW2Income += baseIncome;

      // Mortgage calculations only if balance remains.
      let effectiveMortgagePayment = 0;
      let interestPayment = 0;
      let principalPayment = 0;
      let extraPayment = 0;
      if (remainingMortgageBalance > 0) {
        // For each month, the effective mortgage payment is the computed base (with extra)
        // However, if the remaining balance is low, we adjust the final payment.
        extraPayment = computedMortgagePayment * (mortgageExtraPaymentPct / 100);
        effectiveMortgagePayment = computedMortgagePayment + extraPayment;
        interestPayment = remainingMortgageBalance * monthlyMortgageRate;
        principalPayment = effectiveMortgagePayment - interestPayment;
        if (principalPayment > remainingMortgageBalance) {
          principalPayment = remainingMortgageBalance;
          effectiveMortgagePayment = interestPayment + principalPayment;
        }
        remainingMortgageBalance -= principalPayment;
        cumulativeMortgageInterest += interestPayment;
        cumulativeMortgagePrincipal += principalPayment;
      }

      // Total housing cost for the month:
      //   If mortgage active: nonMortgageCost + effectiveMortgagePayment,
      //   Else: just nonMortgageCost.
      const totalMonthlyHousingCost =
        remainingMortgageBalance > 0 ? nonMortgageCost + effectiveMortgagePayment : nonMortgageCost;
      cumulativeHousingCost += totalMonthlyHousingCost;

      // Net Monthly Cash Flow:
      //   Net Cash Flow = (Base Income + Extra Monthly Entries) - Total Monthly Housing Cost
      const netMonthlyCashFlow = baseIncome + extraMonthlyTotal - totalMonthlyHousingCost;
      cumulativeCash += netMonthlyCashFlow;

      // Investment contributions only when there is surplus cash.
      const contributionA = netMonthlyCashFlow > 0 ? netMonthlyCashFlow / 2 : 0;
      const contributionB = netMonthlyCashFlow > 0 ? netMonthlyCashFlow / 2 : 0;

      // Brokerage accounts update:
      accountA = accountA * (1 + effectiveMonthlyFactorA) + contributionA;
      accountB = accountB * (1 + effectiveMonthlyFactorB) + contributionB;

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
    mortgageExtraPaymentPct,
    brokerageA_StartingBalance,
    brokerageB_StartingBalance,
    mortgagePrincipal,
    mortgageInterestRate,
    mortgageTermYears,
    propertyTaxPerMonth,
    insurancePerMonth,
    utilitiesPerMonth,
    brokerageAccountsAreTaxable,
    capitalGainsTaxRate,
    simulationYears,
  ]);

  // ─── HELPERS FOR FORMATTING ─────────────────────────────────────────────
  const formatMonth = (month) => {
    const year = Math.floor(month / 12) + 2025;
    const m = (month % 12) + 1;
    return `${year}-${m < 10 ? "0" + m : m}`;
  };

  const formatCurrency = (amount) => {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Filter simulation data based on selected time range.
  const filteredData = simulationData.filter(
    (d) => d.month >= timeRange[0] && d.month <= timeRange[1]
  );

  // ─── COMPUTED VALUES FOR DISPLAY ─────────────────────────────────────
  // Recalculate computedMortgagePayment to show in the UI.
  const monthlyMortgageRateForDisplay = (mortgageInterestRate / 100) / 12;
  const mortgageTermMonths = mortgageTermYears * 12;
  const computedMortgagePayment =
    mortgagePrincipal *
    monthlyMortgageRateForDisplay /
    (1 - Math.pow(1 + monthlyMortgageRateForDisplay, -mortgageTermMonths));
  const extraPaymentAmountDisplay = computedMortgagePayment * (mortgageExtraPaymentPct / 100);
  const effectiveMortgagePaymentDisplay = computedMortgagePayment + extraPaymentAmountDisplay;
  const totalOwningCostPerMonth = effectiveMortgagePaymentDisplay + propertyTaxPerMonth + insurancePerMonth + utilitiesPerMonth;

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
          {/* ─── Mortgage Parameters ───────────────────────────── */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Mortgage Parameters</h2>
            <div>
              <label>
                Mortgage Principal: $
                <input
                  type="number"
                  value={mortgagePrincipal}
                  onChange={(e) => setMortgagePrincipal(parseFloat(e.target.value))}
                  step="1000"
                />
              </label>
            </div>
            <div>
              <label>
                Annual Mortgage Interest Rate (%):{" "}
                <input
                  type="number"
                  value={mortgageInterestRate}
                  onChange={(e) => setMortgageInterestRate(parseFloat(e.target.value))}
                  step="0.1"
                />
              </label>
            </div>
            <div>
              <label>
                Mortgage Term (Years):{" "}
                <input
                  type="number"
                  value={mortgageTermYears}
                  onChange={(e) => setMortgageTermYears(parseInt(e.target.value))}
                  step="1"
                />
              </label>
            </div>
            <div>
              <strong>
                Computed Monthly Mortgage Payment: ${formatCurrency(computedMortgagePayment)}
              </strong>
            </div>
            <div>
              <label>
                Extra Mortgage Payment (% of computed payment):{" "}
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
                Extra Payment: ${formatCurrency(extraPaymentAmountDisplay)} <br />
                Effective Mortgage Payment (Base + Extra): ${formatCurrency(effectiveMortgagePaymentDisplay)}
              </p>
            </div>
            <div>
              <strong>
                Total Owning Cost (Mortgage + Taxes/Insurance/Utilities): ${formatCurrency(totalOwningCostPerMonth)}/mo
              </strong>
            </div>
          </section>

          {/* ─── Other Home‑Ownership Expenses (already included above) ───── */}
          {/* These inputs (Property Tax, Insurance, Utilities) remain unchanged */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Other Home‑Ownership Expenses</h2>
            <div>
              <label>
                Property Tax (per month): $
                <input
                  type="number"
                  value={propertyTaxPerMonth}
                  onChange={(e) => setPropertyTaxPerMonth(parseFloat(e.target.value))}
                  step="1"
                />
              </label>
            </div>
            <div>
              <label>
                Insurance (per month): $
                <input
                  type="number"
                  value={insurancePerMonth}
                  onChange={(e) => setInsurancePerMonth(parseFloat(e.target.value))}
                  step="1"
                />
              </label>
            </div>
            <div>
              <label>
                Utilities (per month): $
                <input
                  type="number"
                  value={utilitiesPerMonth}
                  onChange={(e) => setUtilitiesPerMonth(parseFloat(e.target.value))}
                  step="1"
                />
              </label>
            </div>
          </section>

          {/* ─── Adjustable Inputs for Investments & Income ───────── */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Investment & Income Inputs</h2>
            <div>
              <label>
                Brokerage Account A Starting Balance: $
                <input
                  type="number"
                  value={brokerageA_StartingBalance}
                  onChange={(e) => setBrokerageA_StartingBalance(parseFloat(e.target.value))}
                  step="1000"
                />
              </label>
            </div>
            <div>
              <label>
                Brokerage Account B Starting Balance: $
                <input
                  type="number"
                  value={brokerageB_StartingBalance}
                  onChange={(e) => setBrokerageB_StartingBalance(parseFloat(e.target.value))}
                  step="1000"
                />
              </label>
            </div>
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
                Are Brokerage Accounts Taxable?{" "}
                <input
                  type="checkbox"
                  checked={brokerageAccountsAreTaxable}
                  onChange={(e) => setBrokerageAccountsAreTaxable(e.target.checked)}
                />
              </label>
            </div>
            <div>
              <label>
                Capital Gains Tax Rate (%):{" "}
                <input
                  type="number"
                  value={capitalGainsTaxRate * 100}
                  onChange={(e) => setCapitalGainsTaxRate(parseFloat(e.target.value) / 100)}
                  step="0.1"
                />
              </label>
            </div>
            <div>
              <label>
                Husband Yearly Post‑Tax Income: $
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
                Wife Yearly Post‑Tax Income: $
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
            <div>
              <label>
                Simulation Period (Years):{" "}
                <input
                  type="number"
                  value={simulationYears}
                  onChange={(e) => setSimulationYears(parseInt(e.target.value))}
                  step="1"
                />
              </label>
            </div>
          </section>

          {/* ─── Extra Monthly Credits/Debits ───────────────────────── */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
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
                Amount per month:{" "}
                <input
                  type="number"
                  value={newEntryAmount}
                  onChange={(e) => setNewEntryAmount(e.target.value)}
                  placeholder="e.g., -600 or 800"
                />
              </label>{" "}
              <button type="submit">Add Entry</button>
            </form>
            {extraEntries.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {extraEntries.map((entry, index) => (
                  <li key={index} style={{ marginBottom: "8px" }}>
                    {editingIndex === index ? (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <input
                          type="text"
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                        />
                        <input
                          type="number"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          style={{ width: "100px" }}
                        />
                        <button onClick={() => handleEditSave(index)}>Save</button>
                        <button onClick={() => setEditingIndex(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span>
                          {entry.description}: {entry.amount >= 0 ? "+" : "-"}${Math.abs(entry.amount)} per month
                        </span>
                        <button onClick={() => handleEditStart(index)}>Edit</button>
                        <button onClick={() => handleDelete(index)}>Delete</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column - Charts and Time Controls */}
        <div style={{ position: "sticky", top: "20px" }}>
          {/* Time Range Slider */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Simulation Time Range (in Months)</h2>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
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
              Displaying data from Month {timeRange[0]} ({formatMonth(timeRange[0])}) to Month {timeRange[1]} ({formatMonth(timeRange[1])})
            </p>
          </section>

          {/* Chart 1: Cash Flow & Investments */}
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Cash Flow & Investments</h2>
            <p>
              <strong>Key Equations:</strong> <br />
              Cumulative W2 Income: Sum of (Husband + Wife monthly income). <br />
              Total Housing Cost: (Effective Mortgage Payment + Property Tax + Insurance + Utilities). <br />
              Net Monthly Cash Flow: (Base Income + Extra Entries) – Total Housing Cost. <br />
              Brokerage Growth: <br />
              {brokerageAccountsAreTaxable
                ? "Account = Previous Balance × (1 + monthlyReturn×(1 – CapitalGainsTaxRate)) + (Net Cash Flow / 2)"
                : "Account = Previous Balance × (1 + monthlyReturn) + (Net Cash Flow / 2)"}
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <XAxis dataKey="month" tickFormatter={(month) => formatMonth(month)} />
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
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Mortgage Amortization</h2>
            <p>
              <strong>Key Equations:</strong> <br />
              Interest Payment = Remaining Mortgage Balance × (Mortgage Interest Rate / 12). <br />
              Principal Payment = Effective Mortgage Payment – Interest Payment. <br />
              Remaining Mortgage Balance decreases by the Principal Payment each month.
            </p>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={filteredData}>
                <XAxis dataKey="month" tickFormatter={(month) => formatMonth(month)} />
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
          <section style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
            <h2>Current Balances (End of Selected Period)</h2>
            {filteredData.length > 0 && (
              <div>
                <p>
                  Month: {formatMonth(filteredData[filteredData.length - 1].month)}
                </p>
                <p>
                  Brokerage Account A: ${formatCurrency(filteredData[filteredData.length - 1].accountA)}
                </p>
                <p>
                  Brokerage Account B: ${formatCurrency(filteredData[filteredData.length - 1].accountB)}
                </p>
                <p>
                  Total Brokerage Value: ${formatCurrency(filteredData[filteredData.length - 1].totalBrokerage)}
                </p>
                <p>
                  Total Net Worth: ${formatCurrency(filteredData[filteredData.length - 1].totalNetWorth)}
                </p>
                <p>
                  Cumulative W2 Income: ${formatCurrency(filteredData[filteredData.length - 1].cumulativeW2Income)}
                </p>
                <p>
                  Cumulative Housing Cost: ${formatCurrency(filteredData[filteredData.length - 1].cumulativeHousingCost)}
                </p>
                <p>
                  Remaining Mortgage Balance: ${formatCurrency(filteredData[filteredData.length - 1].remainingMortgageBalance)}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* ─── Calculation Details ───────────────────────────────────────────── */}
      <section style={{ borderTop: "2px solid #000", marginTop: "2rem", paddingTop: "1rem" }}>
        <h2>Calculation Details & Equations</h2>
        <ul>
          <li>
            <strong>Total Owning Cost per Month:</strong><br />
            = Effective Mortgage Payment + Property Tax + Insurance + Utilities.
          </li>
          <li>
            <strong>Mortgage Payment:</strong><br />
            Payment = P × r / [1 – (1 + r)^(-n)], where:<br />
            P = Mortgage Principal,<br />
            r = (Annual Interest Rate/100)/12,<br />
            n = Mortgage Term (in months).
          </li>
          <li>
            <strong>Extra Mortgage Payment:</strong><br />
            Extra Payment = Computed Mortgage Payment × (Extra Payment % / 100).<br />
            Effective Mortgage Payment = Computed Mortgage Payment + Extra Payment.
          </li>
          <li>
            <strong>Mortgage Amortization:</strong><br />
            Interest Payment = Remaining Mortgage Balance × (Annual Interest Rate/12/100).<br />
            Principal Payment = Effective Mortgage Payment – Interest Payment.<br />
            Remaining Balance decreases by Principal Payment.
          </li>
          <li>
            <strong>Net Monthly Cash Flow:</strong><br />
            = (Husband Income/12 + Wife Income/12 + Sum of Extra Entries) – (Non-Mortgage Costs + Effective Mortgage Payment).
          </li>
          <li>
            <strong>Brokerage Account Growth:</strong><br />
            If taxable: Account = Previous Balance × [1 + (monthlyReturn × (1 – Capital Gains Tax Rate))] + (Net Cash Flow Contribution / 2).<br />
            If tax‑deferred: Account = Previous Balance × (1 + monthlyReturn) + (Net Cash Flow Contribution / 2).
          </li>
          <li>
            <strong>Total Net Worth:</strong><br />
            = Total Brokerage Value + Cumulative Net Cash.
          </li>
        </ul>
        <p>
          Note: All calculations are performed monthly. For taxable brokerage accounts, we assume gains are taxed as they are earned.
        </p>
      </section>
    </div>
  );
};

export default Dashboard;
