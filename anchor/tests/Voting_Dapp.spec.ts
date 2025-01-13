import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { VotingDapp } from "../target/types/Voting_Dapp";
import { BankrunProvider, startAnchor } from "anchor-bankrun";

const IDL = require(`../target/idl/voting_dapp.json`);

const votingAddress = new PublicKey(
  "coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF"
);

describe("voting_dapp", () => {
  it("Initialize Poll", async () => {
    const context = await startAnchor(
      "", // Add your Bankrun configuration or cluster URL
      [{ name: "voting_dapp", programId: votingAddress }],
      []
    );

    const provider = new BankrunProvider(context);
    const votingProgram = new Program<VotingDapp>(IDL, provider);

    await votingProgram.methods
      .initializePoll(
        new anchor.BN(1), // Poll ID
        "What is your favorite sex position?", // Poll question
        new anchor.BN(Math.floor(Date.now() / 1000)), // Poll start time
        new anchor.BN(Math.floor(Date.now() / 1000) + 86400) // Poll end time (24 hours later)
      )
      .rpc();

    const [pollAddress] = PublicKey.findProgramAddressSync(
      [new anchor.BN(1).toArrayLike(Buffer, "le", 8)],
      votingAddress
    );

    const poll = await votingProgram.account.poll.fetch(pollAddress);

    console.log(poll);
  });
});
