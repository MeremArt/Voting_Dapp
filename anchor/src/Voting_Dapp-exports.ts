// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import VotingDappIDL from '../target/idl/Voting_Dapp.json'
import type { VotingDapp } from '../target/types/Voting_Dapp'

// Re-export the generated IDL and type
export { VotingDapp, VotingDappIDL }

// The programId is imported from the program IDL.
export const VOTING_DAPP_PROGRAM_ID = new PublicKey(VotingDappIDL.address)

// This is a helper function to get the VotingDapp Anchor program.
export function getVotingDappProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...VotingDappIDL, address: address ? address.toBase58() : VotingDappIDL.address } as VotingDapp, provider)
}

// This is a helper function to get the program ID for the VotingDapp program depending on the cluster.
export function getVotingDappProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the VotingDapp program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return VOTING_DAPP_PROGRAM_ID
  }
}
