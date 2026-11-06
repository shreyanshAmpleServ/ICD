import { Request, Response } from "express";
import { getPrisma, isDbLive } from "../../configs/prisma";
import {
  payments as mockPayments,
  shifts as mockShifts,
  channels as mockChannels,
  eatDate,
  TODAY,
  m2,
  type Payment,
  type Shift,
} from "../../data/money";

let livePayments: any[] = [...mockPayments];
let liveShifts: any[] = [...mockShifts];
let liveChannels: any[] = [...mockChannels];
let receiptSeq = 18860;

export const cashierController = {
  getPayments: async (req: Request, res: Response) => {
    try {
      const { siteId, partyId, cashier, status, search, date } = req.query;

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).payment) {
          try {
            const whereClause: any = {};
            if (siteId) whereClause.site_id = Number(siteId);
            if (partyId) whereClause.party_id = Number(partyId);
            if (status) whereClause.status = String(status);
            if (cashier) whereClause.createdby = { contains: String(cashier) };

            const dbPayments = await (prisma as any).payment.findMany({
              where: whereClause,
              include: {
                m_party_payment: true,
                cashier_shift_payment: true,
                m_payment_channel_payment: true,
                payment_payment_allocation: {
                  include: { invoice_payment_allocation: true },
                },
              },
              orderBy: { payment_id: "desc" },
            });

            if (dbPayments && dbPayments.length > 0) {
              const mapped = dbPayments.map((p: any) => ({
                paymentId: Number(p.payment_id),
                receiptNo: p.receipt_no,
                partyId: p.party_id,
                payerName: p.m_party_payment?.party_name,
                channelCode:
                  p.m_payment_channel_payment?.channel_code ||
                  (p.payment_channel_id
                    ? `CHAN_${p.payment_channel_id}`
                    : "BANK_TRANSFER"),
                externalRef: p.external_ref,
                amount: String(p.amount),
                currency: p.currency,
                exchangeRate: String(p.exchange_rate || 1),
                amountBase: String(p.amount_base || p.amount),
                amountAllocated: String(p.amount_allocated || 0),
                unallocated: String(p.unallocated || 0),
                status: p.status,
                receivedAt: p.received_at
                  ? p.received_at.toISOString()
                  : new Date().toISOString(),
                valueDate: p.value_date
                  ? p.value_date.toISOString().split("T")[0]
                  : undefined,
                cashier: p.createdby || "Ashok Kumar",
                siteId: p.site_id,
                allocations: (p.payment_payment_allocation || []).map(
                  (a: any) => ({
                    paymentAllocationId: Number(a.payment_allocation_id),
                    invoiceId: Number(a.invoice_id),
                    invoiceNo: a.invoice_payment_allocation?.invoice_no,
                    amount: String(a.amount),
                    amountInvoiceCcy: String(a.amount_invoice_ccy || a.amount),
                    fxDifferenceBase: String(a.fx_difference_base || 0),
                    allocatedAt: a.allocated_at
                      ? a.allocated_at.toISOString()
                      : a.createdate?.toISOString(),
                  }),
                ),
              }));

              let filtered = mapped;
              if (search) {
                const q = String(search).toUpperCase();
                filtered = filtered.filter(
                  (p: any) =>
                    p.receiptNo?.toUpperCase().includes(q) ||
                    p.payerName?.toUpperCase().includes(q) ||
                    p.externalRef?.toUpperCase().includes(q),
                );
              }
              if (date) {
                filtered = filtered.filter((p: any) =>
                  p.receivedAt?.startsWith(String(date)),
                );
              }

              return res.json({
                items: filtered,
                total: filtered.length,
                nextCursor: null,
              });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB getPayments failed, using fallback:",
              dbErr.message,
            );
          }
        }
      }

      // Dynamic Fallback Store
      let items = [...livePayments];
      if (siteId)
        items = items.filter((p) => String(p.siteId) === String(siteId));
      if (partyId)
        items = items.filter((p) => String(p.partyId) === String(partyId));
      if (status) items = items.filter((p) => p.status === status);
      if (cashier) items = items.filter((p) => p.cashier === cashier);
      if (search) {
        const q = String(search).toUpperCase();
        items = items.filter(
          (p) =>
            p.receiptNo?.toUpperCase().includes(q) ||
            p.payerName?.toUpperCase().includes(q) ||
            p.externalRef?.toUpperCase().includes(q),
        );
      }
      if (date) {
        items = items.filter((p) => eatDate(p.receivedAt!) === String(date));
      }

      return res.json({ items, total: items.length, nextCursor: null });
    } catch (err: any) {
      console.error("[Cashier Controller] getPayments error:", err.message);
      return res.json({
        items: livePayments,
        total: livePayments.length,
        nextCursor: null,
      });
    }
  },

  getPaymentById: async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).payment) {
          try {
            const isNum = !isNaN(Number(paymentId));
            const p = await (prisma as any).payment.findFirst({
              where: isNum
                ? {
                    OR: [
                      { payment_id: BigInt(paymentId) },
                      { receipt_no: paymentId },
                    ],
                  }
                : { receipt_no: paymentId },
              include: {
                m_party_payment: true,
                cashier_shift_payment: true,
                m_payment_channel_payment: true,
                payment_payment_allocation: {
                  include: { invoice_payment_allocation: true },
                },
              },
            });

            if (p) {
              return res.json({
                paymentId: Number(p.payment_id),
                receiptNo: p.receipt_no,
                partyId: p.party_id,
                payerName: p.m_party_payment?.party_name,
                channelCode:
                  p.m_payment_channel_payment?.channel_code || "BANK_TRANSFER",
                externalRef: p.external_ref,
                amount: String(p.amount),
                currency: p.currency,
                exchangeRate: String(p.exchange_rate || 1),
                amountBase: String(p.amount_base || p.amount),
                amountAllocated: String(p.amount_allocated || 0),
                unallocated: String(p.unallocated || 0),
                status: p.status,
                receivedAt: p.received_at
                  ? p.received_at.toISOString()
                  : new Date().toISOString(),
                valueDate: p.value_date
                  ? p.value_date.toISOString().split("T")[0]
                  : undefined,
                cashier: p.createdby || "Ashok Kumar",
                siteId: p.site_id,
                allocations: (p.payment_payment_allocation || []).map(
                  (a: any) => ({
                    paymentAllocationId: Number(a.payment_allocation_id),
                    invoiceId: Number(a.invoice_id),
                    invoiceNo: a.invoice_payment_allocation?.invoice_no,
                    amount: String(a.amount),
                    amountInvoiceCcy: String(a.amount_invoice_ccy || a.amount),
                    fxDifferenceBase: String(a.fx_difference_base || 0),
                    allocatedAt: a.allocated_at?.toISOString(),
                  }),
                ),
              });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB getPaymentById failed, checking fallback:",
              dbErr.message,
            );
          }
        }
      }

      const found = livePayments.find(
        (p) => String(p.paymentId) === paymentId || p.receiptNo === paymentId,
      );
      if (!found) return res.status(404).json({ error: "Payment not found" });
      return res.json(found);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  recordPayment: async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const receiptNo =
        b.receiptNo || `RCT-DAR1-26-${String(++receiptSeq).padStart(6, "0")}`;
      const amount = Number(b.amount || 0);
      const currency = b.currency || "USD";
      const allocations = b.allocations || [];
      const allocated = allocations.reduce(
        (sum: number, a: any) => sum + Number(a.amount || 0),
        0,
      );
      const unallocated = Math.max(0, amount - allocated);
      const cashierName =
        (req as any).user?.username || b.cashier || "Ashok Kumar";

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).payment) {
          try {
            let channelId = Number(b.channelId || b.paymentChannelId || 1);
            if (b.channelCode) {
              const ch = await (prisma as any).m_payment_channel.findFirst({
                where: { channel_code: b.channelCode },
              });
              if (ch) channelId = ch.payment_channel_id;
            }

            const created = await (prisma as any).payment.create({
              data: {
                company_id: 1,
                site_id: Number(b.siteId || 1),
                receipt_no: receiptNo,
                party_id: Number(b.partyId || b.payerId || 1),
                payment_channel_id: channelId,
                external_ref: b.externalRef || b.ref || null,
                currency,
                amount,
                exchange_rate: Number(
                  b.exchangeRate || (currency === "TZS" ? 2650 : 1),
                ),
                amount_base: currency === "TZS" ? amount : amount * 2650,
                amount_allocated: allocated,
                unallocated,
                received_at: new Date(),
                status:
                  allocated >= amount - 0.01
                    ? "ALLOCATED"
                    : allocated > 0
                      ? "PART_ALLOC"
                      : "RECEIVED",
                cashier_shift_id: b.cashierShiftId
                  ? BigInt(b.cashierShiftId)
                  : null,
                createdby: cashierName,
              },
            });

            if (allocations.length > 0) {
              for (const alloc of allocations) {
                const invId = BigInt(alloc.invoiceId);
                await (prisma as any).payment_allocation.create({
                  data: {
                    payment_id: created.payment_id,
                    invoice_id: invId,
                    amount: Number(alloc.amount),
                    amount_invoice_ccy: Number(
                      alloc.amountInvoiceCcy || alloc.amount,
                    ),
                    fx_difference_base: Number(alloc.fxDifferenceBase || 0),
                    allocated_at: new Date(),
                    createdby: cashierName,
                  },
                });

                const targetInv = await (prisma as any).invoice.findUnique({
                  where: { invoice_id: invId },
                });
                if (targetInv) {
                  const newPaid =
                    Number(targetInv.amount_paid || 0) +
                    Number(alloc.amountInvoiceCcy || alloc.amount);
                  const newBal = Math.max(0, Number(targetInv.total) - newPaid);
                  await (prisma as any).invoice.update({
                    where: { invoice_id: invId },
                    data: {
                      amount_paid: newPaid,
                      balance: newBal,
                      status: newBal <= 0.01 ? "PAID" : "POSTED",
                    },
                  });
                }
              }
            }

            return res.status(201).json({
              paymentId: Number(created.payment_id),
              receiptNo: created.receipt_no,
              amount: String(created.amount),
              currency: created.currency,
              status: created.status,
              amountAllocated: String(created.amount_allocated),
              unallocated: String(created.unallocated),
              receivedAt: created.received_at.toISOString(),
            });
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB recordPayment failed, saving to fallback:",
              dbErr.message,
            );
          }
        }
      }

      const newPay: Payment = {
        paymentId: livePayments.length + 3201,
        receiptNo,
        partyId: Number(b.partyId || 2),
        channelCode: b.channelCode || "CRDB_USD",
        externalRef: b.ref || b.externalRef || null,
        currency,
        amount: m2(amount),
        exchangeRate: m2(b.exchangeRate || 2650),
        amountBase: m2(currency === "TZS" ? amount : amount * 2650),
        amountAllocated: m2(allocated),
        unallocated: m2(unallocated),
        receivedAt: new Date().toISOString(),
        status:
          allocated >= amount - 0.01
            ? "ALLOCATED"
            : allocated > 0
              ? "PART_ALLOC"
              : "RECEIVED",
        cashier: cashierName,
        siteId: Number(b.siteId || 1),
        payerName: b.payer || b.payerName,
        allocations: allocations.map((a: any, i: number) => ({
          paymentAllocationId: 53000 + livePayments.length * 10 + i,
          invoiceId: Number(a.invoiceId),
          invoiceNo: a.invoiceNo,
          amount: m2(Number(a.amount)),
          amountInvoiceCcy: m2(Number(a.amountInvoiceCcy || a.amount)),
          fxDifferenceBase: m2(Number(a.fxDifferenceBase || 0)),
          allocatedAt: new Date().toISOString(),
        })),
      };

      livePayments.unshift(newPay);
      return res.status(201).json(newPay);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  allocatePayment: async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { allocations = [] } = req.body;

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).payment) {
          try {
            const p = await (prisma as any).payment.findFirst({
              where: {
                OR: [
                  {
                    payment_id: !isNaN(Number(paymentId))
                      ? BigInt(paymentId)
                      : -1n,
                  },
                  { receipt_no: paymentId },
                ],
              },
            });

            if (p) {
              let addedAlloc = 0;
              for (const a of allocations) {
                const invId = BigInt(a.invoiceId);
                await (prisma as any).payment_allocation.create({
                  data: {
                    payment_id: p.payment_id,
                    invoice_id: invId,
                    amount: Number(a.amount),
                    amount_invoice_ccy: Number(a.amountInvoiceCcy || a.amount),
                    fx_difference_base: Number(a.fxDifferenceBase || 0),
                    allocated_at: new Date(),
                    createdby: "Ashok Kumar",
                  },
                });
                addedAlloc += Number(a.amount);
              }

              const newAllocated = Number(p.amount_allocated || 0) + addedAlloc;
              const newUnalloc = Math.max(0, Number(p.amount) - newAllocated);

              const updated = await (prisma as any).payment.update({
                where: { payment_id: p.payment_id },
                data: {
                  amount_allocated: newAllocated,
                  unallocated: newUnalloc,
                  status: newUnalloc <= 0.01 ? "ALLOCATED" : "PART_ALLOC",
                },
              });

              return res.json({ success: true, payment: updated });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB allocatePayment failed:",
              dbErr.message,
            );
          }
        }
      }

      const pay = livePayments.find(
        (p) => String(p.paymentId) === paymentId || p.receiptNo === paymentId,
      );
      if (!pay) return res.status(404).json({ error: "Payment not found" });

      for (const a of allocations) {
        pay.allocations.push({
          paymentAllocationId: 54000 + Math.floor(Math.random() * 1000),
          invoiceId: Number(a.invoiceId),
          invoiceNo: a.invoiceNo,
          amount: m2(Number(a.amount)),
          amountInvoiceCcy: m2(Number(a.amountInvoiceCcy || a.amount)),
          fxDifferenceBase: m2(0),
          allocatedAt: new Date().toISOString(),
        });
      }

      const totalAlloc = pay.allocations.reduce(
        (sum: number, a: any) => sum + Number(a.amount),
        0,
      );
      pay.amountAllocated = m2(totalAlloc);
      pay.unallocated = m2(Math.max(0, Number(pay.amount) - totalAlloc));
      pay.status = Number(pay.unallocated) <= 0.01 ? "ALLOCATED" : "PART_ALLOC";

      return res.json({ success: true, payment: pay });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  reversePayment: async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { reason = "Customer requested refund / reversal" } = req.body;

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).payment) {
          try {
            const p = await (prisma as any).payment.findFirst({
              where: {
                OR: [
                  {
                    payment_id: !isNaN(Number(paymentId))
                      ? BigInt(paymentId)
                      : -1n,
                  },
                  { receipt_no: paymentId },
                ],
              },
            });

            if (p) {
              const updated = await (prisma as any).payment.update({
                where: { payment_id: p.payment_id },
                data: {
                  status: "REVERSED",
                  reason,
                  updatedate: new Date(),
                },
              });
              return res.json({ success: true, payment: updated });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB reversePayment failed:",
              dbErr.message,
            );
          }
        }
      }

      const pay = livePayments.find(
        (p) => String(p.paymentId) === paymentId || p.receiptNo === paymentId,
      );
      if (!pay) return res.status(404).json({ error: "Payment not found" });
      pay.status = "REVERSED";
      return res.json({ success: true, payment: pay });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getPaymentReceipt: async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    return res.json({
      paymentId,
      receiptUrl: `/api/documents/receipt-${paymentId}.pdf`,
      contentBase64: "JVBERi0xLjQKJcTl8uXrp/ogCjEgMCBvYmoK...",
    });
  },

  // ==========================================
  // 2. Shifts
  // ==========================================
  getShifts: async (req: Request, res: Response) => {
    try {
      const { siteId, status, cashier } = req.query;

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).cashier_shift) {
          try {
            const whereClause: any = {};
            if (siteId) whereClause.site_id = Number(siteId);
            if (status) whereClause.status = String(status);
            if (cashier) whereClause.cashier_sub = String(cashier);

            const dbShifts = await (prisma as any).cashier_shift.findMany({
              where: whereClause,
              include: {
                cashier_shift_payment: true,
                approval_request_cashier_shift: true,
              },
              orderBy: { cashier_shift_id: "desc" },
            });

            if (dbShifts && dbShifts.length > 0) {
              const mapped: Shift[] = dbShifts.map((s: any) => {
                const paymentsList = s.cashier_shift_payment || [];
                const nonCashTotal = paymentsList
                  .filter(
                    (p: any) =>
                      p.payment_channel_id !== 1 && p.payment_channel_id !== 2,
                  )
                  .reduce(
                    (sum: number, p: any) => sum + Number(p.amount || 0),
                    0,
                  );

                return {
                  cashierShiftId: Number(s.cashier_shift_id),
                  siteId: s.site_id,
                  cashier: s.cashier_sub,
                  currency: s.currency,
                  status: s.status,
                  openingFloat: String(s.opening_float),
                  expectedCash: String(s.expected_cash || s.opening_float),
                  actualCash:
                    s.counted_cash !== null
                      ? String(s.counted_cash)
                      : undefined,
                  diff:
                    s.difference !== null ? Number(s.difference) : undefined,
                  receiptsCount: paymentsList.length,
                  nonCash: String(nonCashTotal),
                  openedAt: s.opened_at
                    ? s.opened_at.toISOString()
                    : new Date().toISOString(),
                  closedAt: s.closed_at ? s.closed_at.toISOString() : undefined,
                  approvedBy:
                    s.approval_request_cashier_shift?.status === "APPROVED"
                      ? "Finance Manager"
                      : undefined,
                };
              });

              return res.json({ items: mapped, total: mapped.length });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB getShifts failed, using fallback:",
              dbErr.message,
            );
          }
        }
      }

      let items = [...liveShifts];
      if (status) items = items.filter((s) => s.status === status);
      if (cashier) items = items.filter((s) => s.cashier === cashier);
      return res.json({ items, total: items.length });
    } catch (err: any) {
      return res.json({ items: liveShifts, total: liveShifts.length });
    }
  },
  getCurrentShift: async (req: Request, res: Response) => {
    try {
      const cashierName = (req as any).user?.username || "Neema Mushi";

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).cashier_shift) {
          try {
            const active = await (prisma as any).cashier_shift.findFirst({
              where: {
                cashier_sub: cashierName,
                status: "OPEN",
              },
              include: { cashier_shift_payment: true },
            });
            if (active) {
              return res.json({
                cashierShiftId: Number(active.cashier_shift_id),
                siteId: active.site_id,
                cashier: active.cashier_sub,
                currency: active.currency,
                status: active.status,
                openingFloat: String(active.opening_float),
                expectedCash: String(active.expected_cash),
                receiptsCount: active.cashier_shift_payment?.length || 0,
                openedAt: active.opened_at.toISOString(),
              });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB getCurrentShift fallback:",
              dbErr.message,
            );
          }
        }
      }

      const found = liveShifts.find(
        (s) =>
          s.status === "OPEN" &&
          (s.cashier === cashierName || s.cashier === "Neema Mushi"),
      );
      return res.json(found || null);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  openShift: async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const cashierName =
        (req as any).user?.username || b.cashier || "Neema Mushi";
      const usdFloat = Number(b.usdFloat || b.openingFloatUSD || 200);
      const tzsFloat = Number(b.tzsFloat || b.openingFloatTZS || 300000);
      const siteId = Number(b.siteId || 1);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).cashier_shift) {
          try {
            const createdUsd = await (prisma as any).cashier_shift.create({
              data: {
                site_id: siteId,
                cashier_sub: cashierName,
                currency: "USD",
                opened_at: new Date(),
                opening_float: usdFloat,
                expected_cash: usdFloat,
                status: "OPEN",
                createdby: cashierName,
              },
            });

            const createdTzs = await (prisma as any).cashier_shift.create({
              data: {
                site_id: siteId,
                cashier_sub: cashierName,
                currency: "TZS",
                opened_at: new Date(),
                opening_float: tzsFloat,
                expected_cash: tzsFloat,
                status: "OPEN",
                createdby: cashierName,
              },
            });

            return res.status(201).json({
              success: true,
              shifts: [
                {
                  cashierShiftId: Number(createdUsd.cashier_shift_id),
                  currency: "USD",
                  status: "OPEN",
                  openingFloat: String(usdFloat),
                },
                {
                  cashierShiftId: Number(createdTzs.cashier_shift_id),
                  currency: "TZS",
                  status: "OPEN",
                  openingFloat: String(tzsFloat),
                },
              ],
            });
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB openShift failed:",
              dbErr.message,
            );
          }
        }
      }

      const usdShift: Shift = {
        cashierShiftId: liveShifts.length + 950,
        cashier: cashierName,
        currency: "USD",
        status: "OPEN",
        openingFloat: m2(usdFloat),
        expectedCash: m2(usdFloat),
        receiptsCount: 0,
        nonCash: "0",
        openedAt: new Date().toISOString(),
      };

      const tzsShift: Shift = {
        cashierShiftId: liveShifts.length + 951,
        cashier: cashierName,
        currency: "TZS",
        status: "OPEN",
        openingFloat: m2(tzsFloat),
        expectedCash: m2(tzsFloat),
        receiptsCount: 0,
        nonCash: "0",
        openedAt: new Date().toISOString(),
      };

      liveShifts.unshift(usdShift, tzsShift);
      return res
        .status(201)
        .json({ success: true, shifts: [usdShift, tzsShift] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  closeShift: async (req: Request, res: Response) => {
    try {
      const { shiftId } = req.params;
      const { actualCash, countedCash, note } = req.body;
      const counted = Number(actualCash ?? countedCash ?? 0);

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).cashier_shift) {
          try {
            const s = await (prisma as any).cashier_shift.findUnique({
              where: { cashier_shift_id: BigInt(shiftId) },
            });

            if (s) {
              const diff = counted - Number(s.expected_cash || s.opening_float);
              const updated = await (prisma as any).cashier_shift.update({
                where: { cashier_shift_id: BigInt(shiftId) },
                data: {
                  counted_cash: counted,
                  difference: diff,
                  closed_at: new Date(),
                  status: Math.abs(diff) > 0.01 ? "CLOSED" : "CLOSED",
                  updatedby: "system",
                },
              });

              return res.json({
                success: true,
                shift: updated,
                difference: diff,
              });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB closeShift failed:",
              dbErr.message,
            );
          }
        }
      }

      const s = liveShifts.find((sh) => String(sh.cashierShiftId) === shiftId);
      if (s) {
        s.status = "CLOSED";
        s.actualCash = m2(counted);
        s.diff = counted - Number(s.expectedCash);
        s.closedAt = new Date().toISOString();
        if (note) s.note = note;
      }

      return res.json({ success: true, shift: s });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  approveShift: async (req: Request, res: Response) => {
    try {
      const { shiftId } = req.params;
      const approvedBy = (req as any).user?.username || "Finance Manager";

      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).cashier_shift) {
          try {
            const updated = await (prisma as any).cashier_shift.update({
              where: { cashier_shift_id: BigInt(shiftId) },
              data: {
                status: "APPROVED",
                updatedby: approvedBy,
              },
            });
            return res.json({ success: true, shift: updated });
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB approveShift failed:",
              dbErr.message,
            );
          }
        }
      }

      const s = liveShifts.find((sh) => String(sh.cashierShiftId) === shiftId);
      if (s) {
        s.status = "APPROVED";
        s.approvedBy = approvedBy;
      }

      return res.json({ success: true, shift: s });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  getChannels: async (_req: Request, res: Response) => {
    try {
      if (isDbLive()) {
        const prisma = getPrisma();
        if (prisma && (prisma as any).m_payment_channel) {
          try {
            const channels = await (prisma as any).m_payment_channel.findMany({
              where: { is_active: true },
              orderBy: { payment_channel_id: "asc" },
            });

            if (channels && channels.length > 0) {
              const mapped = channels.map((c: any) => ({
                paymentChannelId: c.payment_channel_id,
                channelCode: c.channel_code,
                channelName: c.channel_name,
                method: c.method,
                provider: c.provider,
                currency: c.currency,
                glAccount: c.gl_account,
                referencePattern: c.reference_pattern,
                isActive: c.is_active,
              }));
              return res.json({ items: mapped, total: mapped.length });
            }
          } catch (dbErr: any) {
            console.warn(
              "[Cashier Controller] DB getChannels failed:",
              dbErr.message,
            );
          }
        }
      }
      return res.json({ items: liveChannels, total: liveChannels.length });
    } catch (err: any) {
      return res.json({ items: liveChannels, total: liveChannels.length });
    }
  },
};
