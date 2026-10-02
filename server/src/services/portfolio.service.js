import { Investment } from '../models/index.js';
export async function summary(userId) {
  const investments = await Investment.find({
    investorId: userId,
    status: { $in: ['ACTIVE', 'EXITED'] },
  })
    .populate('propertyId')
    .lean();
  let totalInvested = 0,
    currentEstValue = 0,
    totalPayouts = 0,
    exitedCost = 0;
  const groups = new Map();
  for (const inv of investments) {
    const p = inv.propertyId,
      active = inv.status === 'ACTIVE';
    const estimatedValue = active
      ? Math.round(
          inv.amount * (1 + p.expectedAppreciationPct / 100) ** (p.holdingPeriodMonths / 12)
        )
      : inv.payoutAmount || 0;
    if (active) {
      totalInvested += inv.amount;
      currentEstValue += estimatedValue;
    } else {
      totalPayouts += inv.payoutAmount || 0;
      exitedCost += inv.amount;
    }
    const key = `${p._id}:${inv.status}`;
    const row = groups.get(key) || {
      propertyId: p._id,
      title: p.title,
      city: p.city,
      units: 0,
      ownershipPct: 0,
      investedAmount: 0,
      estimatedValue: 0,
      status: p.status,
      investmentStatus: inv.status,
      payoutReceived: 0,
    };
    row.units += inv.units;
    row.investedAmount += inv.amount;
    row.estimatedValue += estimatedValue;
    row.payoutReceived += inv.payoutAmount || 0;
    row.ownershipPct = (row.units / p.totalUnits) * 100;
    groups.set(key, row);
  }
  return {
    totalInvested,
    currentEstValue,
    totalPayouts,
    exitedInvested: exitedCost,
    overallROI: exitedCost ? ((totalPayouts - exitedCost) / exitedCost) * 100 : 0,
    allocations: [...groups.values()].map((row) => ({
      ...row,
      roi:
        row.investmentStatus === 'EXITED'
          ? ((row.payoutReceived - row.investedAmount) / row.investedAmount) * 100
          : ((row.estimatedValue - row.investedAmount) / row.investedAmount) * 100,
    })),
  };
}
