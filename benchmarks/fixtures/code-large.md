Here is the implementation you asked for.

```ts
export function handler0(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(0, "bad request"); }
  return ctx.json({ id: 0, value: parsed.value, at: Date.now() });
}

export function handler1(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(1, "bad request"); }
  return ctx.json({ id: 1, value: parsed.value, at: Date.now() });
}

export function handler2(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(2, "bad request"); }
  return ctx.json({ id: 2, value: parsed.value, at: Date.now() });
}

export function handler3(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(3, "bad request"); }
  return ctx.json({ id: 3, value: parsed.value, at: Date.now() });
}

export function handler4(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(4, "bad request"); }
  return ctx.json({ id: 4, value: parsed.value, at: Date.now() });
}

export function handler5(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(5, "bad request"); }
  return ctx.json({ id: 5, value: parsed.value, at: Date.now() });
}

export function handler6(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(6, "bad request"); }
  return ctx.json({ id: 6, value: parsed.value, at: Date.now() });
}

export function handler7(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(7, "bad request"); }
  return ctx.json({ id: 7, value: parsed.value, at: Date.now() });
}

export function handler8(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(8, "bad request"); }
  return ctx.json({ id: 8, value: parsed.value, at: Date.now() });
}

export function handler9(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(9, "bad request"); }
  return ctx.json({ id: 9, value: parsed.value, at: Date.now() });
}

export function handler10(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(10, "bad request"); }
  return ctx.json({ id: 10, value: parsed.value, at: Date.now() });
}

export function handler11(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(11, "bad request"); }
  return ctx.json({ id: 11, value: parsed.value, at: Date.now() });
}

export function handler12(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(12, "bad request"); }
  return ctx.json({ id: 12, value: parsed.value, at: Date.now() });
}

export function handler13(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(13, "bad request"); }
  return ctx.json({ id: 13, value: parsed.value, at: Date.now() });
}

export function handler14(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(14, "bad request"); }
  return ctx.json({ id: 14, value: parsed.value, at: Date.now() });
}

export function handler15(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(15, "bad request"); }
  return ctx.json({ id: 15, value: parsed.value, at: Date.now() });
}

export function handler16(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(16, "bad request"); }
  return ctx.json({ id: 16, value: parsed.value, at: Date.now() });
}

export function handler17(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(17, "bad request"); }
  return ctx.json({ id: 17, value: parsed.value, at: Date.now() });
}

export function handler18(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(18, "bad request"); }
  return ctx.json({ id: 18, value: parsed.value, at: Date.now() });
}

export function handler19(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(19, "bad request"); }
  return ctx.json({ id: 19, value: parsed.value, at: Date.now() });
}

export function handler20(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(20, "bad request"); }
  return ctx.json({ id: 20, value: parsed.value, at: Date.now() });
}

export function handler21(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(21, "bad request"); }
  return ctx.json({ id: 21, value: parsed.value, at: Date.now() });
}

export function handler22(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(22, "bad request"); }
  return ctx.json({ id: 22, value: parsed.value, at: Date.now() });
}

export function handler23(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(23, "bad request"); }
  return ctx.json({ id: 23, value: parsed.value, at: Date.now() });
}

export function handler24(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(24, "bad request"); }
  return ctx.json({ id: 24, value: parsed.value, at: Date.now() });
}

export function handler25(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(25, "bad request"); }
  return ctx.json({ id: 25, value: parsed.value, at: Date.now() });
}

export function handler26(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(26, "bad request"); }
  return ctx.json({ id: 26, value: parsed.value, at: Date.now() });
}

export function handler27(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(27, "bad request"); }
  return ctx.json({ id: 27, value: parsed.value, at: Date.now() });
}

export function handler28(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(28, "bad request"); }
  return ctx.json({ id: 28, value: parsed.value, at: Date.now() });
}

export function handler29(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(29, "bad request"); }
  return ctx.json({ id: 29, value: parsed.value, at: Date.now() });
}

export function handler30(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(30, "bad request"); }
  return ctx.json({ id: 30, value: parsed.value, at: Date.now() });
}

export function handler31(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(31, "bad request"); }
  return ctx.json({ id: 31, value: parsed.value, at: Date.now() });
}

export function handler32(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(32, "bad request"); }
  return ctx.json({ id: 32, value: parsed.value, at: Date.now() });
}

export function handler33(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(33, "bad request"); }
  return ctx.json({ id: 33, value: parsed.value, at: Date.now() });
}

export function handler34(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(34, "bad request"); }
  return ctx.json({ id: 34, value: parsed.value, at: Date.now() });
}

export function handler35(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(35, "bad request"); }
  return ctx.json({ id: 35, value: parsed.value, at: Date.now() });
}

export function handler36(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(36, "bad request"); }
  return ctx.json({ id: 36, value: parsed.value, at: Date.now() });
}

export function handler37(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(37, "bad request"); }
  return ctx.json({ id: 37, value: parsed.value, at: Date.now() });
}

export function handler38(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(38, "bad request"); }
  return ctx.json({ id: 38, value: parsed.value, at: Date.now() });
}

export function handler39(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(39, "bad request"); }
  return ctx.json({ id: 39, value: parsed.value, at: Date.now() });
}

export function handler40(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(40, "bad request"); }
  return ctx.json({ id: 40, value: parsed.value, at: Date.now() });
}

export function handler41(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(41, "bad request"); }
  return ctx.json({ id: 41, value: parsed.value, at: Date.now() });
}

export function handler42(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(42, "bad request"); }
  return ctx.json({ id: 42, value: parsed.value, at: Date.now() });
}

export function handler43(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(43, "bad request"); }
  return ctx.json({ id: 43, value: parsed.value, at: Date.now() });
}

export function handler44(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(44, "bad request"); }
  return ctx.json({ id: 44, value: parsed.value, at: Date.now() });
}

export function handler45(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(45, "bad request"); }
  return ctx.json({ id: 45, value: parsed.value, at: Date.now() });
}

export function handler46(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(46, "bad request"); }
  return ctx.json({ id: 46, value: parsed.value, at: Date.now() });
}

export function handler47(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(47, "bad request"); }
  return ctx.json({ id: 47, value: parsed.value, at: Date.now() });
}

export function handler48(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(48, "bad request"); }
  return ctx.json({ id: 48, value: parsed.value, at: Date.now() });
}

export function handler49(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(49, "bad request"); }
  return ctx.json({ id: 49, value: parsed.value, at: Date.now() });
}

export function handler50(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(50, "bad request"); }
  return ctx.json({ id: 50, value: parsed.value, at: Date.now() });
}

export function handler51(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(51, "bad request"); }
  return ctx.json({ id: 51, value: parsed.value, at: Date.now() });
}

export function handler52(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(52, "bad request"); }
  return ctx.json({ id: 52, value: parsed.value, at: Date.now() });
}

export function handler53(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(53, "bad request"); }
  return ctx.json({ id: 53, value: parsed.value, at: Date.now() });
}

export function handler54(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(54, "bad request"); }
  return ctx.json({ id: 54, value: parsed.value, at: Date.now() });
}

export function handler55(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(55, "bad request"); }
  return ctx.json({ id: 55, value: parsed.value, at: Date.now() });
}

export function handler56(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(56, "bad request"); }
  return ctx.json({ id: 56, value: parsed.value, at: Date.now() });
}

export function handler57(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(57, "bad request"); }
  return ctx.json({ id: 57, value: parsed.value, at: Date.now() });
}

export function handler58(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(58, "bad request"); }
  return ctx.json({ id: 58, value: parsed.value, at: Date.now() });
}

export function handler59(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(59, "bad request"); }
  return ctx.json({ id: 59, value: parsed.value, at: Date.now() });
}

export function handler60(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(60, "bad request"); }
  return ctx.json({ id: 60, value: parsed.value, at: Date.now() });
}

export function handler61(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(61, "bad request"); }
  return ctx.json({ id: 61, value: parsed.value, at: Date.now() });
}

export function handler62(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(62, "bad request"); }
  return ctx.json({ id: 62, value: parsed.value, at: Date.now() });
}

export function handler63(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(63, "bad request"); }
  return ctx.json({ id: 63, value: parsed.value, at: Date.now() });
}

export function handler64(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(64, "bad request"); }
  return ctx.json({ id: 64, value: parsed.value, at: Date.now() });
}

export function handler65(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(65, "bad request"); }
  return ctx.json({ id: 65, value: parsed.value, at: Date.now() });
}

export function handler66(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(66, "bad request"); }
  return ctx.json({ id: 66, value: parsed.value, at: Date.now() });
}

export function handler67(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(67, "bad request"); }
  return ctx.json({ id: 67, value: parsed.value, at: Date.now() });
}

export function handler68(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(68, "bad request"); }
  return ctx.json({ id: 68, value: parsed.value, at: Date.now() });
}

export function handler69(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(69, "bad request"); }
  return ctx.json({ id: 69, value: parsed.value, at: Date.now() });
}

export function handler70(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(70, "bad request"); }
  return ctx.json({ id: 70, value: parsed.value, at: Date.now() });
}

export function handler71(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(71, "bad request"); }
  return ctx.json({ id: 71, value: parsed.value, at: Date.now() });
}

export function handler72(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(72, "bad request"); }
  return ctx.json({ id: 72, value: parsed.value, at: Date.now() });
}

export function handler73(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(73, "bad request"); }
  return ctx.json({ id: 73, value: parsed.value, at: Date.now() });
}

export function handler74(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(74, "bad request"); }
  return ctx.json({ id: 74, value: parsed.value, at: Date.now() });
}

export function handler75(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(75, "bad request"); }
  return ctx.json({ id: 75, value: parsed.value, at: Date.now() });
}

export function handler76(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(76, "bad request"); }
  return ctx.json({ id: 76, value: parsed.value, at: Date.now() });
}

export function handler77(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(77, "bad request"); }
  return ctx.json({ id: 77, value: parsed.value, at: Date.now() });
}

export function handler78(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(78, "bad request"); }
  return ctx.json({ id: 78, value: parsed.value, at: Date.now() });
}

export function handler79(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(79, "bad request"); }
  return ctx.json({ id: 79, value: parsed.value, at: Date.now() });
}

export function handler80(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(80, "bad request"); }
  return ctx.json({ id: 80, value: parsed.value, at: Date.now() });
}

export function handler81(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(81, "bad request"); }
  return ctx.json({ id: 81, value: parsed.value, at: Date.now() });
}

export function handler82(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(82, "bad request"); }
  return ctx.json({ id: 82, value: parsed.value, at: Date.now() });
}

export function handler83(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(83, "bad request"); }
  return ctx.json({ id: 83, value: parsed.value, at: Date.now() });
}

export function handler84(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(84, "bad request"); }
  return ctx.json({ id: 84, value: parsed.value, at: Date.now() });
}

export function handler85(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(85, "bad request"); }
  return ctx.json({ id: 85, value: parsed.value, at: Date.now() });
}

export function handler86(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(86, "bad request"); }
  return ctx.json({ id: 86, value: parsed.value, at: Date.now() });
}

export function handler87(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(87, "bad request"); }
  return ctx.json({ id: 87, value: parsed.value, at: Date.now() });
}

export function handler88(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(88, "bad request"); }
  return ctx.json({ id: 88, value: parsed.value, at: Date.now() });
}

export function handler89(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(89, "bad request"); }
  return ctx.json({ id: 89, value: parsed.value, at: Date.now() });
}

export function handler90(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(90, "bad request"); }
  return ctx.json({ id: 90, value: parsed.value, at: Date.now() });
}

export function handler91(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(91, "bad request"); }
  return ctx.json({ id: 91, value: parsed.value, at: Date.now() });
}

export function handler92(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(92, "bad request"); }
  return ctx.json({ id: 92, value: parsed.value, at: Date.now() });
}

export function handler93(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(93, "bad request"); }
  return ctx.json({ id: 93, value: parsed.value, at: Date.now() });
}

export function handler94(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(94, "bad request"); }
  return ctx.json({ id: 94, value: parsed.value, at: Date.now() });
}

export function handler95(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(95, "bad request"); }
  return ctx.json({ id: 95, value: parsed.value, at: Date.now() });
}

export function handler96(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(96, "bad request"); }
  return ctx.json({ id: 96, value: parsed.value, at: Date.now() });
}

export function handler97(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(97, "bad request"); }
  return ctx.json({ id: 97, value: parsed.value, at: Date.now() });
}

export function handler98(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(98, "bad request"); }
  return ctx.json({ id: 98, value: parsed.value, at: Date.now() });
}

export function handler99(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(99, "bad request"); }
  return ctx.json({ id: 99, value: parsed.value, at: Date.now() });
}

export function handler100(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(100, "bad request"); }
  return ctx.json({ id: 100, value: parsed.value, at: Date.now() });
}

export function handler101(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(101, "bad request"); }
  return ctx.json({ id: 101, value: parsed.value, at: Date.now() });
}

export function handler102(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(102, "bad request"); }
  return ctx.json({ id: 102, value: parsed.value, at: Date.now() });
}

export function handler103(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(103, "bad request"); }
  return ctx.json({ id: 103, value: parsed.value, at: Date.now() });
}

export function handler104(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(104, "bad request"); }
  return ctx.json({ id: 104, value: parsed.value, at: Date.now() });
}

export function handler105(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(105, "bad request"); }
  return ctx.json({ id: 105, value: parsed.value, at: Date.now() });
}

export function handler106(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(106, "bad request"); }
  return ctx.json({ id: 106, value: parsed.value, at: Date.now() });
}

export function handler107(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(107, "bad request"); }
  return ctx.json({ id: 107, value: parsed.value, at: Date.now() });
}

export function handler108(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(108, "bad request"); }
  return ctx.json({ id: 108, value: parsed.value, at: Date.now() });
}

export function handler109(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(109, "bad request"); }
  return ctx.json({ id: 109, value: parsed.value, at: Date.now() });
}

export function handler110(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(110, "bad request"); }
  return ctx.json({ id: 110, value: parsed.value, at: Date.now() });
}

export function handler111(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(111, "bad request"); }
  return ctx.json({ id: 111, value: parsed.value, at: Date.now() });
}

export function handler112(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(112, "bad request"); }
  return ctx.json({ id: 112, value: parsed.value, at: Date.now() });
}

export function handler113(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(113, "bad request"); }
  return ctx.json({ id: 113, value: parsed.value, at: Date.now() });
}

export function handler114(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(114, "bad request"); }
  return ctx.json({ id: 114, value: parsed.value, at: Date.now() });
}

export function handler115(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(115, "bad request"); }
  return ctx.json({ id: 115, value: parsed.value, at: Date.now() });
}

export function handler116(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(116, "bad request"); }
  return ctx.json({ id: 116, value: parsed.value, at: Date.now() });
}

export function handler117(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(117, "bad request"); }
  return ctx.json({ id: 117, value: parsed.value, at: Date.now() });
}

export function handler118(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(118, "bad request"); }
  return ctx.json({ id: 118, value: parsed.value, at: Date.now() });
}

export function handler119(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(119, "bad request"); }
  return ctx.json({ id: 119, value: parsed.value, at: Date.now() });
}

export function handler120(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(120, "bad request"); }
  return ctx.json({ id: 120, value: parsed.value, at: Date.now() });
}

export function handler121(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(121, "bad request"); }
  return ctx.json({ id: 121, value: parsed.value, at: Date.now() });
}

export function handler122(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(122, "bad request"); }
  return ctx.json({ id: 122, value: parsed.value, at: Date.now() });
}

export function handler123(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(123, "bad request"); }
  return ctx.json({ id: 123, value: parsed.value, at: Date.now() });
}

export function handler124(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(124, "bad request"); }
  return ctx.json({ id: 124, value: parsed.value, at: Date.now() });
}

export function handler125(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(125, "bad request"); }
  return ctx.json({ id: 125, value: parsed.value, at: Date.now() });
}

export function handler126(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(126, "bad request"); }
  return ctx.json({ id: 126, value: parsed.value, at: Date.now() });
}

export function handler127(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(127, "bad request"); }
  return ctx.json({ id: 127, value: parsed.value, at: Date.now() });
}

export function handler128(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(128, "bad request"); }
  return ctx.json({ id: 128, value: parsed.value, at: Date.now() });
}

export function handler129(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(129, "bad request"); }
  return ctx.json({ id: 129, value: parsed.value, at: Date.now() });
}

export function handler130(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(130, "bad request"); }
  return ctx.json({ id: 130, value: parsed.value, at: Date.now() });
}

export function handler131(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(131, "bad request"); }
  return ctx.json({ id: 131, value: parsed.value, at: Date.now() });
}

export function handler132(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(132, "bad request"); }
  return ctx.json({ id: 132, value: parsed.value, at: Date.now() });
}

export function handler133(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(133, "bad request"); }
  return ctx.json({ id: 133, value: parsed.value, at: Date.now() });
}

export function handler134(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(134, "bad request"); }
  return ctx.json({ id: 134, value: parsed.value, at: Date.now() });
}

export function handler135(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(135, "bad request"); }
  return ctx.json({ id: 135, value: parsed.value, at: Date.now() });
}

export function handler136(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(136, "bad request"); }
  return ctx.json({ id: 136, value: parsed.value, at: Date.now() });
}

export function handler137(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(137, "bad request"); }
  return ctx.json({ id: 137, value: parsed.value, at: Date.now() });
}

export function handler138(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(138, "bad request"); }
  return ctx.json({ id: 138, value: parsed.value, at: Date.now() });
}

export function handler139(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(139, "bad request"); }
  return ctx.json({ id: 139, value: parsed.value, at: Date.now() });
}

export function handler140(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(140, "bad request"); }
  return ctx.json({ id: 140, value: parsed.value, at: Date.now() });
}

export function handler141(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(141, "bad request"); }
  return ctx.json({ id: 141, value: parsed.value, at: Date.now() });
}

export function handler142(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(142, "bad request"); }
  return ctx.json({ id: 142, value: parsed.value, at: Date.now() });
}

export function handler143(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(143, "bad request"); }
  return ctx.json({ id: 143, value: parsed.value, at: Date.now() });
}

export function handler144(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(144, "bad request"); }
  return ctx.json({ id: 144, value: parsed.value, at: Date.now() });
}

export function handler145(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(145, "bad request"); }
  return ctx.json({ id: 145, value: parsed.value, at: Date.now() });
}

export function handler146(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(146, "bad request"); }
  return ctx.json({ id: 146, value: parsed.value, at: Date.now() });
}

export function handler147(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(147, "bad request"); }
  return ctx.json({ id: 147, value: parsed.value, at: Date.now() });
}

export function handler148(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(148, "bad request"); }
  return ctx.json({ id: 148, value: parsed.value, at: Date.now() });
}

export function handler149(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(149, "bad request"); }
  return ctx.json({ id: 149, value: parsed.value, at: Date.now() });
}

export function handler150(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(150, "bad request"); }
  return ctx.json({ id: 150, value: parsed.value, at: Date.now() });
}

export function handler151(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(151, "bad request"); }
  return ctx.json({ id: 151, value: parsed.value, at: Date.now() });
}

export function handler152(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(152, "bad request"); }
  return ctx.json({ id: 152, value: parsed.value, at: Date.now() });
}

export function handler153(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(153, "bad request"); }
  return ctx.json({ id: 153, value: parsed.value, at: Date.now() });
}

export function handler154(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(154, "bad request"); }
  return ctx.json({ id: 154, value: parsed.value, at: Date.now() });
}

export function handler155(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(155, "bad request"); }
  return ctx.json({ id: 155, value: parsed.value, at: Date.now() });
}

export function handler156(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(156, "bad request"); }
  return ctx.json({ id: 156, value: parsed.value, at: Date.now() });
}

export function handler157(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(157, "bad request"); }
  return ctx.json({ id: 157, value: parsed.value, at: Date.now() });
}

export function handler158(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(158, "bad request"); }
  return ctx.json({ id: 158, value: parsed.value, at: Date.now() });
}

export function handler159(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(159, "bad request"); }
  return ctx.json({ id: 159, value: parsed.value, at: Date.now() });
}

export function handler160(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(160, "bad request"); }
  return ctx.json({ id: 160, value: parsed.value, at: Date.now() });
}

export function handler161(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(161, "bad request"); }
  return ctx.json({ id: 161, value: parsed.value, at: Date.now() });
}

export function handler162(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(162, "bad request"); }
  return ctx.json({ id: 162, value: parsed.value, at: Date.now() });
}

export function handler163(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(163, "bad request"); }
  return ctx.json({ id: 163, value: parsed.value, at: Date.now() });
}

export function handler164(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(164, "bad request"); }
  return ctx.json({ id: 164, value: parsed.value, at: Date.now() });
}

export function handler165(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(165, "bad request"); }
  return ctx.json({ id: 165, value: parsed.value, at: Date.now() });
}

export function handler166(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(166, "bad request"); }
  return ctx.json({ id: 166, value: parsed.value, at: Date.now() });
}

export function handler167(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(167, "bad request"); }
  return ctx.json({ id: 167, value: parsed.value, at: Date.now() });
}

export function handler168(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(168, "bad request"); }
  return ctx.json({ id: 168, value: parsed.value, at: Date.now() });
}

export function handler169(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(169, "bad request"); }
  return ctx.json({ id: 169, value: parsed.value, at: Date.now() });
}

export function handler170(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(170, "bad request"); }
  return ctx.json({ id: 170, value: parsed.value, at: Date.now() });
}

export function handler171(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(171, "bad request"); }
  return ctx.json({ id: 171, value: parsed.value, at: Date.now() });
}

export function handler172(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(172, "bad request"); }
  return ctx.json({ id: 172, value: parsed.value, at: Date.now() });
}

export function handler173(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(173, "bad request"); }
  return ctx.json({ id: 173, value: parsed.value, at: Date.now() });
}

export function handler174(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(174, "bad request"); }
  return ctx.json({ id: 174, value: parsed.value, at: Date.now() });
}

export function handler175(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(175, "bad request"); }
  return ctx.json({ id: 175, value: parsed.value, at: Date.now() });
}

export function handler176(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(176, "bad request"); }
  return ctx.json({ id: 176, value: parsed.value, at: Date.now() });
}

export function handler177(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(177, "bad request"); }
  return ctx.json({ id: 177, value: parsed.value, at: Date.now() });
}

export function handler178(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(178, "bad request"); }
  return ctx.json({ id: 178, value: parsed.value, at: Date.now() });
}

export function handler179(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(179, "bad request"); }
  return ctx.json({ id: 179, value: parsed.value, at: Date.now() });
}

export function handler180(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(180, "bad request"); }
  return ctx.json({ id: 180, value: parsed.value, at: Date.now() });
}

export function handler181(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(181, "bad request"); }
  return ctx.json({ id: 181, value: parsed.value, at: Date.now() });
}

export function handler182(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(182, "bad request"); }
  return ctx.json({ id: 182, value: parsed.value, at: Date.now() });
}

export function handler183(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(183, "bad request"); }
  return ctx.json({ id: 183, value: parsed.value, at: Date.now() });
}

export function handler184(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(184, "bad request"); }
  return ctx.json({ id: 184, value: parsed.value, at: Date.now() });
}

export function handler185(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(185, "bad request"); }
  return ctx.json({ id: 185, value: parsed.value, at: Date.now() });
}

export function handler186(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(186, "bad request"); }
  return ctx.json({ id: 186, value: parsed.value, at: Date.now() });
}

export function handler187(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(187, "bad request"); }
  return ctx.json({ id: 187, value: parsed.value, at: Date.now() });
}

export function handler188(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(188, "bad request"); }
  return ctx.json({ id: 188, value: parsed.value, at: Date.now() });
}

export function handler189(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(189, "bad request"); }
  return ctx.json({ id: 189, value: parsed.value, at: Date.now() });
}

export function handler190(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(190, "bad request"); }
  return ctx.json({ id: 190, value: parsed.value, at: Date.now() });
}

export function handler191(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(191, "bad request"); }
  return ctx.json({ id: 191, value: parsed.value, at: Date.now() });
}

export function handler192(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(192, "bad request"); }
  return ctx.json({ id: 192, value: parsed.value, at: Date.now() });
}

export function handler193(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(193, "bad request"); }
  return ctx.json({ id: 193, value: parsed.value, at: Date.now() });
}

export function handler194(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(194, "bad request"); }
  return ctx.json({ id: 194, value: parsed.value, at: Date.now() });
}

export function handler195(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(195, "bad request"); }
  return ctx.json({ id: 195, value: parsed.value, at: Date.now() });
}

export function handler196(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(196, "bad request"); }
  return ctx.json({ id: 196, value: parsed.value, at: Date.now() });
}

export function handler197(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(197, "bad request"); }
  return ctx.json({ id: 197, value: parsed.value, at: Date.now() });
}

export function handler198(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(198, "bad request"); }
  return ctx.json({ id: 198, value: parsed.value, at: Date.now() });
}

export function handler199(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(199, "bad request"); }
  return ctx.json({ id: 199, value: parsed.value, at: Date.now() });
}

export function handler200(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(200, "bad request"); }
  return ctx.json({ id: 200, value: parsed.value, at: Date.now() });
}

export function handler201(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(201, "bad request"); }
  return ctx.json({ id: 201, value: parsed.value, at: Date.now() });
}

export function handler202(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(202, "bad request"); }
  return ctx.json({ id: 202, value: parsed.value, at: Date.now() });
}

export function handler203(input: Request, ctx: Context): Response {
  const parsed = schema16.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(203, "bad request"); }
  return ctx.json({ id: 203, value: parsed.value, at: Date.now() });
}

export function handler204(input: Request, ctx: Context): Response {
  const parsed = schema0.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(204, "bad request"); }
  return ctx.json({ id: 204, value: parsed.value, at: Date.now() });
}

export function handler205(input: Request, ctx: Context): Response {
  const parsed = schema1.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(205, "bad request"); }
  return ctx.json({ id: 205, value: parsed.value, at: Date.now() });
}

export function handler206(input: Request, ctx: Context): Response {
  const parsed = schema2.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(206, "bad request"); }
  return ctx.json({ id: 206, value: parsed.value, at: Date.now() });
}

export function handler207(input: Request, ctx: Context): Response {
  const parsed = schema3.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(207, "bad request"); }
  return ctx.json({ id: 207, value: parsed.value, at: Date.now() });
}

export function handler208(input: Request, ctx: Context): Response {
  const parsed = schema4.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(208, "bad request"); }
  return ctx.json({ id: 208, value: parsed.value, at: Date.now() });
}

export function handler209(input: Request, ctx: Context): Response {
  const parsed = schema5.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(209, "bad request"); }
  return ctx.json({ id: 209, value: parsed.value, at: Date.now() });
}

export function handler210(input: Request, ctx: Context): Response {
  const parsed = schema6.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(210, "bad request"); }
  return ctx.json({ id: 210, value: parsed.value, at: Date.now() });
}

export function handler211(input: Request, ctx: Context): Response {
  const parsed = schema7.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(211, "bad request"); }
  return ctx.json({ id: 211, value: parsed.value, at: Date.now() });
}

export function handler212(input: Request, ctx: Context): Response {
  const parsed = schema8.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(212, "bad request"); }
  return ctx.json({ id: 212, value: parsed.value, at: Date.now() });
}

export function handler213(input: Request, ctx: Context): Response {
  const parsed = schema9.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(213, "bad request"); }
  return ctx.json({ id: 213, value: parsed.value, at: Date.now() });
}

export function handler214(input: Request, ctx: Context): Response {
  const parsed = schema10.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(214, "bad request"); }
  return ctx.json({ id: 214, value: parsed.value, at: Date.now() });
}

export function handler215(input: Request, ctx: Context): Response {
  const parsed = schema11.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(215, "bad request"); }
  return ctx.json({ id: 215, value: parsed.value, at: Date.now() });
}

export function handler216(input: Request, ctx: Context): Response {
  const parsed = schema12.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(216, "bad request"); }
  return ctx.json({ id: 216, value: parsed.value, at: Date.now() });
}

export function handler217(input: Request, ctx: Context): Response {
  const parsed = schema13.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(217, "bad request"); }
  return ctx.json({ id: 217, value: parsed.value, at: Date.now() });
}

export function handler218(input: Request, ctx: Context): Response {
  const parsed = schema14.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(218, "bad request"); }
  return ctx.json({ id: 218, value: parsed.value, at: Date.now() });
}

export function handler219(input: Request, ctx: Context): Response {
  const parsed = schema15.parse(input.body); // validate first
  if (!parsed.ok) { return ctx.fail(219, "bad request"); }
  return ctx.json({ id: 219, value: parsed.value, at: Date.now() });
}

```

That covers every branch.
