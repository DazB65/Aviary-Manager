import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const TRIAL_EXPIRED_MSG = "TRIAL_EXPIRED";
const TRIAL_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

/** Requires an active trial OR a paid plan. Admins always pass. */
const requireActive = t.middleware(async opts => {
  const { ctx, next } = opts;
  const user = ctx.user;

  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Admins and paid users always have access
  if (user.role === "admin" || user.plan === "pro") {
    return next({ ctx: { ...ctx, user } });
  }

  // Free plan — check trial window
  // planExpiresAt is set on registration; fall back to createdAt + 7 days for legacy accounts
  const trialEnd = user.planExpiresAt
    ? new Date(user.planExpiresAt)
    : new Date(user.createdAt.getTime() + TRIAL_DAYS_MS);

  if (trialEnd > new Date()) {
    return next({ ctx: { ...ctx, user } });
  }

  throw new TRPCError({ code: "FORBIDDEN", message: TRIAL_EXPIRED_MSG });
});

export const activeProcedure = t.procedure.use(requireActive);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
