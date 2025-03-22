import * as anchor from "@coral-xyz/anchor";
import { Program, Idl } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { expect } from "chai";
import { VotingDapp } from "../target/types/Voting_Dapp";

// We need to import the IDL directly
const IDL = require("../target/idl/voting_dapp.json");

// Define account types to match your program
interface PollAccount {
  pollId: anchor.BN;
  description: string;
  pollStart: anchor.BN;
  pollEnd: anchor.BN;
  candidateAmount: number;
  votesCast: number;
}

interface CandidateAccount {
  poll: PublicKey;
  candidateName: string;
  voteCount: number;
}

interface VoterAccount {
  poll: PublicKey;
  voter: PublicKey;
  selectedOption: number;
  hasVoted: boolean;
}

// Define program accounts interface
interface VotingAccounts {
  poll: PollAccount;
  candidate: CandidateAccount;
  voter: VoterAccount;
}

const votingAddress = new PublicKey(
  "coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF"
);

describe("voting_dapp", () => {
  // Type the program correctly
  let provider: BankrunProvider;
  let votingProgram: Program<VotingDapp>;

  let pollId = new anchor.BN(1);
  let pollAddress: PublicKey;
  let candidateAddress: PublicKey;
  let voterAddress: PublicKey;

  before(async () => {
    const context = await startAnchor(
      "https://api.devnet.solana.com", // Devnet cluster URL
      [{ name: "voting_dapp", programId: votingAddress }],
      []
    );

    provider = new BankrunProvider(context);
    // Cast the program to have the right account types
    votingProgram = new Program(VotingDapp, votingAddress, provider);

    // Find Poll PDA - for initialize_poll, seeds are just the poll_id
    [pollAddress] = PublicKey.findProgramAddressSync(
      [pollId.toArrayLike(Buffer, "le", 8)],
      votingAddress
    );
  });

  it("Initialize Poll", async () => {
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 86400; // 24 hours later

    await votingProgram.methods
      .initializePoll(
        pollId, // Poll ID
        "What is your favorite programming language?", // Poll question
        new anchor.BN(startTime), // Poll start time
        new anchor.BN(endTime) // Poll end time
      )
      .accounts({
        poll: pollAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // Now with proper typing
    const poll = await votingProgram.account.poll.fetch(pollAddress);

    expect(poll.pollId.toString()).to.equal(pollId.toString());
    expect(poll.description).to.equal(
      "What is your favorite programming language?"
    );
    expect(poll.pollStart.toString()).to.equal(
      new anchor.BN(startTime).toString()
    );
    expect(poll.pollEnd.toString()).to.equal(new anchor.BN(endTime).toString());
    expect(poll.candidateAmount).to.equal(0);
    expect(poll.votesCast).to.equal(0);

    console.log("Poll initialized:", poll);
  });

  it("Register Candidate", async () => {
    // Find Candidate PDA - for register_candidate, seeds are ["candidate", poll, poll.candidate_amount]
    [candidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8), // candidateAmount is 0 at this point
      ],
      votingAddress
    );

    await votingProgram.methods
      .registerCandidate("JavaScript")
      .accounts({
        poll: pollAddress,
        candidate: candidateAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const candidate = await votingProgram.account.candidate.fetch(
      candidateAddress
    );
    const updatedPoll = await votingProgram.account.poll.fetch(pollAddress);

    expect(candidate.candidateName).to.equal("JavaScript");
    expect(candidate.voteCount).to.equal(0);
    expect(candidate.poll.toString()).to.equal(pollAddress.toString());
    expect(updatedPoll.candidateAmount).to.equal(1);

    console.log("Candidate registered:", candidate);
  });

  it("Cast Vote", async () => {
    // Find Voter PDA - for cast_vote, seeds are ["voter", poll, user]
    [voterAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        pollAddress.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      votingAddress
    );

    await votingProgram.methods
      .castVote(0) // Voting for candidate ID 0 (JavaScript)
      .accounts({
        poll: pollAddress,
        candidate: candidateAddress,
        voter: voterAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const voter = await votingProgram.account.voter.fetch(voterAddress);
    const candidate = await votingProgram.account.candidate.fetch(
      candidateAddress
    );
    const updatedPoll = await votingProgram.account.poll.fetch(pollAddress);

    expect(voter.hasVoted).to.be.true;
    expect(voter.selectedOption).to.equal(0);
    expect(voter.poll.toString()).to.equal(pollAddress.toString());
    expect(voter.voter.toString()).to.equal(
      provider.wallet.publicKey.toString()
    );
    expect(candidate.voteCount).to.equal(1);
    expect(updatedPoll.votesCast).to.equal(1);

    console.log("Vote cast successfully");
  });

  it("Should prevent double voting", async () => {
    try {
      await votingProgram.methods
        .castVote(0)
        .accounts({
          poll: pollAddress,
          candidate: candidateAddress,
          voter: voterAddress,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Should not reach here
      expect.fail("Expected an error when voting twice");
    } catch (error) {
      expect(error.toString()).to.include("AlreadyVoted");
      console.log("Double voting prevented successfully");
    }
  });

  it("Register another candidate", async () => {
    // Find Candidate PDA for second candidate - note candidateAmount is now 1
    const [secondCandidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8), // candidateAmount is now 1
      ],
      votingAddress
    );

    await votingProgram.methods
      .registerCandidate("Rust")
      .accounts({
        poll: pollAddress,
        candidate: secondCandidateAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const secondCandidate = await votingProgram.account.candidate.fetch(
      secondCandidateAddress
    );
    const updatedPoll = await votingProgram.account.poll.fetch(pollAddress);

    expect(secondCandidate.candidateName).to.equal("Rust");
    expect(secondCandidate.voteCount).to.equal(0);
    expect(updatedPoll.candidateAmount).to.equal(2);

    console.log("Second candidate registered:", secondCandidate);
  });

  it("Vote from a different user", async () => {
    // Create a new user
    const newUser = Keypair.generate();

    // Fund the new user
    await provider.connection.requestAirdrop(newUser.publicKey, 1000000000);

    // Find Voter PDA for the new user
    const [newVoterAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        pollAddress.toBuffer(),
        newUser.publicKey.toBuffer(),
      ],
      votingAddress
    );

    // Find the second candidate address again
    const [secondCandidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      votingAddress
    );

    // Create provider and program for the new user
    const newUserProvider = new BankrunProvider(
      provider.context, // Use the correct context object
      { wallet: { publicKey: newUser.publicKey, payer: newUser } }
    );

    const newUserProgram = new Program<Idl>(
      IDL,
      votingAddress,
      newUserProvider
    );

    await newUserProgram.methods
      .castVote(1) // Voting for candidate ID 1 (Rust)
      .accounts({
        poll: pollAddress,
        candidate: secondCandidateAddress,
        voter: newVoterAddress,
        user: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    const secondCandidate = await votingProgram.account.candidate.fetch(
      secondCandidateAddress
    );
    const newVoter = await votingProgram.account.voter.fetch(newVoterAddress);
    const updatedPoll = await votingProgram.account.poll.fetch(pollAddress);

    expect(newVoter.hasVoted).to.be.true;
    expect(newVoter.selectedOption).to.equal(1);
    expect(secondCandidate.voteCount).to.equal(1);
    expect(updatedPoll.votesCast).to.equal(2);

    console.log("Second user voted successfully");
  });
});
function before(setupFunction: () => Promise<void>) {
  // Execute the setup function before running tests
  setupFunction().catch((error) => {
    console.error("Error during setup:", error);
    throw error;
  });
}
