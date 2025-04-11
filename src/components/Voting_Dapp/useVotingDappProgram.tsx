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
import React from "react";

// Constants for PDA seeds
const POLL_SEED = Buffer.from("poll");
const VOTER_SEED = Buffer.from("voter");
const CANDIDATE_SEED = Buffer.from("candidate");

export function useVotingDappProgram() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  React.useEffect(() => {
    console.log(
      "Wallet connection changed:",
      publicKey?.toString() || "not connected"
    );
  }, [publicKey]);
  // Enhanced conversion function to properly format the IDL for Anchor
  function convertIdl(rawIdl: any): any {
    // Add required top-level fields
    const convertedIdl = {
      ...rawIdl,
      version: rawIdl.metadata?.version || "0.1.0",
      name: rawIdl.metadata?.name || "voting_dapp",
    };

    // Convert account fields properly
    if (convertedIdl.accounts && convertedIdl.types) {
      convertedIdl.accounts = convertedIdl.accounts.map((acc: any) => {
        // Find the corresponding type definition
        const accType = convertedIdl.types.find(
          (t: any) => t.name === acc.name
        );
        if (accType && accType.type && accType.type.fields) {
          return {
            ...acc,
            type: accType.type,
          };
        }
        return acc;
      });
    }

    return convertedIdl;
  }

  const idl_object = idl;
  const wallet = useWallet();
  const programId = useMemo(() => new PublicKey(idl.address), []);

  const program = useMemo(() => {
    if (!publicKey) {
      console.log("No public key available");
      return null;
    }

    try {
      console.log("Creating provider with:", {
        connection: !!connection,
        publicKey: publicKey.toString(),
      });

      // Create provider
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            try {
              const { blockhash } = await connection.getLatestBlockhash();
              tx.recentBlockhash = blockhash;
              tx.feePayer = publicKey;
              await sendTransaction(tx, connection);
              return tx;
            } catch (err) {
              console.error("Error in signTransaction:", err);
              throw err;
            }
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs;
          },
        },
        { commitment: "processed" }
      );

      // Instead of using convertIdl, let's directly use a minimal version of the IDL
      // with just the required fields in the format Anchor expects
      const minimalIdl = {
        version: idl.metadata.version,
        name: idl.metadata.name,
        instructions: idl.instructions,
        accounts: idl.accounts,
        types: idl.types,
        errors: idl.errors,
      };

      console.log("Creating program with minimal IDL");
      const prog = new anchor.Program(
        idl as unknown as anchor.Idl, // Use original IDL structure
        programId,
        provider
      );

      console.log("Program created successfully");
      return prog;
    } catch (error) {
      console.error("Failed to create program:", error);
      // Log more details about what might be wrong
      console.log("IDL structure:", Object.keys(idl));
      console.log("Program ID:", programId.toString());
      return null;
    }
  }, [connection, programId, publicKey, sendTransaction]);

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
        [pollIdBuffer], // ✅ Matches program's seed definition
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
  const { program, programId } = useVotingDappProgram();
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

      // Fetch the poll account - use snake_case property names to match IDL
      const pollAccount = (await program.account.poll.fetch(poll)) as {
        candidate_amount: anchor.BN;
        poll_id: anchor.BN;
      };

      // Derive the candidate address using the correct seed format
      const [candidatePDA] = PublicKey.findProgramAddressSync(
        [
          CANDIDATE_SEED,
          poll.toBuffer(),
          new BN(pollAccount.candidate_amount).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // Find poll PDA using poll_id
      const pollIdBuffer = pollAccount.poll_id.toArrayLike(Buffer, "le", 8);
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [POLL_SEED, pollIdBuffer],
        program.programId
      );

      const tx = await program.methods
        .registerCandidate(candidateName)
        .accounts({
          poll: pollPDA,
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
  const { program, programId } = useVotingDappProgram();
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
      const pollAccount = (await program.account.poll.fetch(poll)) as {
        poll_id: anchor.BN;
      };

      // Find poll PDA using poll_id
      const pollIdBuffer = pollAccount.poll_id.toArrayLike(Buffer, "le", 8);
      const [pollPDA] = PublicKey.findProgramAddressSync(
        [POLL_SEED, pollIdBuffer],
        program.programId
      );

      // Find voter PDA
      const [voterPDA] = PublicKey.findProgramAddressSync(
        [VOTER_SEED, poll.toBuffer(), publicKey.toBuffer()],
        program.programId
      );

      // Find candidate PDA - using correct format for candidate_seed (candidateId as u32)
      const candidateSeed = new anchor.BN(candidateId).toArrayLike(
        Buffer,
        "le",
        4
      );
      const [candidatePDA] = PublicKey.findProgramAddressSync(
        [CANDIDATE_SEED, poll.toBuffer(), candidateSeed],
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
        // Use snake_case property names to match IDL
        const pollAccount = account.account as {
          poll_id: anchor.BN;
          poll_start: anchor.BN;
          poll_end: anchor.BN;
          candidate_amount: anchor.BN;
          votes_cast: anchor.BN;
          description: string;
        };

        return {
          address: account.publicKey.toString(),
          pollId: pollAccount.poll_id.toNumber(),
          description: pollAccount.description,
          pollStart: pollAccount.poll_start.toNumber(),
          pollEnd: pollAccount.poll_end.toNumber(),
          candidateAmount: pollAccount.candidate_amount.toNumber(),
          votesCast: pollAccount.votes_cast.toNumber(),
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

      return candidateAccounts.map((account) => {
        // Use snake_case property names to match IDL
        const candidateAccount = account.account as {
          poll: PublicKey;
          candidate_name: string;
          vote_count: anchor.BN;
        };

        return {
          address: account.publicKey.toString(),
          poll: candidateAccount.poll.toString(),
          candidateName: candidateAccount.candidate_name,
          voteCount: candidateAccount.vote_count.toNumber(),
        };
      });
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
        // Use snake_case property names to match IDL
        const voterAccount = await program.account.voter.fetch(voterPDA);
        return (voterAccount as { has_voted: boolean }).has_voted;
      } catch (error) {
        // Account doesn't exist, user hasn't voted
        return false;
      }
    },
    enabled: !!program && !!pollAddress && !!publicKey,
  });
}
