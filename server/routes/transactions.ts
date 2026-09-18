import { z } from 'zod'
import type {
  ImportResponse,
  TransactionMutationResponse,
} from '../../shared/api/contracts'
import { type RouteHandler, requireParam } from '../http/context'
import { emptyResponse, jsonResponse } from '../http/response'
import { readJson } from '../validation/body'
import {
  transactionInputSchema,
  transactionUpdateSchema,
} from '../validation/transactions'

const importSchema = z.object({
  mode: z.enum(['append', 'replace']),
  transactions: z.array(transactionInputSchema).min(1).max(5000),
})

export const createTransaction: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const input = await readJson(context.request, transactionInputSchema)
  const transaction = await context.services.transactionsService.create(portfolio.id, input)
  const body: TransactionMutationResponse = { transaction }
  return jsonResponse(body, 201)
}

export const updateTransaction: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const input = await readJson(context.request, transactionUpdateSchema)
  const transaction = await context.services.transactionsService.update(
    portfolio.id,
    requireParam(context, 'transactionId'),
    input,
  )
  const body: TransactionMutationResponse = { transaction }
  return jsonResponse(body)
}

export const deleteTransaction: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  await context.services.transactionsService.remove(
    portfolio.id,
    requireParam(context, 'transactionId'),
  )
  return emptyResponse(204)
}

export const importTransactions: RouteHandler = async (context) => {
  const userId = await context.getUserId()
  const portfolio = await context.services.portfolios.requireOwned(
    userId,
    requireParam(context, 'id'),
  )
  const payload = await readJson(context.request, importSchema)
  const result =
    payload.mode === 'replace'
      ? await context.services.transactionsService.replaceAll(
          portfolio.id,
          payload.transactions,
        )
      : await context.services.transactionsService.createMany(
          portfolio.id,
          payload.transactions,
        )
  const body: ImportResponse = { inserted: result.inserted, mode: payload.mode }
  return jsonResponse(body, 201)
}
