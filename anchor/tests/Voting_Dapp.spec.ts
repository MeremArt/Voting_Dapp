import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { expect } from "chai";
import { VotingDapp } from "../target/types/Voting_Dapp";
// Direct import for the IDL
const IDL = require("../target/idl/voting_dapp.json");
const idl_object = JSON.parse(IDL);
const PROGRAM_ID = new PublicKey(IDL.address);
describe("voting_dapp", () => {
  // Use 'any' type to avoid TypeScript errors
  let provider: any;
  let program: any;
  let pollId = new anchor.BN(1);
  let pollAddress: PublicKey;
  let candidateAddress: PublicKey;
  let voterAddress: PublicKey;

  before(async () => {
    // Initialize the anchor context
    const context = await startAnchor(
      "https://api.devnet.solana.com",
      [{ name: "voting_dapp", programId: PROGRAM_ID }],
      []
    );

    // Create the provider
    provider = new BankrunProvider(context);

    // Create the program object with any type
    // program = new anchor.Program(IDL, PROGRAM_ID, provider);
    program = new Program<VotingDapp>(idl_object, provider);

    // Find the Poll PDA using poll_id as the seed (from InitializePoll)
    [pollAddress] = PublicKey.findProgramAddressSync(
      [pollId.toArrayLike(Buffer, "le", 8)],
      PROGRAM_ID
    );
  });

  it("Initialize Poll", async () => {
    const startTime = Math.floor(Date.now() / 1000);
    const endTime = startTime + 86400; // 24 hours later

    await program.methods
      .initializePoll(
        pollId,
        "What is your favorite programming language?",
        new anchor.BN(startTime),
        new anchor.BN(endTime)
      )
      .accounts({
        poll: pollAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const poll = await program.account.poll.fetch(pollAddress);
    console.log("Poll initialized:", poll);

    expect(poll.pollId.toString()).to.equal(pollId.toString());
    expect(poll.description).to.equal(
      "What is your favorite programming language?"
    );
    expect(poll.candidateAmount).to.equal(0);
  });

  it("Register Candidate", async () => {
    // Now the poll is initialized, we can derive candidate PDA using:
    // [b"candidate", poll.key().as_ref(), &poll.candidate_amount.to_le_bytes()]
    [candidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(0).toArrayLike(Buffer, "le", 8), // candidate_amount is 0 at this point
      ],
      PROGRAM_ID
    );

    await program.methods
      .registerCandidate("JavaScript")
      .accounts({
        poll: pollAddress,
        candidate: candidateAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const candidate = await program.account.candidate.fetch(candidateAddress);
    const updatedPoll = await program.account.poll.fetch(pollAddress);

    expect(candidate.candidateName).to.equal("JavaScript");
    expect(candidate.voteCount).to.equal(0);
    expect(updatedPoll.candidateAmount).to.equal(1);

    console.log("Candidate registered:", candidate);
  });

  it("Cast Vote", async () => {
    // For voter PDA: [b"voter", poll.key().as_ref(), user.key().as_ref()]
    [voterAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        pollAddress.toBuffer(),
        provider.wallet.publicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    // For casting a vote, we need to pass the candidate_seed
    // This is the bytes of the candidate index (0)
    const candidateSeed = new anchor.BN(0).toArrayLike(Buffer, "le", 8);

    await program.methods
      .castVote(candidateSeed)
      .accounts({
        poll: pollAddress,
        candidate: candidateAddress,
        voter: voterAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const voter = await program.account.voter.fetch(voterAddress);
    const candidate = await program.account.candidate.fetch(candidateAddress);
    const updatedPoll = await program.account.poll.fetch(pollAddress);

    expect(voter.hasVoted).to.be.true;
    expect(voter.selectedOption).to.equal(0);
    expect(candidate.voteCount).to.equal(1);
    expect(updatedPoll.votesCast).to.equal(1);

    console.log("Vote cast successfully");
  });

  it("Register another candidate", async () => {
    // For second candidate: [b"candidate", poll.key().as_ref(), &poll.candidate_amount.to_le_bytes()]
    // Now candidate_amount is 1
    const [secondCandidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    );

    await program.methods
      .registerCandidate("Rust")
      .accounts({
        poll: pollAddress,
        candidate: secondCandidateAddress,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const secondCandidate = await program.account.candidate.fetch(
      secondCandidateAddress
    );
    const updatedPoll = await program.account.poll.fetch(pollAddress);

    expect(secondCandidate.candidateName).to.equal("Rust");
    expect(secondCandidate.voteCount).to.equal(0);
    expect(updatedPoll.candidateAmount).to.equal(2);

    console.log("Second candidate registered:", secondCandidate);
  });

  it("Vote from a different user for another candidate", async () => {
    // Create a new user
    const newUser = Keypair.generate();
    await provider.connection.requestAirdrop(newUser.publicKey, 1000000000);

    // Find voter PDA for new user
    const [newVoterAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("voter"),
        pollAddress.toBuffer(),
        newUser.publicKey.toBuffer(),
      ],
      PROGRAM_ID
    );

    // Second candidate PDA
    const [secondCandidateAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("candidate"),
        pollAddress.toBuffer(),
        new anchor.BN(1).toArrayLike(Buffer, "le", 8),
      ],
      PROGRAM_ID
    );

    // Candidate seed for the second candidate (index 1)
    const candidateSeed = new anchor.BN(1).toArrayLike(Buffer, "le", 8);

    // Create provider and program for the new user
    const newUserWallet = new anchor.Wallet(newUser);
    const newUserProvider: any = new BankrunProvider(
      provider.context,
      newUserWallet
    );
    const newUserProgram: any = new anchor.Program(
      IDL,
      provider,
      newUserProvider
    );

    await newUserProgram.methods
      .castVote(candidateSeed)
      .accounts({
        poll: pollAddress,
        candidate: secondCandidateAddress,
        voter: newVoterAddress,
        user: newUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([newUser])
      .rpc();

    const secondCandidate = await program.account.candidate.fetch(
      secondCandidateAddress
    );
    const newVoter = await program.account.voter.fetch(newVoterAddress);
    const updatedPoll = await program.account.poll.fetch(pollAddress);

    expect(newVoter.hasVoted).to.be.true;
    expect(newVoter.selectedOption).to.equal(1);
    expect(secondCandidate.voteCount).to.equal(1);
    expect(updatedPoll.votesCast).to.equal(2);

    console.log("Second user voted successfully");
  });
});
function before(hook: () => Promise<void>) {
  // Execute the provided hook function before running tests
  beforeEach(async () => {
    await hook();
  });
}
