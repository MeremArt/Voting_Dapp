"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { useMemo } from "react";
import * as anchor from "@project-serum/anchor";
import idl from "../../../anchor/target/idl/Voting_Dapp.json";
import {
  Program,
  AnchorProvider,
  web3,
  utils,
  BN,
  setProvider,
} from "@coral-xyz/anchor";

// Constants for PDA seeds
const POLL_SEED = Buffer.from("poll");
const VOTER_SEED = Buffer.from("voter");
const CANDIDATE_SEED = Buffer.from("candidate");

export function useVotingDappProgram() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  function convertIdl(rawIdl: any): any {
    // Add required top-level fields
    const convertedIdl = {
      ...rawIdl,
      version: rawIdl.metadata?.version || "0.1.0",
      name: rawIdl.metadata?.name || "voting_dapp",
    };

    // Fix field names in account types
    convertedIdl.accounts = convertedIdl.accounts.map((acc: any) => {
      // Add type field with fields from corresponding type in types array
      const accType = convertedIdl.types.find((t: any) => t.name === acc.name);
      return {
        ...acc,
        type: accType?.type,
      };
    });

    return convertedIdl;
  }
  const idl_object = idl;
  const wallet = useWallet();
  const programId = useMemo(() => new PublicKey(idl.address), []);
  // Program ID from your IDL

  const program = useMemo(() => {
    if (!publicKey) return null;

    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async (tx: Transaction) => {
          const { blockhash } = await connection.getLatestBlockhash();
          tx.recentBlockhash = blockhash;
          tx.feePayer = publicKey;
          const signedTx = await sendTransaction(tx, connection);
          // Note: We don't return the transaction with signature here as that's not what Anchor expects
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          // In a real implementation, this would sign all transactions
          // For now, we just return the transactions as is
          return txs;
        },
      },
      { commitment: "processed" }
    );
    try {
      return new anchor.Program(idl_object, programId, provider);
    } catch (error) {
      console.error("Error creating program:", error);
      console.log("IDL:", JSON.stringify(idl_object, null, 2));
      return null;
    }
    return new anchor.Program(idl_object, programId, provider);
  }, [connection, idl_object, programId, publicKey, sendTransaction]);

  return { program, programId };
}

