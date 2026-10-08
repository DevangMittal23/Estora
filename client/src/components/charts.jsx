import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { money, compactMoney, pct, label } from '../utils';
import { Empty } from './ui';
const colors = [
  '#073b35',
  '#b8893d',
  '#738d76',
  '#a37349',
  '#ab9b71',
  '#4f7d70',
];
const chartTooltipStyle = {
  background: '#fffdf8',
  border: '1px solid #ddd3c4',
  borderRadius: 8,
  color: '#171717',
  fontSize: 13,
  boxShadow: '0 8px 24px #0b292615',
};
export function Allocation({ items = [] }) {
  if (!items.length)
    return (
      <Empty
        title="Your portfolio starts with one property"
        description="Explore the marketplace to find your first investment."
        action={
          <Link className="button primary" to="/properties">
            Explore properties
          </Link>
        }
      />
    );
  return (
    <div className="allocation">
      <div className="chart">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={items}
              dataKey="investedAmount"
              nameKey="title"
              innerRadius={72}
              outerRadius={105}
              paddingAngle={3}
              stroke="#fffdf8"
              isAnimationActive={false}
            >
              {items.map((p, i) => (
                <Cell
                  key={`${p.propertyId}-${i}`}
                  fill={colors[i % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(value) => money(value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div>
        {items.map((p, i) => (
          <div className="allocation-legend" key={`${p.propertyId}-${i}`}>
            <i style={{ background: colors[i % colors.length] }} />
            <div>
              <strong>{p.title}</strong>
              <small>
                {pct(p.ownershipPct)} ownership ·{' '}
                {p.investmentStatus === 'EXITED' || p.status === 'SOLD'
                  ? 'Exited position'
                  : 'Active holding'}
              </small>
            </div>
            <span>{compactMoney(p.investedAmount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export function DataChart({
  data = [],
  x = 'month',
  y = 'amount',
  bar = false,
  moneyValues = true,
}) {
  if (!data.length)
    return (
      <Empty
        title="No chart activity yet"
        description="Recorded activity will populate this chart."
      />
    );
  const Chart = bar ? BarChart : LineChart;
  return (
    <div className="chart">
      <ResponsiveContainer
        width="100%"
        height={bar ? Math.max(280, data.length * 38) : 280}
      >
        <Chart
          data={data}
          layout={bar ? 'vertical' : 'horizontal'}
          margin={{ top: 12, right: 18, bottom: 8, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={bar}
            horizontal={!bar}
            stroke="#ddd3c4"
          />
          <XAxis
            dataKey={bar ? undefined : x}
            type={bar ? 'number' : 'category'}
            allowDecimals={!bar}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            dataKey={bar ? x : undefined}
            type={bar ? 'category' : 'number'}
            tickFormatter={(v) =>
              bar ? label(v) : moneyValues ? compactMoney(v) : v
            }
            width={bar ? 112 : 88}
            interval={bar ? 0 : 'preserveStartEnd'}
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelFormatter={(v) => (bar ? label(v) : v)}
            formatter={(v) => [moneyValues ? money(v) : v, label(y)]}
            cursor={bar ? { fill: '#102b3e08' } : { stroke: '#b8893d' }}
          />
          {bar ? (
            <Bar
              dataKey={y}
              fill="#073b35"
              radius={[0, 3, 3, 0]}
              barSize={17}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={y}
              stroke="#073b35"
              strokeWidth={2.5}
              dot={
                data.length === 1
                  ? { r: 4, fill: '#073b35', stroke: '#fffdf8', strokeWidth: 2 }
                  : false
              }
              activeDot={{ r: 5, stroke: '#fffdf8', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
        </Chart>
      </ResponsiveContainer>
      {!bar && data.length === 1 && (
        <p className="chart-caption">One recorded period so far.</p>
      )}
    </div>
  );
}
