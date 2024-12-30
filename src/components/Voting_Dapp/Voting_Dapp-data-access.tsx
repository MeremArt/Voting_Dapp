'use client'

import { getVotingDappProgram, getVotingDappProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useVotingDappProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getVotingDappProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVotingDappProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['Voting_Dapp', 'all', { cluster }],
    queryFn: () => program.account.Voting_Dapp.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initialize = useMutation({
    mutationKey: ['Voting_Dapp', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ Voting_Dapp: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useVotingDappProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useVotingDappProgram()

  const accountQuery = useQuery({
    queryKey: ['Voting_Dapp', 'fetch', { cluster, account }],
    queryFn: () => program.account.Voting_Dapp.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['Voting_Dapp', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ Voting_Dapp: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['Voting_Dapp', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ Voting_Dapp: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['Voting_Dapp', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ Voting_Dapp: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['Voting_Dapp', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ Voting_Dapp: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
