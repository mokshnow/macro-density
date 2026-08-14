import { MacroMarket } from '../types/market';

/**
 * Exports market distribution as a high-fidelity printable PDF report
 */
export function exportToPDF(market: MacroMarket): void {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF report.');
    return;
  }

  const binsRows = market.bins
    .map(
      (b) => `
    <tr style="border-bottom: 1px solid #E5E7EB;">
      <td style="padding: 8px 12px; font-weight: ${b.isMode ? 'bold' : 'normal'}; color: ${b.isMode ? '#008A45' : '#111827'};">
        ${b.label} ${b.isMode ? '★ (Mode Peak)' : ''}
      </td>
      <td style="padding: 8px 12px; text-align: right; font-family: monospace; font-weight: bold; color: ${b.isMode ? '#008A45' : '#111827'};">
        ${b.probability}%
      </td>
      <td style="padding: 8px 12px; text-align: right; font-family: monospace; color: #4B5563;">
        ${b.cumulativeProb}%
      </td>
      <td style="padding: 8px 12px; text-align: right; font-family: monospace; color: #6B7280;">
        ${b.marketPrice ? b.marketPrice + '¢' : '—'}
      </td>
    </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Macro Density — ${market.title} Report</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #FFFFFF;
            margin: 0;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #00D26A;
            padding-bottom: 14px;
            margin-bottom: 20px;
          }
          .title { font-size: 22px; font-weight: 800; color: #111827; margin: 0; }
          .subtitle { font-size: 13px; color: #4B5563; margin-top: 4px; }
          .meta-pill {
            background: #F0FDF4;
            border: 1px solid #BBF7D0;
            color: #008A45;
            padding: 4px 10px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 11px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .card-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6B7280; margin-bottom: 2px; }
          .card-val { font-size: 15px; font-weight: 800; font-family: monospace; color: #111827; }
          .summary-box {
            background: #FAFAFA;
            border-left: 4px solid #00D26A;
            padding: 10px 14px;
            border-radius: 0 8px 8px 0;
            margin-bottom: 20px;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th {
            background: #F3F4F6;
            padding: 8px 12px;
            text-align: left;
            font-size: 10px;
            font-weight: bold;
            color: #374151;
            text-transform: uppercase;
          }
          th.right { text-align: right; }
          .footer {
            margin-top: 28px;
            padding-top: 10px;
            border-top: 1px solid #E5E7EB;
            font-size: 10px;
            color: #9CA3AF;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Macro Density</h1>
            <div class="subtitle">Market-Implied Probability Distribution • <strong>${market.title}</strong></div>
          </div>
          <div class="meta-pill">
            Settlement: ${market.settlementDate}
          </div>
        </div>

        <div class="grid">
          <div class="card">
            <div class="card-title">Expected Value E[X]</div>
            <div class="card-val" style="color: #008A45;">${market.moments.mean}${market.unitSuffix}</div>
          </div>
          <div class="card">
            <div class="card-title">Peak Mode</div>
            <div class="card-val">${market.moments.modeRange}</div>
          </div>
          <div class="card">
            <div class="card-title">Implied Vol (1-σ)</div>
            <div class="card-val">±${market.moments.stdDev}${market.unitSuffix}</div>
          </div>
          <div class="card">
            <div class="card-title">Consensus</div>
            <div class="card-val">${market.consensus.value}${market.unitSuffix}</div>
          </div>
        </div>

        <div class="summary-box">
          <strong style="color: #111827; display: block; margin-bottom: 2px;">Summary</strong>
          <p style="margin: 0; color: #374151;">${market.summary}</p>
        </div>

        <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 4px; color: #111827;">Probability Mass Function (PMF) & Cumulative (CDF)</h3>
        <table>
          <thead>
            <tr>
              <th>Interval Range</th>
              <th class="right">Probability Mass</th>
              <th class="right">Cumulative Probability</th>
              <th class="right">Contract Price</th>
            </tr>
          </thead>
          <tbody>
            ${binsRows}
          </tbody>
        </table>

        <div class="footer">
          <span>Macro Density Institutional Report • Generated on ${new Date().toLocaleDateString()}</span>
          <span>Not Officially Endorsed by Kalshi.</span>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Exports market distribution data as CSV
 */
export function exportToCSV(market: MacroMarket): void {
  const headers = [
    'Range_Label',
    'Lower_Bound',
    'Upper_Bound',
    'Midpoint',
    'Probability_Mass_Pct',
    'Cumulative_Prob_Pct',
    'Is_Modal_Peak',
    'Is_Tail_Risk',
    'Ticker_Reference',
    'Market_Last_Price_Cents'
  ];

  const rows = market.bins.map((bin) => [
    `"${bin.label}"`,
    bin.lower,
    bin.upper,
    bin.midpoint,
    bin.probability,
    bin.cumulativeProb,
    bin.isMode ? 'TRUE' : 'FALSE',
    bin.isTail ? 'TRUE' : 'FALSE',
    bin.yesContractTicker || market.ticker,
    bin.marketPrice ?? ''
  ]);

  const csvContent = [
    `# Macro Density Export: ${market.title} (${market.eventTicker})`,
    `# Settlement Date: ${market.settlementDate} ${market.releaseTime}`,
    `# Expected Value (Mean): ${market.moments.mean}${market.unitSuffix} | Volatility (StdDev): ${market.moments.stdDev}${market.unitSuffix} | Skewness: ${market.moments.skewness}`,
    headers.join(','),
    ...rows.map((r) => r.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${market.eventTicker.toLowerCase()}_density_distribution.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports market distribution data as structured JSON
 */
export function exportToJSON(market: MacroMarket): void {
  const exportPayload = {
    metadata: {
      app: 'Macro Density',
      generatedAt: new Date().toISOString(),
      marketTitle: market.title,
      eventTicker: market.eventTicker,
      category: market.category,
      sourceAgency: market.sourceAgency,
      settlementDate: market.settlementDate,
      releaseTime: market.releaseTime,
      totalVolumeUSD: market.totalVolume,
      totalOpenInterest: market.totalOpenInterest,
      kalshiUrl: market.kalshiUrl,
    },
    statisticalMoments: market.moments,
    probabilityMassFunction: market.bins.map((b) => ({
      label: b.label,
      range: [b.lower, b.upper],
      midpoint: b.midpoint,
      probabilityPct: b.probability,
      cumulativeProbPct: b.cumulativeProb,
      isMode: b.isMode,
      isTail: b.isTail,
    })),
    rawContracts: market.contracts,
    consensusEstimates: market.consensus,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${market.eventTicker.toLowerCase()}_density.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a ready-to-run Python snippet for quant researchers / pandas
 */
export function generatePythonSnippet(market: MacroMarket): string {
  const binValues = market.bins.map((b) => b.midpoint);
  const probValues = market.bins.map((b) => b.probability / 100);
  const labels = market.bins.map((b) => b.label);

  return `import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

# Data extracted from Macro Density (Kalshi Implied Distribution)
# Market: ${market.title} (${market.eventTicker})

data = {
    'range': ${JSON.stringify(labels)},
    'midpoint': ${JSON.stringify(binValues)},
    'probability': ${JSON.stringify(probValues)},
}

df = pd.DataFrame(data)
df['cumulative_prob'] = df['probability'].cumsum()

# Calculate Statistical Moments
expected_value = (df['midpoint'] * df['probability']).sum()
variance = ((df['midpoint'] - expected_value)**2 * df['probability']).sum()
std_dev = np.sqrt(variance)
skewness = (((df['midpoint'] - expected_value)**3 * df['probability']).sum()) / (std_dev**3)

print(f"--- ${market.title} Implied Moments ---")
print(f"Expected Value (Mean): {expected_value:.2f}${market.unitSuffix}")
print(f"Implied Volatility (1-Sigma): {std_dev:.2f}${market.unitSuffix}")
print(f"Skewness: {skewness:.2f}")

# Plot PDF Histogram
plt.figure(figsize=(9, 4.5))
plt.bar(df['range'], df['probability'] * 100, color='#00D26A', edgecolor='#00A854', alpha=0.85)
plt.title('${market.title} — Market-Implied Probability Mass Function (PMF)')
plt.xlabel('Outcome Interval (${market.unitSuffix})')
plt.ylabel('Implied Probability (%)')
plt.grid(axis='y', linestyle='--', alpha=0.5)
plt.axvline(x=df.loc[df['probability'].idxmax(), 'range'], color='#111827', linestyle='--', label=f'Mode ({df["probability"].max()*100:.1f}%)')
plt.legend()
plt.tight_layout()
plt.show()
`;
}