// Custom hook to create a new poll
export function useCreatePoll() {
  const { program, programId } = useVotingDappProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  return useMutation({
    mutationFn: async ({
      pollId,
      description,
      pollStart,
      pollEnd,
    }: {
      pollId: number;
      description: string;
      pollStart: number;
      pollEnd: number;
    }) => {
      if (!program || !publicKey) {
        throw new Error("Program or wallet not connected");
      }

      // Convert pollId to a buffer
      const pollIdBuffer = new BN(pollId).toArrayLike(Buffer, "le", 8);

      // Derive the poll address using POLL_SEED as well
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [POLL_SEED, pollIdBuffer],
        programId
      );

      console.log("Creating poll with address:", pollPDA.toString());

      const tx = await program.methods
        .initializePoll(
          new BN(pollId),
          description,
          new BN(pollStart),
          new BN(pollEnd)
        )
        .accounts({
          poll: pollPDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return {
        signature,
        pollAddress: pollPDA.toString(),
      };
    },
  });
}

// Custom hook to register a candidate
export function useRegisterCandidate() {
  const { program } = useVotingDappProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  return useMutation({
    mutationFn: async ({
      poll,
      candidateName,
    }: {
      poll: PublicKey;
      candidateName: string;
    }) => {
      if (!program || !publicKey) {
        throw new Error("Program or wallet not connected");
      }

      // Fetch the poll account to get candidate_amount
      const pollAccount = (await program.account.poll.fetch(poll)) as {
        candidateAmount: anchor.BN;
      };

      // Derive the candidate address
      const [candidatePDA] = PublicKey.findProgramAddressSync(
        [
          CANDIDATE_SEED,
          poll.toBuffer(),
          new anchor.BN(pollAccount.candidateAmount.toNumber()).toArrayLike(
            Buffer,
            "le",
            8
          ),
        ],
        program.programId
      );

      const tx = await program.methods
        .registerCandidate(candidateName)
        .accounts({
          poll,
          candidate: candidatePDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return {
        signature,
        candidateAddress: candidatePDA.toString(),
      };
    },
  });
}

// Custom hook to cast a vote
export function useCastVote() {
  const { program } = useVotingDappProgram();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  return useMutation({
    mutationFn: async ({
      poll,
      candidateId,
    }: {
      poll: PublicKey;
      candidateId: number;
    }) => {
      if (!program || !publicKey) {
        throw new Error("Program or wallet not connected");
      }

      // Get the poll data to derive PDAs
      const pollAccount = await program.account.poll.fetch(poll);

      // Find poll PDA using poll_id
      const pollIdBuffer = new anchor.BN(
        (pollAccount as { pollId: anchor.BN }).pollId.toNumber()
      ).toArrayLike(Buffer, "le", 8);
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [POLL_SEED, pollIdBuffer],
        program.programId
      );

      // Find voter PDA
      const [voterPDA] = PublicKey.findProgramAddressSync(
        [VOTER_SEED, poll.toBuffer(), publicKey.toBuffer()],
        program.programId
      );

      // Find candidate PDA
      const candidateIdBuffer = new anchor.BN(candidateId).toArrayLike(
        Buffer,
        "le",
        4
      );
      const [candidatePDA] = PublicKey.findProgramAddressSync(
        [CANDIDATE_SEED, poll.toBuffer(), candidateIdBuffer],
        program.programId
      );

      const tx = await program.methods
        .castVote(candidateId)
        .accounts({
          poll: pollPDA,
          voter: voterPDA,
          candidate: candidatePDA,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);

      return { signature };
    },
  });
}

// Custom hook to fetch all polls
export function usePolls() {
  const { program } = useVotingDappProgram();
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["polls"],
    queryFn: async () => {
      if (!program) {
        throw new Error("Program not initialized");
      }

      const pollAccounts = await program.account.poll.all();
      return pollAccounts.map((account) => {
        const pollAccount = account.account as {
          pollId: anchor.BN;
          pollStart: anchor.BN;
          pollEnd: anchor.BN;
          candidateAmount: anchor.BN;
          votesCast: anchor.BN;
        };

        return {
          address: account.publicKey.toString(),
          ...pollAccount,
          pollId: pollAccount.pollId.toNumber(),
          pollStart: pollAccount.pollStart.toNumber(),
          pollEnd: pollAccount.pollEnd.toNumber(),
          candidateAmount: pollAccount.candidateAmount.toNumber(),
          votesCast: pollAccount.votesCast.toNumber(),
        };
      });
    },
    enabled: !!program,
  });
}

// Custom hook to fetch candidates for a poll
export function usePollCandidates(pollAddress: string | null) {
  const { program } = useVotingDappProgram();

  return useQuery({
    queryKey: ["candidates", pollAddress],
    queryFn: async () => {
      if (!program || !pollAddress) {
        throw new Error("Program not initialized or poll address not provided");
      }

      const pollPubkey = new PublicKey(pollAddress);

      // Get all candidate accounts filtered by the poll
      const candidateAccounts = await program.account.candidate.all([
        {
          memcmp: {
            offset: 8, // Skip the discriminator
            bytes: pollPubkey.toBase58(),
          },
        },
      ]);

      return candidateAccounts.map((account) => ({
        address: account.publicKey.toString(),
        poll: (account.account as { poll: PublicKey }).poll.toString(),
        candidateName: (account.account as { candidateName: string })
          .candidateName,
        voteCount: (
          account.account as { voteCount: anchor.BN }
        ).voteCount.toNumber(),
      }));
    },
    enabled: !!program && !!pollAddress,
  });
}

// Custom hook to check if a user has voted
export function useHasVoted(pollAddress: string | null) {
  const { program } = useVotingDappProgram();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["hasVoted", pollAddress, publicKey?.toString()],
    queryFn: async () => {
      if (!program || !pollAddress || !publicKey) {
        return false;
      }

      const pollPubkey = new PublicKey(pollAddress);

      // Find voter PDA
      const [voterPDA] = PublicKey.findProgramAddressSync(
        [VOTER_SEED, pollPubkey.toBuffer(), publicKey.toBuffer()],
        program.programId
      );

      try {
        const voterAccount = await program.account.voter.fetch(voterPDA);
        return (voterAccount as { hasVoted: boolean }).hasVoted;
      } catch (error) {
        // Account doesn't exist, user hasn't voted
        return false;
      }
    },
    enabled: !!program && !!pollAddress && !!publicKey,
  });
}
